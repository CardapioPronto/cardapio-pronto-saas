CREATE TABLE public.order_payment_splits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  method text NOT NULL CHECK (method IN ('dinheiro','pix','credito','debito','voucher')),
  amount numeric NOT NULL CHECK (amount > 0),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX order_payment_splits_order_idx ON public.order_payment_splits (order_id);
CREATE INDEX order_payment_splits_restaurant_idx ON public.order_payment_splits (restaurant_id, created_at DESC);
ALTER TABLE public.order_payment_splits ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.order_payment_splits TO authenticated;
GRANT ALL ON public.order_payment_splits TO service_role;
CREATE POLICY "Staff view order payment splits" ON public.order_payment_splits FOR SELECT TO authenticated
  USING (restaurant_id = public.get_user_restaurant_id());

CREATE OR REPLACE FUNCTION public.set_order_payment_splits(p_order_id uuid, p_splits jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_split jsonb;
  v_method text;
  v_amount numeric;
  v_sum numeric := 0;
  v_count int := 0;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Não autenticado' USING ERRCODE='42501'; END IF;
  IF p_splits IS NULL OR jsonb_typeof(p_splits) <> 'array' OR jsonb_array_length(p_splits) < 2 THEN
    RAISE EXCEPTION 'Informe ao menos duas parcelas';
  END IF;
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND OR v_order.restaurant_id IS DISTINCT FROM public.get_user_restaurant_id() THEN
    RAISE EXCEPTION 'Pedido não encontrado';
  END IF;
  IF v_order.status = 'cancelado' THEN RAISE EXCEPTION 'Pedido cancelado não recebe pagamento'; END IF;
  IF coalesce(v_order.payment_provider,'') NOT IN ('', 'pdv') THEN
    RAISE EXCEPTION 'Pagamento online não pode ser alterado no PDV';
  END IF;
  FOR v_split IN SELECT * FROM jsonb_array_elements(p_splits) LOOP
    v_method := lower(trim(coalesce(v_split->>'method','')));
    v_amount := round(coalesce((v_split->>'amount')::numeric, 0), 2);
    IF v_method NOT IN ('dinheiro','pix','credito','debito','voucher') THEN
      RAISE EXCEPTION 'Forma de pagamento inválida: %', v_method;
    END IF;
    IF v_amount <= 0 THEN RAISE EXCEPTION 'Parcelas devem ter valor maior que zero'; END IF;
    v_sum := v_sum + v_amount;
    v_count := v_count + 1;
  END LOOP;
  IF abs(v_sum - round(coalesce(v_order.total,0),2)) > 0.01 THEN
    RAISE EXCEPTION 'A soma das parcelas (R$ %) deve ser igual ao total do pedido (R$ %)', v_sum, round(coalesce(v_order.total,0),2);
  END IF;
  DELETE FROM public.order_payment_splits WHERE order_id = p_order_id;
  FOR v_split IN SELECT * FROM jsonb_array_elements(p_splits) LOOP
    INSERT INTO public.order_payment_splits(restaurant_id, order_id, method, amount, created_by)
    VALUES (v_order.restaurant_id, p_order_id, lower(trim(v_split->>'method')), round((v_split->>'amount')::numeric,2), auth.uid());
  END LOOP;
  UPDATE public.orders
     SET payment_method = 'misto', payment_provider = 'pdv', payment_status = 'paid',
         paid_at = coalesce(paid_at, now()), updated_at = now()
   WHERE id = p_order_id;
  INSERT INTO public.cash_audit_events(restaurant_id,event_type,order_id,actor_id,new_value)
  VALUES (v_order.restaurant_id,'payment_splits_set',p_order_id,auth.uid(),
    jsonb_build_object('splits',p_splits,'total',v_order.total));
  RETURN jsonb_build_object('id', p_order_id, 'payment_method', 'misto', 'splits', v_count);
END $$;
REVOKE ALL ON FUNCTION public.set_order_payment_splits(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_order_payment_splits(uuid, jsonb) TO authenticated;

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
  IF p_method <> 'misto' THEN
    DELETE FROM public.order_payment_splits WHERE order_id = p_order_id;
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

CREATE OR REPLACE FUNCTION public.get_cash_shift_activity(p_restaurant_id uuid, p_since timestamptz, p_until timestamptz DEFAULT now()) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE result jsonb;
BEGIN
 IF auth.uid() IS NULL OR p_restaurant_id IS DISTINCT FROM public.get_user_restaurant_id() THEN RAISE EXCEPTION 'Restaurante não autorizado' USING ERRCODE='42501'; END IF;
 IF p_since IS NULL OR p_until IS NULL OR p_until < p_since OR p_until > now() + interval '1 minute' THEN RAISE EXCEPTION 'Período inválido'; END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',o.id,'order_number',o.order_number,'created_at',o.created_at,'paid_at',o.paid_at,'customer_name',o.customer_name,'total',o.total,'status',o.status,'payment_method',o.payment_method,'payment_provider',o.payment_provider,'payment_status',o.payment_status,'source',o.source,'order_type',o.order_type,'splits',coalesce(sp.splits,'[]'::jsonb)) ORDER BY o.created_at,o.id),'[]'::jsonb) INTO result
 FROM public.orders o
 LEFT JOIN LATERAL (
   SELECT jsonb_agg(jsonb_build_object('method',s.method,'amount',s.amount) ORDER BY s.created_at,s.id) splits
   FROM public.order_payment_splits s WHERE s.order_id = o.id
 ) sp ON true
 WHERE o.restaurant_id=p_restaurant_id AND ((o.created_at >= p_since AND o.created_at < p_until) OR (o.paid_at >= p_since AND o.paid_at < p_until));
 RETURN jsonb_build_object('orders',result,'since',p_since,'until',p_until);
END $$;
REVOKE ALL ON FUNCTION public.get_cash_shift_activity(uuid,timestamptz,timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_cash_shift_activity(uuid,timestamptz,timestamptz) TO authenticated;

ALTER TABLE public.cash_register_sessions ADD COLUMN IF NOT EXISTS closing_method_totals jsonb;