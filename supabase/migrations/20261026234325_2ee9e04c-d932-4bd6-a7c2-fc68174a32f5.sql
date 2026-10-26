CREATE TABLE public.cash_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES public.cash_register_sessions(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('sangria','suprimento')),
  amount numeric(12,2) NOT NULL CHECK (amount > 0 AND amount <= 1000000),
  reason text NOT NULL CHECK (length(trim(reason)) BETWEEN 3 AND 300),
  receipt_reference text CHECK (receipt_reference IS NULL OR length(receipt_reference) <= 120),
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.cash_movements TO authenticated;
GRANT ALL ON public.cash_movements TO service_role;
ALTER TABLE public.cash_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Cash staff view movements" ON public.cash_movements FOR SELECT TO authenticated
  USING (public.user_has_restaurant_permission(restaurant_id, 'reports_view') OR public.user_has_restaurant_permission(restaurant_id, 'cash_manage'));
CREATE POLICY "Cash managers add movements to open session" ON public.cash_movements FOR INSERT TO authenticated
  WITH CHECK (
    restaurant_id = public.get_user_restaurant_id()
    AND created_by = auth.uid()
    AND public.user_has_restaurant_permission(restaurant_id, 'cash_manage')
    AND EXISTS (SELECT 1 FROM public.cash_register_sessions s WHERE s.id = session_id AND s.restaurant_id = cash_movements.restaurant_id AND s.status = 'open')
  );
CREATE INDEX cash_movements_session_idx ON public.cash_movements (session_id, created_at);
CREATE INDEX cash_movements_restaurant_idx ON public.cash_movements (restaurant_id, created_at DESC);

ALTER TABLE public.cash_register_sessions ADD COLUMN IF NOT EXISTS supplies_total numeric(12,2);

DO $$ DECLARE d text; BEGIN
  d := pg_get_functiondef('public.close_cash_register_session(uuid,numeric,numeric,numeric,numeric,numeric,numeric,text,text,text)'::regprocedure);
  d := replace(d, 'diff numeric;', 'diff numeric; v_out numeric; v_in numeric;');
  d := replace(d, 'diff := round((p_declared_cash - s.opening_amount + p_withdrawals',
    'SELECT coalesce(sum(m.amount) FILTER (WHERE m.kind=''sangria''),0), coalesce(sum(m.amount) FILTER (WHERE m.kind=''suprimento''),0) INTO v_out, v_in FROM public.cash_movements m WHERE m.session_id = s.id; diff := round((p_declared_cash - s.opening_amount - v_in + v_out');
  d := replace(d, 'withdrawals=p_withdrawals,', 'withdrawals=v_out, supplies_total=v_in,');
  IF position('v_out' in d) = 0 OR position('supplies_total=v_in' in d) = 0 THEN RAISE EXCEPTION 'close function patch failed'; END IF;
  EXECUTE d;
END $$;