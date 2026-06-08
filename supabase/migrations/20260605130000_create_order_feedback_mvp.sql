-- Bloco 11: avaliacoes pos-pedido e NPS operacional.

CREATE TABLE IF NOT EXISTS public.order_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  delivery_order_id uuid REFERENCES public.delivery_orders(id) ON DELETE SET NULL,
  tracking_id uuid NOT NULL,
  customer_name text,
  customer_phone text,
  customer_email text,
  rating integer NOT NULL CHECK (rating BETWEEN 0 AND 10),
  comment text,
  contact_requested boolean NOT NULL DEFAULT false,
  source text NOT NULL DEFAULT 'public_tracking',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  resolved_at timestamptz,
  resolved_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id)
);

CREATE INDEX IF NOT EXISTS idx_order_feedback_restaurant_created
  ON public.order_feedback(restaurant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_order_feedback_restaurant_rating
  ON public.order_feedback(restaurant_id, rating, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_order_feedback_customer_phone
  ON public.order_feedback(restaurant_id, customer_phone)
  WHERE customer_phone IS NOT NULL;

ALTER TABLE public.order_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_feedback FORCE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS update_order_feedback_updated_at ON public.order_feedback;
CREATE TRIGGER update_order_feedback_updated_at
  BEFORE UPDATE ON public.order_feedback
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP POLICY IF EXISTS "Restaurant staff can view own order feedback" ON public.order_feedback;
CREATE POLICY "Restaurant staff can view own order feedback"
ON public.order_feedback
FOR SELECT
TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR restaurant_id = public.get_user_restaurant_id()
  OR public.user_has_restaurant_permission(restaurant_id, 'reports_view'::public.permission_type)
  OR public.user_has_restaurant_permission(restaurant_id, 'orders_metrics_view'::public.permission_type)
);

DROP POLICY IF EXISTS "Restaurant staff can resolve own order feedback" ON public.order_feedback;
CREATE POLICY "Restaurant staff can resolve own order feedback"
ON public.order_feedback
FOR UPDATE
TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR restaurant_id = public.get_user_restaurant_id()
)
WITH CHECK (
  public.is_super_admin(auth.uid())
  OR restaurant_id = public.get_user_restaurant_id()
);

