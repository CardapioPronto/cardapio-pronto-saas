ALTER TABLE public.cash_register_sessions
  ADD COLUMN IF NOT EXISTS closing_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS closing_cash_received numeric,
  ADD COLUMN IF NOT EXISTS closing_until timestamptz;

CREATE OR REPLACE FUNCTION public.guard_cash_session_close() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  IF NEW.status = 'closed' AND OLD.status = 'open'
     AND coalesce(current_setting('app.cash_closing', true), '') <> OLD.id::text THEN
    RAISE EXCEPTION 'Use o fechamento do servidor para fechar o caixa' USING ERRCODE='42501';
  END IF;
  IF OLD.status = 'open' AND NEW.status = 'open' AND (
     NEW.system_sales_total IS DISTINCT FROM OLD.system_sales_total OR NEW.system_received_total IS DISTINCT FROM OLD.system_received_total
     OR NEW.closing_snapshot IS DISTINCT FROM OLD.closing_snapshot) THEN
    RAISE EXCEPTION 'Totais do sistema são calculados pelo servidor' USING ERRCODE='42501';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_cash_session_close() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS guard_cash_session_close_trg ON public.cash_register_sessions;
CREATE TRIGGER guard_cash_session_close_trg BEFORE UPDATE ON public.cash_register_sessions
  FOR EACH ROW EXECUTE FUNCTION public.guard_cash_session_close();

CREATE OR REPLACE FUNCTION public.close_cash_register_session(
  p_session_id uuid, p_declared_cash numeric, p_declared_pix numeric, p_declared_credit numeric,
  p_declared_debit numeric, p_declared_voucher numeric, p_withdrawals numeric,
  p_provider text DEFAULT NULL, p_batch text DEFAULT NULL, p_notes text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE s public.cash_register_sessions; v_until timestamptz := now(); r record; snap jsonb; diff numeric;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sessão expirada' USING ERRCODE='42501'; END IF;
  SELECT * INTO s FROM public.cash_register_sessions WHERE id = p_session_id FOR UPDATE;
  IF NOT FOUND OR s.restaurant_id IS DISTINCT FROM public.get_user_restaurant_id() THEN RAISE EXCEPTION 'Caixa não encontrado' USING ERRCODE='42501'; END IF;
  IF s.status <> 'open' THEN RAISE EXCEPTION 'Este caixa já foi fechado' USING ERRCODE='P0001'; END IF;
  IF least(p_declared_cash,p_declared_pix,p_declared_credit,p_declared_debit,p_declared_voucher,p_withdrawals) < 0 THEN RAISE EXCEPTION 'Valores não podem ser negativos'; END IF;

  WITH base AS (
    SELECT o.id, o.order_number, o.total, o.created_at, o.paid_at,
      lower(trim(coalesce(o.status,''))) st, lower(trim(coalesce(o.payment_status,''))) ps,
      lower(trim(coalesce(o.payment_provider,''))) pv, lower(trim(coalesce(o.source,''))) src,
      lower(trim(coalesce(o.payment_method,''))) pm,
      (o.created_at >= s.opened_at AND o.created_at < v_until) c_in,
      (o.paid_at >= s.opened_at AND o.paid_at < v_until) p_in
    FROM public.orders o WHERE o.restaurant_id = s.restaurant_id
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
        WHEN pm IN ('dinheiro','cash','pix','credito','credit','credit_card','cartao_credito','debito','debit','debit_card','cartao_debito','voucher','vale','meal_voucher') THEN 'received'
        ELSE 'review' END klass
    FROM base b
  )
  SELECT count(*) FILTER (WHERE c_in AND NOT canc) cnt,
    coalesce(sum(total) FILTER (WHERE c_in AND NOT canc),0) sales,
    coalesce(sum(total) FILTER (WHERE klass='received'),0) recv,
    coalesce(sum(total) FILTER (WHERE klass='received' AND pm IN ('dinheiro','cash')),0) cash,
    coalesce(sum(total) FILTER (WHERE klass='pending'),0) pend,
    coalesce(sum(total) FILTER (WHERE klass='external'),0) ext,
    count(*) FILTER (WHERE klass='review') rev,
    coalesce(jsonb_agg(jsonb_build_object('id',id,'order_number',order_number,'total',total,'paid_at',paid_at,'class',klass) ORDER BY created_at,id) FILTER (WHERE klass IS NOT NULL OR (c_in AND NOT canc)),'[]') snap
  INTO r FROM cls;

  IF r.rev > 0 AND nullif(trim(coalesce(p_notes,'')),'') IS NULL THEN RAISE EXCEPTION 'Justifique os pedidos a revisar nas observações antes de fechar.'; END IF;
  diff := round((p_declared_cash - s.opening_amount + p_withdrawals + p_declared_pix + p_declared_credit + p_declared_debit + p_declared_voucher) - r.recv, 2);

  PERFORM set_config('app.cash_closing', s.id::text, true);
  UPDATE public.cash_register_sessions SET status='closed', closed_at=v_until, closed_by=auth.uid(), closing_until=v_until,
    system_orders_count=r.cnt, system_sales_total=r.sales, system_received_total=r.recv, system_pending_total=r.pend,
    system_external_total=r.ext, closing_cash_received=r.cash, closing_snapshot=r.snap,
    declared_cash=p_declared_cash, declared_pix=p_declared_pix, declared_credit=p_declared_credit, declared_debit=p_declared_debit,
    declared_voucher=p_declared_voucher, withdrawals=p_withdrawals, card_machine_provider=nullif(trim(p_provider),''),
    card_machine_batch=nullif(trim(p_batch),''), difference_amount=diff, notes=nullif(trim(p_notes),'')
  WHERE id = s.id;
  PERFORM set_config('app.cash_closing', '', true);
  RETURN jsonb_build_object('difference',diff,'received',r.recv,'sales',r.sales,'orders',r.cnt,'until',v_until);
END $$;
REVOKE ALL ON FUNCTION public.close_cash_register_session(uuid,numeric,numeric,numeric,numeric,numeric,numeric,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.close_cash_register_session(uuid,numeric,numeric,numeric,numeric,numeric,numeric,text,text,text) TO authenticated;