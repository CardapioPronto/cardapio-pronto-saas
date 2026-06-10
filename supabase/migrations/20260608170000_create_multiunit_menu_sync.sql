-- Bloco 15: sincronizacao controlada do cardapio matriz para filiais.
-- Nao remove itens locais e nao copia saldo de estoque entre unidades.

DROP FUNCTION IF EXISTS public.sync_restaurant_group_menu(uuid, uuid[], boolean);

CREATE OR REPLACE FUNCTION public.sync_restaurant_group_menu(
  p_group_id uuid,
  p_target_restaurant_ids uuid[] DEFAULT NULL,
  p_overwrite_existing boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_group public.restaurant_groups%ROWTYPE;
  v_creator_id uuid := auth.uid();
  v_master_id uuid;
  v_target_id uuid;
  v_existing_category_id uuid;
  v_target_category_id uuid;
  v_existing_product_id uuid;
  v_target_product_id uuid;
  v_source_category record;
  v_source_product record;
  v_cost_price numeric;
  v_units_synced integer := 0;
  v_categories_created integer := 0;
  v_categories_updated integer := 0;
  v_products_created integer := 0;
  v_products_updated integer := 0;
  v_costs_synced integer := 0;
BEGIN
  IF v_creator_id IS NULL THEN
    RAISE EXCEPTION 'Usuario nao autenticado';
  END IF;

  SELECT rg.*
  INTO v_group
  FROM public.restaurant_groups rg
  WHERE rg.id = p_group_id;

  IF v_group.id IS NULL THEN
    RAISE EXCEPTION 'Rede nao encontrada';
  END IF;

  v_master_id := v_group.master_restaurant_id;

  IF v_master_id IS NULL THEN
    RAISE EXCEPTION 'Configure uma unidade matriz antes de sincronizar o cardapio';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.restaurant_group_units rgu
    WHERE rgu.group_id = p_group_id
      AND rgu.restaurant_id = v_master_id
      AND rgu.is_active = true
  ) THEN
    RAISE EXCEPTION 'A unidade matriz precisa estar ativa nesta rede';
  END IF;

  IF NOT (
    public.is_super_admin(v_creator_id)
    OR v_group.owner_id = v_creator_id
    OR EXISTS (
      SELECT 1
      FROM public.restaurant_group_units rgu
      WHERE rgu.group_id = p_group_id
        AND rgu.is_active = true
        AND (
          public.user_has_restaurant_permission(
            rgu.restaurant_id,
            'settings_manage'::public.permission_type
          )
          OR public.user_has_restaurant_permission(
            rgu.restaurant_id,
            'products_manage'::public.permission_type
          )
        )
    )
  ) THEN
    RAISE EXCEPTION 'Sem permissao para sincronizar cardapio da rede';
  END IF;

  IF p_target_restaurant_ids IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM unnest(p_target_restaurant_ids) AS requested(restaurant_id)
      WHERE requested.restaurant_id = v_master_id
    ) THEN
      RAISE EXCEPTION 'A matriz nao pode ser selecionada como destino';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM unnest(p_target_restaurant_ids) AS requested(restaurant_id)
      WHERE NOT EXISTS (
        SELECT 1
        FROM public.restaurant_group_units rgu
        WHERE rgu.group_id = p_group_id
          AND rgu.restaurant_id = requested.restaurant_id
          AND rgu.is_active = true
      )
    ) THEN
      RAISE EXCEPTION 'Todas as unidades de destino precisam pertencer a rede';
    END IF;
  END IF;

  CREATE TEMP TABLE IF NOT EXISTS multiunit_category_sync_map (
    source_category_id uuid PRIMARY KEY,
    target_category_id uuid NOT NULL
  ) ON COMMIT DROP;

  FOR v_target_id IN
    SELECT DISTINCT targets.restaurant_id
    FROM (
      SELECT rgu.restaurant_id
      FROM public.restaurant_group_units rgu
      WHERE p_target_restaurant_ids IS NULL
        AND rgu.group_id = p_group_id
        AND rgu.restaurant_id <> v_master_id
        AND rgu.is_active = true

      UNION ALL

      SELECT requested.restaurant_id
      FROM unnest(coalesce(p_target_restaurant_ids, ARRAY[]::uuid[])) AS requested(restaurant_id)
      WHERE p_target_restaurant_ids IS NOT NULL
    ) targets
    WHERE targets.restaurant_id <> v_master_id
  LOOP
    TRUNCATE TABLE multiunit_category_sync_map;

    FOR v_source_category IN
      SELECT c.id, c.name, c.order_position
      FROM public.categories c
      WHERE c.restaurant_id = v_master_id
      ORDER BY coalesce(c.order_position, 0), c.name
    LOOP
      SELECT c.id
      INTO v_existing_category_id
      FROM public.categories c
      WHERE c.restaurant_id = v_target_id
        AND lower(btrim(c.name)) = lower(btrim(v_source_category.name))
      ORDER BY c.created_at NULLS LAST
      LIMIT 1;

      IF v_existing_category_id IS NULL THEN
        INSERT INTO public.categories (
          restaurant_id,
          name,
          order_position
        )
        VALUES (
          v_target_id,
          v_source_category.name,
          v_source_category.order_position
        )
        RETURNING id INTO v_target_category_id;

        v_categories_created := v_categories_created + 1;
      ELSE
        v_target_category_id := v_existing_category_id;

        IF coalesce(p_overwrite_existing, true) THEN
          UPDATE public.categories
          SET name = v_source_category.name,
              order_position = v_source_category.order_position,
              updated_at = now()
          WHERE id = v_existing_category_id;

          v_categories_updated := v_categories_updated + 1;
        END IF;
      END IF;

      INSERT INTO multiunit_category_sync_map (source_category_id, target_category_id)
      VALUES (v_source_category.id, v_target_category_id)
      ON CONFLICT (source_category_id) DO UPDATE
      SET target_category_id = EXCLUDED.target_category_id;
    END LOOP;

    FOR v_source_product IN
      SELECT
        p.id,
        p.name,
        p.description,
        p.price,
        p.available,
        p.image_url,
        p.image_storage_path,
        p.image_uploaded_by,
        p.image_uploaded_at,
        p.category_id,
        p.order_position,
        p.stock_tracking_enabled,
        p.stock_min_quantity,
        p.stock_is_fractional
      FROM public.products p
      WHERE p.restaurant_id = v_master_id
      ORDER BY coalesce(p.order_position, 0), p.name
    LOOP
      SELECT map.target_category_id
      INTO v_target_category_id
      FROM multiunit_category_sync_map map
      WHERE map.source_category_id = v_source_product.category_id;

      SELECT p.id
      INTO v_existing_product_id
      FROM public.products p
      WHERE p.restaurant_id = v_target_id
        AND lower(btrim(p.name)) = lower(btrim(v_source_product.name))
        AND p.category_id IS NOT DISTINCT FROM v_target_category_id
      ORDER BY p.created_at NULLS LAST
      LIMIT 1;

      IF v_existing_product_id IS NULL THEN
        INSERT INTO public.products (
          restaurant_id,
          category_id,
          name,
          description,
          price,
          available,
          image_url,
          image_storage_path,
          image_uploaded_by,
          image_uploaded_at,
          order_position,
          stock_tracking_enabled,
          stock_quantity,
          stock_min_quantity,
          stock_is_fractional,
          created_by,
          updated_by
        )
        VALUES (
          v_target_id,
          v_target_category_id,
          v_source_product.name,
          v_source_product.description,
          v_source_product.price,
          v_source_product.available,
          v_source_product.image_url,
          v_source_product.image_storage_path,
          v_source_product.image_uploaded_by,
          v_source_product.image_uploaded_at,
          v_source_product.order_position,
          coalesce(v_source_product.stock_tracking_enabled, false),
          0,
          v_source_product.stock_min_quantity,
          coalesce(v_source_product.stock_is_fractional, false),
          v_creator_id,
          v_creator_id
        )
        RETURNING id INTO v_target_product_id;

        v_products_created := v_products_created + 1;
      ELSE
        v_target_product_id := v_existing_product_id;

        IF coalesce(p_overwrite_existing, true) THEN
          UPDATE public.products
          SET category_id = v_target_category_id,
              name = v_source_product.name,
              description = v_source_product.description,
              price = v_source_product.price,
              available = v_source_product.available,
              image_url = v_source_product.image_url,
              image_storage_path = v_source_product.image_storage_path,
              image_uploaded_by = v_source_product.image_uploaded_by,
              image_uploaded_at = v_source_product.image_uploaded_at,
              order_position = v_source_product.order_position,
              stock_tracking_enabled = coalesce(v_source_product.stock_tracking_enabled, false),
              stock_min_quantity = v_source_product.stock_min_quantity,
              stock_is_fractional = coalesce(v_source_product.stock_is_fractional, false),
              updated_by = v_creator_id,
              updated_at = now()
          WHERE id = v_existing_product_id;

          v_products_updated := v_products_updated + 1;
        END IF;
      END IF;

      SELECT pfs.cost_price
      INTO v_cost_price
      FROM public.product_financial_settings pfs
      WHERE pfs.restaurant_id = v_master_id
        AND pfs.product_id = v_source_product.id;

      IF v_cost_price IS NOT NULL AND (coalesce(p_overwrite_existing, true) OR v_existing_product_id IS NULL) THEN
        INSERT INTO public.product_financial_settings (
          restaurant_id,
          product_id,
          cost_price
        )
        VALUES (
          v_target_id,
          v_target_product_id,
          v_cost_price
        )
        ON CONFLICT (product_id) DO UPDATE
        SET cost_price = EXCLUDED.cost_price,
            updated_at = now();

        v_costs_synced := v_costs_synced + 1;
      END IF;
    END LOOP;

    v_units_synced := v_units_synced + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'group_id', p_group_id,
    'master_restaurant_id', v_master_id,
    'units_synced', v_units_synced,
    'categories_created', v_categories_created,
    'categories_updated', v_categories_updated,
    'products_created', v_products_created,
    'products_updated', v_products_updated,
    'costs_synced', v_costs_synced,
    'overwrite_existing', coalesce(p_overwrite_existing, true)
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.sync_restaurant_group_menu(uuid, uuid[], boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_restaurant_group_menu(uuid, uuid[], boolean) TO authenticated, service_role;

COMMENT ON FUNCTION public.sync_restaurant_group_menu(uuid, uuid[], boolean) IS
  'Sincroniza categorias e produtos da unidade matriz para filiais da rede, preservando estoque, historico e itens locais.';
