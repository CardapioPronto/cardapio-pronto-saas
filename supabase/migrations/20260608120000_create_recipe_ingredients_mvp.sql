-- Bloco 14: ficha tecnica, insumos e custo real estimado.

CREATE TABLE IF NOT EXISTS public.inventory_ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name text NOT NULL,
  unit text NOT NULL DEFAULT 'un',
  current_quantity numeric NOT NULL DEFAULT 0,
  min_quantity numeric,
  unit_cost numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT inventory_ingredients_unit_check CHECK (
    unit IN ('g', 'kg', 'ml', 'l', 'un', 'porcao')
  ),
  CONSTRAINT inventory_ingredients_unit_cost_check CHECK (unit_cost >= 0),
  CONSTRAINT inventory_ingredients_min_quantity_check CHECK (min_quantity IS NULL OR min_quantity >= 0),
  CONSTRAINT inventory_ingredients_name_unique UNIQUE (restaurant_id, name)
);

CREATE INDEX IF NOT EXISTS idx_inventory_ingredients_restaurant_active
  ON public.inventory_ingredients (restaurant_id, is_active, name);

CREATE INDEX IF NOT EXISTS idx_inventory_ingredients_low_stock
  ON public.inventory_ingredients (restaurant_id)
  WHERE is_active = true
    AND min_quantity IS NOT NULL
    AND current_quantity <= min_quantity;

DROP TRIGGER IF EXISTS update_inventory_ingredients_updated_at ON public.inventory_ingredients;
CREATE TRIGGER update_inventory_ingredients_updated_at
  BEFORE UPDATE ON public.inventory_ingredients
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.product_recipe_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  ingredient_id uuid NOT NULL REFERENCES public.inventory_ingredients(id) ON DELETE RESTRICT,
  quantity numeric NOT NULL,
  loss_percent numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_recipe_items_quantity_check CHECK (quantity > 0),
  CONSTRAINT product_recipe_items_loss_check CHECK (loss_percent >= 0 AND loss_percent <= 100),
  CONSTRAINT product_recipe_items_unique UNIQUE (product_id, ingredient_id)
);

CREATE INDEX IF NOT EXISTS idx_product_recipe_items_restaurant_product
  ON public.product_recipe_items (restaurant_id, product_id);

CREATE INDEX IF NOT EXISTS idx_product_recipe_items_ingredient
  ON public.product_recipe_items (ingredient_id);

