-- Keep public order tracking available without exposing customer PII.

CREATE OR REPLACE FUNCTION public.get_public_order_tracking(p_tracking_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_delivery public.delivery_orders%ROWTYPE;
  v_order public.orders%ROWTYPE;
  v_restaurant record;
  v_items jsonb := '[]'::jsonb;
  v_history jsonb := '[]'::jsonb;
  v_payment jsonb := NULL;
BEGIN
  SELECT * INTO v_delivery
  FROM public.delivery_orders
  WHERE id = p_tracking_id
  LIMIT 1;

  IF v_delivery.id IS NOT NULL THEN
    SELECT * INTO v_order FROM public.orders WHERE id = v_delivery.order_id;
  ELSE
    SELECT * INTO v_order FROM public.orders WHERE id = p_tracking_id;
  END IF;

  IF v_order.id IS NULL THEN
    RAISE EXCEPTION 'Pedido não encontrado.';
  END IF;

  SELECT r.id, r.name, r.logo_url, r.phone, r.phone_whatsapp
  INTO v_restaurant
  FROM public.restaurants r
  WHERE r.id = v_order.restaurant_id;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', oi.id,
    'product_id', oi.product_id,
    'product_name', oi.product_name,
    'name', oi.product_name,
    'quantity', oi.quantity,
    'price', oi.price,
    'observations', oi.observations,
    'addons', COALESCE(oi.addons, '[]'::jsonb)
  ) ORDER BY oi.created_at), '[]'::jsonb)
  INTO v_items
  FROM public.order_items oi
  WHERE oi.order_id = v_order.id;

  IF v_delivery.id IS NOT NULL THEN
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'status', h.new_status,
      'new_status', h.new_status,
      'created_at', h.created_at
    ) ORDER BY h.created_at), '[]'::jsonb)
    INTO v_history
    FROM public.delivery_order_status_history h
    WHERE h.delivery_order_id = v_delivery.id;
  END IF;

  SELECT jsonb_build_object(
    'status', op.status,
    'payment_method', op.payment_method,
    'provider', op.provider,
    'amount', op.amount,
    'qr_code', op.qr_code,
    'qr_code_url', op.qr_code_url,
    'checkout_url', op.checkout_url,
    'expires_at', op.expires_at,
    'paid_at', op.paid_at
  )
  INTO v_payment
  FROM public.order_payments op
  WHERE op.order_id = v_order.id
  ORDER BY op.created_at DESC
  LIMIT 1;

  RETURN jsonb_build_object(
    'id', COALESCE(v_delivery.id, v_order.id),
    'order_id', v_order.id,
    'delivery_order_id', v_delivery.id,
    'order_number', v_order.order_number,
    'restaurant_id', v_order.restaurant_id,
    'restaurant', jsonb_build_object(
      'id', v_restaurant.id,
      'name', v_restaurant.name,
      'logo_url', v_restaurant.logo_url,
      'phone', v_restaurant.phone,
      'phone_whatsapp', v_restaurant.phone_whatsapp
    ),
    'fulfillment_type', CASE
      WHEN v_order.order_type = 'mesa' THEN 'table'
      WHEN v_order.order_type = 'delivery' THEN 'delivery'
      ELSE 'pickup'
    END,
    'status', COALESCE(v_delivery.status, v_order.status),
    'order_status', v_order.status,
    'payment_method', COALESCE(v_delivery.payment_method, v_order.payment_method),
    'payment_status', COALESCE(v_delivery.payment_status, v_order.payment_status),
    'paid_at', COALESCE(v_delivery.paid_at, v_order.paid_at),
    'payment', v_payment,
    'change_for', v_delivery.change_for,
    'delivery_fee', COALESCE(v_delivery.delivery_fee, 0),
    'subtotal', COALESCE(v_delivery.subtotal, v_order.total),
    'total', COALESCE(v_delivery.total, v_order.total),
    'estimated_delivery_minutes', v_delivery.estimated_delivery_minutes,
    'items', v_items,
    'history', v_history,
    'created_at', v_order.created_at,
    'updated_at', GREATEST(v_order.updated_at, COALESCE(v_delivery.updated_at, v_order.updated_at))
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_order_tracking(uuid) TO anon, authenticated;
