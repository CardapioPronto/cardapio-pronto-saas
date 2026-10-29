CREATE OR REPLACE FUNCTION public._tmp_t7(p_session_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE s public.cash_register_sessions; v_until timestamptz := now(); v_methods jsonb := '{}'::jsonb; v_supplies numeric := 0; v_withdrawals numeric := 0;
BEGIN
  SELECT * INTO s FROM public.cash_register_sessions WHERE id = p_session_id;
  PERFORM set_config('app.cash_closing', s.id::text, true);
  UPDATE public.cash_register_sessions SET status='closed', closed_at=v_until, closed_by=auth.uid(), closing_until=v_until,
    closing_method_totals=v_methods, withdrawals=v_withdrawals, supplies_total=v_supplies
  WHERE id = s.id;
  PERFORM set_config('app.cash_closing', '', true);
  RETURN jsonb_build_object('ok', true);
END $$;