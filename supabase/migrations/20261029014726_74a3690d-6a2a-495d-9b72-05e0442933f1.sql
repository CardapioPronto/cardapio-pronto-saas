CREATE OR REPLACE FUNCTION public._tmp_t2(p_session_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE s public.cash_register_sessions; v_until timestamptz := now(); r record;
BEGIN
  SELECT * INTO s FROM public.cash_register_sessions WHERE id = p_session_id;
  WITH base AS (
    SELECT o.id, o.order_number, o.total, o.created_at, o.paid_at,
      lower(trim(coalesce(o.status,''))) st, lower(trim(coalesce(o.payment_status,''))) ps,
      lower(trim(coalesce(o.payment_provider,''))) pv, lower(trim(coalesce(o.source,''))) src,
      lower(trim(coalesce(o.payment_method,''))) pm,
      (o.created_at >= s.opened_at AND o.created_at < v_until) c_in,
      (o.paid_at >= s.opened_at AND o.paid_at < v_until) p_in,
      coalesce(sp.splits,'[]'::jsonb) splits,
      coalesce(sp.split_sum,0) split_sum
    FROM public.orders o
    LEFT JOIN LATERAL (
      SELECT jsonb_agg(jsonb_build_object('method',x.method,'amount',x.amount) ORDER BY x.created_at,x.id) splits,
             sum(x.amount) split_sum
      FROM public.order_payment_splits x WHERE x.order_id = o.id
    ) sp ON true
    WHERE o.restaurant_id = s.restaurant_id
      AND ((o.created_at >= s.opened_at AND o.created_at < v_until) OR (o.paid_at >= s.opened_at AND o.paid_at < v_until))
  ), cls AS (
    SELECT b.*, (st IN ('cancelled','canceled','cancelado','cancelada')) canc,
      CASE
        WHEN st IN ('cancelled','canceled','cancelado','cancelada') OR ps IN ('refunded','canceled') THEN CASE WHEN ps IN ('paid','refunded') THEN 'review' END
        WHEN ps <> 'paid' THEN CASE WHEN c_in THEN 'pending' END
        WHEN paid_at IS NULL THEN 'review'
        WHEN NOT coalesce(p_in,false) THEN NULL
        WHEN src = 'ifood' AND pv IN ('','pdv') THEN 'review'
        WHEN pv NOT IN ('','pdv') THEN 'external'
        WHEN pm = 'misto' THEN CASE WHEN abs(split_sum - round(coalesce(total,0),2)) <= 0.01 AND split_sum > 0 THEN 'received' ELSE 'review' END
        WHEN pm IN ('dinheiro','cash','pix','credito','credit','credit_card','cartao_credito','debito','debit','debit_card','cartao_debito','voucher','vale','meal_voucher') THEN 'received'
        ELSE 'review' END klass
    FROM base b
  )
  SELECT count(*) FILTER (WHERE c_in AND NOT canc) cnt,
    coalesce(sum(total) FILTER (WHERE c_in AND NOT canc),0) sales,
    coalesce(sum(total) FILTER (WHERE klass='received'),0) recv,
    coalesce(sum(total) FILTER (WHERE klass='received' AND pm IN ('dinheiro','cash')),0)
      + coalesce((SELECT sum((e->>'amount')::numeric) FROM cls c2, jsonb_array_elements(c2.splits) e WHERE c2.klass='received' AND c2.pm='misto' AND e->>'method'='dinheiro'),0) cash,
    coalesce(sum(total) FILTER (WHERE klass='pending'),0) pend,
    coalesce(sum(total) FILTER (WHERE klass='external'),0) ext,
    count(*) FILTER (WHERE klass='review') rev,
    coalesce(jsonb_agg(jsonb_build_object('id',id,'order_number',order_number,'total',total,'paid_at',paid_at,'class',klass,'payment_method',pm,'splits',splits) ORDER BY created_at,id) FILTER (WHERE klass IS NOT NULL OR (c_in AND NOT canc)),'[]') snap
  INTO r FROM cls;
  RETURN jsonb_build_object('cnt', r.cnt);
END $$;