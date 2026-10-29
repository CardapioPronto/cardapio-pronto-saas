DROP FUNCTION IF EXISTS public._tmp_t1(uuid);
DROP FUNCTION IF EXISTS public._tmp_t2(uuid);
DROP FUNCTION IF EXISTS public._tmp_t3();
DROP FUNCTION IF EXISTS public._tmp_t5(uuid, numeric, text);
DROP FUNCTION IF EXISTS public._tmp_t7(uuid);
DROP FUNCTION IF EXISTS public._tmp_t9(uuid, numeric);

CREATE OR REPLACE FUNCTION public.close_cash_register_session(
  p_session_id uuid, p_declared_cash numeric, p_declared_pix numeric, p_declared_credit numeric,
  p_declared_debit numeric, p_declared_voucher numeric, p_withdrawals numeric,
  p_provider text DEFAULT NULL, p_batch text DEFAULT NULL, p_notes text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE s public.cash_register_sessions; v_until timestamptz := now(); r record; diff numeric;
  v_supplies numeric; v_withdrawals numeric; v_methods jsonb;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sessão expirada' USING ERRCODE='42501'; END IF;
  SELECT * INTO s FROM public.cash_register_sessions WHERE id = p_session_id FOR UPDATE;
  IF NOT FOUND OR s.restaurant_id IS DISTINCT FROM public.get_user_restaurant_id() THEN RAISE EXCEPTION 'Caixa não encontrado' USING ERRCODE='42501'; END IF;
  IF s.status <> 'open' THEN RAISE EXCEPTION 'Este caixa já foi fechado' USING ERRCODE='P0001'; END IF;
  IF least(p_declared_cash,p_declared_pix,p_declared_credit,p_declared_debit,p_declared_voucher) < 0 THEN RAISE EXCEPTION 'Valores não podem ser negativos'; END IF;

  SELECT coalesce(sum(m.amount) FILTER (WHERE m.kind='sangria'),0),
         coalesce(sum(m.amount) FILTER (WHERE m.kind='suprimento'),0)
    INTO v_withdrawals, v_supplies
    FROM public.cash_movements m WHERE m.session_id = s.id;

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

  SELECT jsonb_build_object(
    'dinheiro', coalesce(sum(v) FILTER (WHERE m='dinheiro'),0),
    'pix', coalesce(sum(v) FILTER (WHERE m='pix'),0),
    'credito', coalesce(sum(v) FILTER (WHERE m='credito'),0),
    'debito', coalesce(sum(v) FILTER (WHERE m='debito'),0),
    'voucher', coalesce(sum(v) FILTER (WHERE m='voucher'),0))
  INTO v_methods
  FROM (
    SELECT CASE c.pm WHEN 'cash' THEN 'dinheiro' WHEN 'credit' THEN 'credito' WHEN 'credit_card' THEN 'credito' WHEN 'cartao_credito' THEN 'credito'
           WHEN 'debit' THEN 'debito' WHEN 'debit_card' THEN 'debito' WHEN 'cartao_debito' THEN 'debito'
           WHEN 'vale' THEN 'voucher' WHEN 'meal_voucher' THEN 'voucher' ELSE c.pm END m, c.total v
    FROM (SELECT * FROM cls WHERE klass='received' AND pm <> 'misto') c
    UNION ALL
    SELECT e->>'method', (e->>'amount')::numeric
    FROM (SELECT * FROM cls WHERE klass='received' AND pm='misto') c2, jsonb_array_elements(c2.splits) e
  ) t;

  IF r.rev > 0 AND nullif(trim(coalesce(p_notes,'')),'') IS NULL THEN RAISE EXCEPTION 'Justifique os pedidos a revisar nas observações antes de fechar.'; END IF;
  diff := round((p_declared_cash - s.opening_amount + v_withdrawals - v_supplies + p_declared_pix + p_declared_credit + p_declared_debit + p_declared_voucher) - r.recv, 2);

  PERFORM set_config('app.cash_closing', s.id::text, true);
  UPDATE public.cash_register_sessions SET status='closed', closed_at=v_until, closed_by=auth.uid(), closing_until=v_until,
    system_orders_count=r.cnt, system_sales_total=r.sales, system_received_total=r.recv, system_pending_total=r.pend,
    system_external_total=r.ext, closing_cash_received=r.cash, closing_snapshot=r.snap, closing_method_totals=v_methods,
    declared_cash=p_declared_cash, declared_pix=p_declared_pix, declared_credit=p_declared_credit, declared_debit=p_declared_debit,
    declared_voucher=p_declared_voucher, withdrawals=v_withdrawals, supplies_total=v_supplies, card_machine_provider=nullif(trim(p_provider),''),
    card_machine_batch=nullif(trim(p_batch),''), difference_amount=diff, notes=nullif(trim(p_notes),'')
  WHERE id = s.id;
  PERFORM set_config('app.cash_closing', '', true);
  RETURN jsonb_build_object('difference',diff,'received',r.recv,'sales',r.sales,'orders',r.cnt,'until',v_until);
END $$;
REVOKE ALL ON FUNCTION public.close_cash_register_session(uuid,numeric,numeric,numeric,numeric,numeric,numeric,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.close_cash_register_session(uuid,numeric,numeric,numeric,numeric,numeric,numeric,text,text,text) TO authenticated;