DROP TRIGGER IF EXISTS update_product_recipe_items_updated_at ON public.product_recipe_items;
CREATE TRIGGER update_product_recipe_items_updated_at
  BEFORE UPDATE ON public.product_recipe_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.ingredient_stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  ingredient_id uuid NOT NULL REFERENCES public.inventory_ingredients(id),
  quantity_delta numeric NOT NULL,
  movement_type text NOT NULL,
  reason text,
  notes text,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  order_item_id uuid REFERENCES public.order_items(id) ON DELETE SET NULL,
  recipe_item_id uuid REFERENCES public.product_recipe_items(id) ON DELETE SET NULL,
  idempotency_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT ingredient_stock_movements_delta_check CHECK (quantity_delta <> 0),
  CONSTRAINT ingredient_stock_movements_type_check CHECK (
    movement_type IN (
      'sale',
      'sale_revert',
      'adjustment_in',
      'adjustment_out',
      'inventory_count',
      'manual_negative_override'
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_ingredient_stock_movements_restaurant_ingredient_created
  ON public.ingredient_stock_movements (restaurant_id, ingredient_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ingredient_stock_movements_order
  ON public.ingredient_stock_movements (order_id)
  WHERE order_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_ingredient_stock_movements_idempotency_key
  ON public.ingredient_stock_movements (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

ALTER TABLE public.inventory_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_recipe_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingredient_stock_movements ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.inventory_ingredients FORCE ROW LEVEL SECURITY;
ALTER TABLE public.product_recipe_items FORCE ROW LEVEL SECURITY;
ALTER TABLE public.ingredient_stock_movements FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Restaurant staff can view own ingredients" ON public.inventory_ingredients;
CREATE POLICY "Restaurant staff can view own ingredients"
ON public.inventory_ingredients FOR SELECT
TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR restaurant_id = public.get_user_restaurant_id()
);

DROP POLICY IF EXISTS "Restaurant product managers can manage own ingredients" ON public.inventory_ingredients;
CREATE POLICY "Restaurant product managers can manage own ingredients"
ON public.inventory_ingredients FOR ALL
TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR public.user_has_restaurant_permission(restaurant_id, 'products_manage'::public.permission_type)
)
WITH CHECK (
  public.is_super_admin(auth.uid())
  OR public.user_has_restaurant_permission(restaurant_id, 'products_manage'::public.permission_type)
);

DROP POLICY IF EXISTS "Restaurant staff can view own product recipes" ON public.product_recipe_items;
CREATE POLICY "Restaurant staff can view own product recipes"
ON public.product_recipe_items FOR SELECT
TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR restaurant_id = public.get_user_restaurant_id()
);

DROP POLICY IF EXISTS "Restaurant product managers can manage own product recipes" ON public.product_recipe_items;
CREATE POLICY "Restaurant product managers can manage own product recipes"
ON public.product_recipe_items FOR ALL
TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR public.user_has_restaurant_permission(restaurant_id, 'products_manage'::public.permission_type)
)
WITH CHECK (
  public.is_super_admin(auth.uid())
  OR public.user_has_restaurant_permission(restaurant_id, 'products_manage'::public.permission_type)
);

DROP POLICY IF EXISTS "Restaurant staff can view own ingredient movements" ON public.ingredient_stock_movements;
CREATE POLICY "Restaurant staff can view own ingredient movements"
ON public.ingredient_stock_movements FOR SELECT
TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR restaurant_id = public.get_user_restaurant_id()
);

