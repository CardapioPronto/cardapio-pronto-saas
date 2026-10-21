ALTER TABLE public.cash_register_sessions ADD COLUMN IF NOT EXISTS system_received_total numeric, ADD COLUMN IF NOT EXISTS system_pending_total numeric, ADD COLUMN IF NOT EXISTS system_external_total numeric;
CREATE INDEX IF NOT EXISTS orders_restaurant_paid_at_idx ON public.orders (restaurant_id, paid_at) WHERE paid_at IS NOT NULL;
CREATE OR REPLACE FUNCTION public.get_cash_shift_activity(p_restaurant_id uuid, p_since timestamptz, p_until timestamptz DEFAULT now()) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE result jsonb;
BEGIN
 IF auth.uid() IS NULL OR p_restaurant_id IS DISTINCT FROM public.get_user_restaurant_id() THEN RAISE EXCEPTION 'Restaurante não autorizado' USING ERRCODE='42501'; END IF;
 IF p_since IS NULL OR p_until IS NULL OR p_until < p_since OR p_until > now() + interval '1 minute' THEN RAISE EXCEPTION 'Período inválido'; END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',o.id,'order_number',o.order_number,'created_at',o.created_at,'paid_at',o.paid_at,'customer_name',o.customer_name,'total',o.total,'status',o.status,'payment_method',o.payment_method,'payment_provider',o.payment_provider,'payment_status',o.payment_status,'source',o.source,'order_type',o.order_type) ORDER BY o.created_at,o.id),'[]'::jsonb) INTO result FROM public.orders o WHERE o.restaurant_id=p_restaurant_id AND ((o.created_at >= p_since AND o.created_at < p_until) OR (o.paid_at >= p_since AND o.paid_at < p_until));
 RETURN jsonb_build_object('orders',result,'since',p_since,'until',p_until);
END $$;
REVOKE ALL ON FUNCTION public.get_cash_shift_activity(uuid,timestamptz,timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_cash_shift_activity(uuid,timestamptz,timestamptz) TO authenticated;
COMMENT ON FUNCTION public.get_cash_shift_activity(uuid,timestamptz,timestamptz) IS 'Read-only tenant-scoped cash activity. Half-open interval by creation OR confirmed payment timestamp; no row-limit truncation. Not a definitive locked closing.';