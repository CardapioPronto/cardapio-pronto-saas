-- Bloco 13: cardapio inteligente e upsell.

CREATE TABLE IF NOT EXISTS public.menu_upsell_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name text NOT NULL,
  placement text NOT NULL,
  trigger_product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
  suggested_product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  title text,
  description text,
  starts_at time,
  ends_at time,
  weekdays integer[],
  priority integer NOT NULL DEFAULT 100,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT menu_upsell_rules_placement_check CHECK (
    placement IN ('featured', 'product_modal', 'cart_combo', 'also_ordered')
  ),
  CONSTRAINT menu_upsell_rules_weekdays_check CHECK (
    weekdays IS NULL OR weekdays <@ ARRAY[0,1,2,3,4,5,6]
  ),
  CONSTRAINT menu_upsell_rules_distinct_products_check CHECK (
    trigger_product_id IS NULL OR trigger_product_id <> suggested_product_id
  ),
  CONSTRAINT menu_upsell_rules_trigger_required_check CHECK (
    placement IN ('featured', 'cart_combo') OR trigger_product_id IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS idx_menu_upsell_rules_restaurant_active
  ON public.menu_upsell_rules (restaurant_id, is_active, placement, priority);

CREATE INDEX IF NOT EXISTS idx_menu_upsell_rules_trigger
  ON public.menu_upsell_rules (restaurant_id, trigger_product_id)
  WHERE trigger_product_id IS NOT NULL;

DROP TRIGGER IF EXISTS update_menu_upsell_rules_updated_at ON public.menu_upsell_rules;
CREATE TRIGGER update_menu_upsell_rules_updated_at
  BEFORE UPDATE ON public.menu_upsell_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.menu_upsell_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Restaurant staff can view own menu upsell rules" ON public.menu_upsell_rules;
CREATE POLICY "Restaurant staff can view own menu upsell rules"
ON public.menu_upsell_rules FOR SELECT
TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR restaurant_id = public.get_user_restaurant_id()
);

DROP POLICY IF EXISTS "Restaurant product managers can manage own menu upsell rules" ON public.menu_upsell_rules;
CREATE POLICY "Restaurant product managers can manage own menu upsell rules"
ON public.menu_upsell_rules FOR ALL
TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR public.user_has_restaurant_permission(restaurant_id, 'products_manage'::public.permission_type)
  OR public.user_has_restaurant_permission(restaurant_id, 'settings_manage'::public.permission_type)
)
WITH CHECK (
  public.is_super_admin(auth.uid())
  OR public.user_has_restaurant_permission(restaurant_id, 'products_manage'::public.permission_type)
  OR public.user_has_restaurant_permission(restaurant_id, 'settings_manage'::public.permission_type)
);

CREATE OR REPLACE FUNCTION public.get_public_menu_upsell(p_restaurant_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now time := (now() AT TIME ZONE 'America/Sao_Paulo')::time;
  v_dow integer := EXTRACT(DOW FROM (now() AT TIME ZONE 'America/Sao_Paulo'))::integer;
BEGIN
  IF p_restaurant_id IS NULL THEN
    RETURN jsonb_build_object(
      'featured', '[]'::jsonb,
      'productModal', '[]'::jsonb,
      'cartCombos', '[]'::jsonb,
      'alsoOrderedManual', '[]'::jsonb,
      'alsoOrderedReal', '[]'::jsonb
    );
  END IF;

  RETURN (
    WITH active_rules AS (
      SELECT r.*
      FROM public.menu_upsell_rules r
      JOIN public.products sp ON sp.id = r.suggested_product_id
      LEFT JOIN public.products tp ON tp.id = r.trigger_product_id
      WHERE r.restaurant_id = p_restaurant_id
        AND r.is_active = true
        AND sp.restaurant_id = p_restaurant_id
        AND sp.available = true
        AND (tp.id IS NULL OR (tp.restaurant_id = p_restaurant_id AND tp.available = true))
        AND (r.weekdays IS NULL OR v_dow = ANY(r.weekdays))
        AND (
          r.starts_at IS NULL
          OR r.ends_at IS NULL
          OR (
            r.starts_at <= r.ends_at
            AND v_now >= r.starts_at
            AND v_now <= r.ends_at
          )
          OR (
            r.starts_at > r.ends_at
            AND (v_now >= r.starts_at OR v_now <= r.ends_at)
          )
        )
    ),
    real_pairs AS (
      SELECT
        base.product_id AS trigger_product_id,
        suggested.product_id AS suggested_product_id,
        count(DISTINCT base.order_id)::integer AS orders_count
      FROM public.order_items base
      JOIN public.order_items suggested
        ON suggested.order_id = base.order_id
       AND suggested.product_id IS NOT NULL
       AND suggested.product_id <> base.product_id
      JOIN public.orders o ON o.id = base.order_id
      JOIN public.products pbase ON pbase.id = base.product_id
      JOIN public.products psuggested ON psuggested.id = suggested.product_id
      WHERE o.restaurant_id = p_restaurant_id
        AND o.status = 'finalizado'
        AND o.created_at >= now() - interval '120 days'
        AND base.product_id IS NOT NULL
        AND pbase.restaurant_id = p_restaurant_id
        AND psuggested.restaurant_id = p_restaurant_id
        AND pbase.available = true
        AND psuggested.available = true
      GROUP BY base.product_id, suggested.product_id
      HAVING count(DISTINCT base.order_id) >= 3
    ),
    ranked_real_pairs AS (
      SELECT *,
        row_number() OVER (
          PARTITION BY trigger_product_id
          ORDER BY orders_count DESC, suggested_product_id
        ) AS rn
      FROM real_pairs
    )
    SELECT jsonb_build_object(
      'featured', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'ruleId', id,
          'productId', suggested_product_id,
          'title', title,
          'description', description,
          'priority', priority
        ) ORDER BY priority ASC, created_at DESC)
        FROM active_rules
        WHERE placement = 'featured'
      ), '[]'::jsonb),
      'productModal', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'ruleId', id,
          'triggerProductId', trigger_product_id,
          'productId', suggested_product_id,
          'title', title,
          'description', description,
          'priority', priority
        ) ORDER BY priority ASC, created_at DESC)
        FROM active_rules
        WHERE placement = 'product_modal'
      ), '[]'::jsonb),
      'cartCombos', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'ruleId', id,
          'productId', suggested_product_id,
          'title', title,
          'description', description,
          'priority', priority
        ) ORDER BY priority ASC, created_at DESC)
        FROM active_rules
        WHERE placement = 'cart_combo'
      ), '[]'::jsonb),
      'alsoOrderedManual', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'ruleId', id,
          'triggerProductId', trigger_product_id,
          'productId', suggested_product_id,
          'title', title,
          'description', description,
          'priority', priority
        ) ORDER BY priority ASC, created_at DESC)
        FROM active_rules
        WHERE placement = 'also_ordered'
      ), '[]'::jsonb),
      'alsoOrderedReal', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'triggerProductId', trigger_product_id,
          'productId', suggested_product_id,
          'ordersCount', orders_count
        ) ORDER BY trigger_product_id, rn)
        FROM ranked_real_pairs
        WHERE rn <= 4
      ), '[]'::jsonb)
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_menu_upsell(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_menu_upsell(uuid) TO anon, authenticated, service_role;