DROP POLICY IF EXISTS "Super admins can manage ingredient movements" ON public.ingredient_stock_movements;
CREATE POLICY "Super admins can manage ingredient movements"
ON public.ingredient_stock_movements FOR ALL
TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.apply_ingredient_movement(p_args jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_restaurant_id uuid := NULLIF(p_args->>'restaurant_id', '')::uuid;
  v_ingredient_id uuid := NULLIF(p_args->>'ingredient_id', '')::uuid;
  v_recipe_item_id uuid := NULLIF(p_args->>'recipe_item_id', '')::uuid;
  v_quantity_delta numeric := NULLIF(p_args->>'quantity_delta', '')::numeric;
  v_movement_type text := NULLIF(p_args->>'movement_type', '');
  v_reason text := NULLIF(btrim(COALESCE(p_args->>'reason', '')), '');
  v_notes text := NULLIF(btrim(COALESCE(p_args->>'notes', '')), '');
  v_order_id uuid := NULLIF(p_args->>'order_id', '')::uuid;
  v_order_item_id uuid := NULLIF(p_args->>'order_item_id', '')::uuid;
  v_idempotency_key text := NULLIF(p_args->>'idempotency_key', '');
  v_allow_negative boolean := COALESCE((p_args->>'allow_negative')::boolean, false);
  v_actor_id uuid := COALESCE(NULLIF(p_args->>'actor_id', '')::uuid, auth.uid());
  v_ingredient public.inventory_ingredients%ROWTYPE;
  v_new_quantity numeric;
  v_movement_id uuid;
  v_existing public.ingredient_stock_movements%ROWTYPE;
BEGIN
  IF v_restaurant_id IS NULL OR v_ingredient_id IS NULL THEN
    RAISE EXCEPTION 'Ingrediente/restaurante não informado.';
  END IF;

  IF v_movement_type IS NULL OR v_quantity_delta IS NULL OR v_quantity_delta = 0 THEN
    RAISE EXCEPTION 'Movimentação de insumo inválida.';
  END IF;

  IF v_idempotency_key IS NOT NULL THEN
    SELECT * INTO v_existing
    FROM public.ingredient_stock_movements
    WHERE idempotency_key = v_idempotency_key
    LIMIT 1;

    IF FOUND THEN
      RETURN jsonb_build_object(
        'movement_id', v_existing.id,
        'ingredient_id', v_existing.ingredient_id,
        'quantity_delta', v_existing.quantity_delta,
        'idempotent_replay', true
      );
    END IF;
  END IF;

  SELECT * INTO v_ingredient
  FROM public.inventory_ingredients
  WHERE id = v_ingredient_id
    AND restaurant_id = v_restaurant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insumo inexistente ou fora do restaurante.';
  END IF;

  v_new_quantity := v_ingredient.current_quantity + v_quantity_delta;
  IF v_new_quantity < 0 AND NOT v_allow_negative THEN
    RAISE EXCEPTION 'Estoque insuficiente para o insumo "%": disponível %, solicitado %.',
      v_ingredient.name, v_ingredient.current_quantity, ABS(v_quantity_delta)
      USING ERRCODE = 'check_violation';
  END IF;

  UPDATE public.inventory_ingredients
  SET current_quantity = v_new_quantity,
      updated_at = now()
  WHERE id = v_ingredient.id;

  BEGIN
    INSERT INTO public.ingredient_stock_movements (
      restaurant_id,
      ingredient_id,
      quantity_delta,
      movement_type,
      reason,
      notes,
      order_id,
      order_item_id,
      recipe_item_id,
      idempotency_key,
      created_by
    )
    VALUES (
      v_restaurant_id,
      v_ingredient_id,
      v_quantity_delta,
      v_movement_type,
      v_reason,
      v_notes,
      v_order_id,
      v_order_item_id,
      v_recipe_item_id,
      v_idempotency_key,
      v_actor_id
    )
    RETURNING id INTO v_movement_id;
  EXCEPTION
    WHEN unique_violation THEN
      UPDATE public.inventory_ingredients
      SET current_quantity = v_ingredient.current_quantity
      WHERE id = v_ingredient.id;

      SELECT * INTO v_existing
      FROM public.ingredient_stock_movements
      WHERE idempotency_key = v_idempotency_key
      LIMIT 1;

      RETURN jsonb_build_object(
        'movement_id', v_existing.id,
        'ingredient_id', v_existing.ingredient_id,
        'quantity_delta', v_existing.quantity_delta,
        'idempotent_replay', true
      );
  END;

  RETURN jsonb_build_object(
    'movement_id', v_movement_id,
    'ingredient_id', v_ingredient.id,
    'quantity_delta', v_quantity_delta,
    'new_quantity', v_new_quantity
  );
END;
$$;

REVOKE ALL ON FUNCTION public.apply_ingredient_movement(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_ingredient_movement(jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.adjust_ingredient_stock(p_args jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_restaurant_id uuid := NULLIF(p_args->>'restaurant_id', '')::uuid;
  v_ingredient_id uuid := NULLIF(p_args->>'ingredient_id', '')::uuid;
  v_quantity_delta numeric := NULLIF(p_args->>'quantity_delta', '')::numeric;
  v_movement_type text := COALESCE(NULLIF(p_args->>'movement_type', ''), 'adjustment_in');
  v_reason text := NULLIF(btrim(COALESCE(p_args->>'reason', '')), '');
BEGIN
  IF v_restaurant_id IS NULL OR v_ingredient_id IS NULL THEN
    RAISE EXCEPTION 'Insumo/restaurante não informado.';
  END IF;

  IF NOT public.user_has_restaurant_permission(v_restaurant_id, 'products_manage'::public.permission_type) THEN
    RAISE EXCEPTION 'Sem permissão para ajustar insumos.';
  END IF;

  IF v_quantity_delta IS NULL OR v_quantity_delta = 0 THEN
    RAISE EXCEPTION 'Informe uma quantidade diferente de zero.';
  END IF;

  IF v_movement_type NOT IN ('adjustment_in', 'adjustment_out', 'inventory_count') THEN
    RAISE EXCEPTION 'Tipo de ajuste inválido.';
  END IF;

  IF v_reason IS NULL THEN
    RAISE EXCEPTION 'Informe o motivo do ajuste.';
  END IF;

  RETURN public.apply_ingredient_movement(jsonb_build_object(
    'restaurant_id', v_restaurant_id,
    'ingredient_id', v_ingredient_id,
    'quantity_delta', v_quantity_delta,
    'movement_type', v_movement_type,
    'reason', v_reason,
    'notes', NULLIF(btrim(COALESCE(p_args->>'notes', '')), ''),
    'allow_negative', false,
    'actor_id', auth.uid()
  ));
END;
$$;

REVOKE ALL ON FUNCTION public.adjust_ingredient_stock(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.adjust_ingredient_stock(jsonb) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.apply_ingredients_for_order(p_order_id uuid, p_allow_negative boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_row record;
  v_cycle integer;
  v_delta numeric;
  v_applied integer := 0;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pedido não encontrado para baixa de insumos.';
  END IF;

  FOR v_row IN
    SELECT
      oi.id AS order_item_id,
      oi.quantity::numeric AS order_quantity,
      ri.id AS recipe_item_id,
      ri.ingredient_id,
      ri.quantity AS ingredient_quantity,
      ri.loss_percent
    FROM public.order_items oi
    JOIN public.product_recipe_items ri ON ri.product_id = oi.product_id
    WHERE oi.order_id = p_order_id
  LOOP
    SELECT count(*)::integer INTO v_cycle
    FROM public.ingredient_stock_movements ism
    WHERE ism.order_item_id = v_row.order_item_id
      AND ism.recipe_item_id = v_row.recipe_item_id
      AND ism.movement_type = 'sale_revert';

    v_delta := -1 * v_row.order_quantity * v_row.ingredient_quantity * (1 + (v_row.loss_percent / 100));

    PERFORM public.apply_ingredient_movement(jsonb_build_object(
      'restaurant_id', v_order.restaurant_id,
      'ingredient_id', v_row.ingredient_id,
      'recipe_item_id', v_row.recipe_item_id,
      'quantity_delta', v_delta,
      'movement_type', CASE WHEN p_allow_negative THEN 'manual_negative_override' ELSE 'sale' END,
      'reason', 'Baixa automática por pedido finalizado',
      'order_id', p_order_id,
      'order_item_id', v_row.order_item_id,
      'idempotency_key', 'ingredient_sale:' || v_row.order_item_id || ':' || v_row.recipe_item_id || ':cycle-' || v_cycle,
      'allow_negative', p_allow_negative
    ));

    v_applied := v_applied + 1;
  END LOOP;

  RETURN jsonb_build_object('applied', v_applied);
END;
$$;

REVOKE ALL ON FUNCTION public.apply_ingredients_for_order(uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_ingredients_for_order(uuid, boolean) TO service_role;

CREATE OR REPLACE FUNCTION public.revert_ingredients_for_order(p_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_row record;
  v_sale_count integer;
  v_revert_count integer;
  v_cycle integer;
  v_delta numeric;
  v_reverted integer := 0;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pedido não encontrado para estorno de insumos.';
  END IF;

  FOR v_row IN
    SELECT
      oi.id AS order_item_id,
      oi.quantity::numeric AS order_quantity,
      ri.id AS recipe_item_id,
      ri.ingredient_id,
      ri.quantity AS ingredient_quantity,
      ri.loss_percent
    FROM public.order_items oi
    JOIN public.product_recipe_items ri ON ri.product_id = oi.product_id
    WHERE oi.order_id = p_order_id
  LOOP
    SELECT count(*)::integer INTO v_sale_count
    FROM public.ingredient_stock_movements ism
    WHERE ism.order_item_id = v_row.order_item_id
      AND ism.recipe_item_id = v_row.recipe_item_id
      AND ism.movement_type IN ('sale', 'manual_negative_override');

    SELECT count(*)::integer INTO v_revert_count
    FROM public.ingredient_stock_movements ism
    WHERE ism.order_item_id = v_row.order_item_id
      AND ism.recipe_item_id = v_row.recipe_item_id
      AND ism.movement_type = 'sale_revert';

    IF v_sale_count <= v_revert_count THEN
      CONTINUE;
    END IF;

    v_cycle := v_revert_count;
    v_delta := v_row.order_quantity * v_row.ingredient_quantity * (1 + (v_row.loss_percent / 100));

    PERFORM public.apply_ingredient_movement(jsonb_build_object(
      'restaurant_id', v_order.restaurant_id,
      'ingredient_id', v_row.ingredient_id,
      'recipe_item_id', v_row.recipe_item_id,
      'quantity_delta', v_delta,
      'movement_type', 'sale_revert',
      'reason', 'Estorno automático por cancelamento/reabertura',
      'order_id', p_order_id,
      'order_item_id', v_row.order_item_id,
      'idempotency_key', 'ingredient_revert:' || v_row.order_item_id || ':' || v_row.recipe_item_id || ':cycle-' || v_cycle,
      'allow_negative', true
    ));

    v_reverted := v_reverted + 1;
  END LOOP;

  RETURN jsonb_build_object('reverted', v_reverted);
END;
$$;

REVOKE ALL ON FUNCTION public.revert_ingredients_for_order(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.revert_ingredients_for_order(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.sync_ingredient_stock_from_order_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'finalizado' AND OLD.status IS DISTINCT FROM 'finalizado' THEN
    PERFORM public.apply_ingredients_for_order(NEW.id, false);
  ELSIF OLD.status = 'finalizado' AND NEW.status IS DISTINCT FROM 'finalizado' THEN
    PERFORM public.revert_ingredients_for_order(NEW.id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_ingredient_stock_from_order_status ON public.orders;
CREATE TRIGGER trg_sync_ingredient_stock_from_order_status
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_ingredient_stock_from_order_status();

CREATE OR REPLACE FUNCTION public.get_recipe_costs(p_restaurant_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (
    public.is_super_admin(auth.uid())
    OR public.user_has_restaurant_permission(p_restaurant_id, 'products_view'::public.permission_type)
    OR public.user_has_restaurant_permission(p_restaurant_id, 'reports_view'::public.permission_type)
  ) THEN
    RAISE EXCEPTION 'Sem permissão para visualizar custos de ficha técnica.';
  END IF;

  RETURN (
    WITH recipe_costs AS (
      SELECT
        p.id AS product_id,
        p.name AS product_name,
        p.price,
        count(ri.id)::integer AS ingredient_count,
        COALESCE(sum(ri.quantity * (1 + ri.loss_percent / 100) * i.unit_cost), 0)::numeric AS estimated_cost
      FROM public.products p
      LEFT JOIN public.product_recipe_items ri ON ri.product_id = p.id
      LEFT JOIN public.inventory_ingredients i ON i.id = ri.ingredient_id
      WHERE p.restaurant_id = p_restaurant_id
      GROUP BY p.id, p.name, p.price
    )
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'productId', product_id,
      'productName', product_name,
      'price', price,
      'ingredientCount', ingredient_count,
      'estimatedCost', estimated_cost,
      'grossMargin', price - estimated_cost,
      'grossMarginPercent', CASE
        WHEN price <= 0 THEN 0
        ELSE round(((price - estimated_cost) / price) * 100, 1)
      END
    ) ORDER BY product_name), '[]'::jsonb)
    FROM recipe_costs
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_recipe_costs(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_recipe_costs(uuid) TO authenticated, service_role;
