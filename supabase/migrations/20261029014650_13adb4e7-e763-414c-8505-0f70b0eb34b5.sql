CREATE OR REPLACE FUNCTION public._tmp_t1(p_session_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE s public.cash_register_sessions; v_supplies numeric; v_withdrawals numeric;
BEGIN
  SELECT * INTO s FROM public.cash_register_sessions WHERE id = p_session_id;
  SELECT coalesce(sum(m.amount) FILTER (WHERE m.kind='sangria'),0),
         coalesce(sum(m.amount) FILTER (WHERE m.kind='suprimento'),0)
    INTO v_withdrawals, v_supplies
    FROM public.cash_movements m WHERE m.session_id = s.id;
  RETURN jsonb_build_object('w', v_withdrawals, 's', v_supplies);
END $$;