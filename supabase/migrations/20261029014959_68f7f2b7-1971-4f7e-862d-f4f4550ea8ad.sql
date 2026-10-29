CREATE OR REPLACE FUNCTION public._tmp_t9(p_session_id uuid, p_declared_cash numeric)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE s public.cash_register_sessions; v_until timestamptz := now(); r record; v_methods jsonb := '{}'::jsonb;
BEGIN
  SELECT * INTO s FROM public.cash_register_sessions WHERE id = p_session_id;
  SELECT 1 cnt, 0::numeric sales, 0::numeric recv, 0::numeric pend, 0::numeric ext, 0 rev, 0::numeric cash, '[]'::jsonb snap INTO r;
  UPDATE public.cash_register_sessions SET status='closed', closed_at=v_until, closed_by=auth.uid(), closing_until=v_until,
    system_orders_count=r.cnt, system_sales_total=r.sales, system_received_total=r.recv, system_pending_total=r.pend,
    system_external_total=r.ext, closing_cash_received=r.cash, closing_snapshot=r.snap, closing_method_totals=v_methods,
    declared_cash=p_declared_cash
  WHERE id = s.id;
  RETURN jsonb_build_object('ok', true);
END $$;