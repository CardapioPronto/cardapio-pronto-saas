-- Garante que pedidos delivery possam ser avaliados quando o tracking publico
-- estiver como entregue, mesmo se a sincronizacao do pedido operacional variar.

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
