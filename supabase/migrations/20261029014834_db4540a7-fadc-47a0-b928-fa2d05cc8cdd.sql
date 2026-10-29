CREATE OR REPLACE FUNCTION public._tmp_t5(p_session_id uuid, p_declared_cash numeric, p_notes text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE s public.cash_register_sessions; r record; diff numeric; v_supplies numeric := 0; v_withdrawals numeric := 0;
BEGIN
  SELECT * INTO s FROM public.cash_register_sessions WHERE id = p_session_id;
  SELECT 1 cnt, 0::numeric sales, 0::numeric recv, 0::numeric pend, 0::numeric ext, 0 rev, 0::numeric cash, '[]'::jsonb snap INTO r;
  IF r.rev > 0 AND nullif(trim(coalesce(p_notes,'')),'') IS NULL THEN RAISE EXCEPTION 'Justifique'; END IF;
  diff := round((p_declared_cash - s.opening_amount + v_withdrawals - v_supplies) - r.recv, 2);
  RETURN jsonb_build_object('difference',diff,'received',r.recv);
END $$;