CREATE OR REPLACE FUNCTION public.submit_public_order_feedback(
  p_tracking_id uuid,
  p_rating integer,
  p_comment text DEFAULT NULL,
  p_contact_requested boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_delivery public.delivery_orders%ROWTYPE;
  v_order public.orders%ROWTYPE;
  v_feedback_id uuid;
  v_comment text;
BEGIN
  PERFORM public._enforce_public_rate_limit('order_feedback_submit', 10, 60);

  IF p_tracking_id IS NULL THEN
    RAISE EXCEPTION 'Pedido não informado.';
  END IF;

  IF p_rating IS NULL OR p_rating < 0 OR p_rating > 10 THEN
    RAISE EXCEPTION 'Nota inválida.';
  END IF;

  v_comment := NULLIF(btrim(COALESCE(p_comment, '')), '');
  IF v_comment IS NOT NULL AND char_length(v_comment) > 800 THEN
    v_comment := left(v_comment, 800);
  END IF;

  SELECT *
  INTO v_delivery
  FROM public.delivery_orders
  WHERE id = p_tracking_id;

  IF v_delivery.id IS NOT NULL THEN
    SELECT * INTO v_order FROM public.orders WHERE id = v_delivery.order_id;
  ELSE
    SELECT * INTO v_order FROM public.orders WHERE id = p_tracking_id;
  END IF;

  IF v_order.id IS NULL THEN
    RAISE EXCEPTION 'Pedido não encontrado.';
  END IF;

  IF NOT (
    COALESCE(v_order.status, '') = 'finalizado'
    OR COALESCE(v_delivery.status, '') = 'delivered'
  ) THEN
    RAISE EXCEPTION 'A avaliação fica disponível após a conclusão do pedido.';
  END IF;

  INSERT INTO public.order_feedback (
    restaurant_id,
    order_id,
    delivery_order_id,
    tracking_id,
    customer_name,
    customer_phone,
    customer_email,
    rating,
    comment,
    contact_requested,
    metadata
  )
  VALUES (
    v_order.restaurant_id,
    v_order.id,
    v_delivery.id,
    p_tracking_id,
    NULLIF(btrim(COALESCE(v_delivery.customer_name, v_order.customer_name, '')), ''),
    NULLIF(btrim(COALESCE(v_delivery.customer_phone, v_order.customer_phone, '')), ''),
    NULLIF(btrim(COALESCE(v_delivery.customer_email, '')), ''),
    p_rating,
    v_comment,
    COALESCE(p_contact_requested, false),
    jsonb_build_object(
      'fulfillment_type', COALESCE(v_delivery.fulfillment_type, v_order.order_type),
      'order_total', v_order.total,
      'submitted_from', 'public_tracking'
    )
  )
  ON CONFLICT (order_id) DO UPDATE
  SET
    rating = EXCLUDED.rating,
    comment = EXCLUDED.comment,
    contact_requested = EXCLUDED.contact_requested,
    customer_name = COALESCE(EXCLUDED.customer_name, public.order_feedback.customer_name),
    customer_phone = COALESCE(EXCLUDED.customer_phone, public.order_feedback.customer_phone),
    customer_email = COALESCE(EXCLUDED.customer_email, public.order_feedback.customer_email),
    tracking_id = EXCLUDED.tracking_id,
    metadata = public.order_feedback.metadata || EXCLUDED.metadata,
    updated_at = now()
  RETURNING id INTO v_feedback_id;

  RETURN jsonb_build_object(
    'success', true,
    'feedback_id', v_feedback_id,
    'rating', p_rating
  );
END;
$$;

REVOKE ALL ON FUNCTION public.submit_public_order_feedback(uuid, integer, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_public_order_feedback(uuid, integer, text, boolean) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_restaurant_feedback_summary(
  p_restaurant_id uuid,
  p_from timestamptz,
  p_to timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_days integer;
BEGIN
  PERFORM public.assert_restaurant_report_access(p_restaurant_id);

  IF p_to < p_from THEN
    RAISE EXCEPTION 'A data inicial não pode ser maior que a data final';
  END IF;

  v_days := (p_to::date - p_from::date) + 1;
  IF v_days > 366 OR v_days < 1 THEN
    RAISE EXCEPTION 'Período inválido (máximo 366 dias)';
  END IF;

  RETURN (
    WITH filtered AS (
      SELECT f.*
      FROM public.order_feedback f
      WHERE f.restaurant_id = p_restaurant_id
        AND f.created_at >= p_from
        AND f.created_at <= p_to
    ),
    summary AS (
      SELECT
        count(*)::integer AS total,
        COALESCE(round(avg(rating)::numeric, 2), 0)::numeric AS average_rating,
        count(*) FILTER (WHERE rating >= 9)::integer AS promoters,
        count(*) FILTER (WHERE rating BETWEEN 7 AND 8)::integer AS passives,
        count(*) FILTER (WHERE rating <= 6)::integer AS detractors,
        count(*) FILTER (WHERE rating <= 6 AND resolved_at IS NULL)::integer AS open_low_rating,
        count(*) FILTER (WHERE contact_requested = true)::integer AS contact_requests
      FROM filtered
    ),
    recent AS (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', f.id,
        'orderId', f.order_id,
        'trackingId', f.tracking_id,
        'rating', f.rating,
        'comment', f.comment,
        'contactRequested', f.contact_requested,
        'customerName', f.customer_name,
        'customerPhone', f.customer_phone,
        'createdAt', f.created_at,
        'resolvedAt', f.resolved_at,
        'orderTotal', o.total,
        'orderNumber', o.order_number
      ) ORDER BY f.created_at DESC), '[]'::jsonb) AS items
      FROM (
        SELECT *
        FROM filtered
        ORDER BY rating ASC, created_at DESC
        LIMIT 12
      ) f
      LEFT JOIN public.orders o ON o.id = f.order_id
    )
    SELECT jsonb_build_object(
      'summary', jsonb_build_object(
        'total', s.total,
        'averageRating', s.average_rating,
        'promoters', s.promoters,
        'passives', s.passives,
        'detractors', s.detractors,
        'openLowRating', s.open_low_rating,
        'contactRequests', s.contact_requests,
        'nps', CASE
          WHEN s.total = 0 THEN 0
          ELSE round(((s.promoters::numeric - s.detractors::numeric) / s.total::numeric) * 100, 1)
        END
      ),
      'recent', r.items
    )
    FROM summary s
    CROSS JOIN recent r
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_restaurant_feedback_summary(uuid, timestamptz, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_restaurant_feedback_summary(uuid, timestamptz, timestamptz) TO authenticated, service_role;
