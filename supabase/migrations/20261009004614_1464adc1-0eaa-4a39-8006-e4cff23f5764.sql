CREATE OR REPLACE FUNCTION public.set_pos_order_payment(p_order_id uuid, p_method text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_order public.orders%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  IF p_method NOT IN ('dinheiro','pix','credito','debito','voucher','misto') THEN
    RAISE EXCEPTION 'Forma de pagamento inválida';
  END IF;
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND OR v_order.restaurant_id IS DISTINCT FROM public.get_user_restaurant_id() THEN
    RAISE EXCEPTION 'Pedido não encontrado';
  END IF;
  IF v_order.status = 'cancelado' THEN RAISE EXCEPTION 'Pedido cancelado não recebe pagamento'; END IF;
  IF coalesce(v_order.payment_provider,'') NOT IN ('', 'pdv') THEN
    RAISE EXCEPTION 'Pagamento online não pode ser alterado no PDV';
  END IF;
  UPDATE public.orders
     SET payment_method = p_method,
         payment_provider = 'pdv',
         payment_status = 'paid',
         paid_at = coalesce(paid_at, now()),
         updated_at = now()
   WHERE id = p_order_id;
  RETURN jsonb_build_object('id', p_order_id, 'payment_method', p_method);
END $$;

REVOKE ALL ON FUNCTION public.set_pos_order_payment(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_pos_order_payment(uuid, text) TO authenticated, service_role;