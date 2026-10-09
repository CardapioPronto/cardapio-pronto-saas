CREATE TABLE public.cash_register_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  opened_by uuid NOT NULL DEFAULT auth.uid(),
  opened_at timestamptz NOT NULL DEFAULT now(),
  opening_amount numeric(12,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'open',
  closed_by uuid,
  closed_at timestamptz,
  system_orders_count integer NOT NULL DEFAULT 0,
  system_sales_total numeric(12,2) NOT NULL DEFAULT 0,
  declared_cash numeric(12,2) NOT NULL DEFAULT 0,
  declared_pix numeric(12,2) NOT NULL DEFAULT 0,
  declared_credit numeric(12,2) NOT NULL DEFAULT 0,
  declared_debit numeric(12,2) NOT NULL DEFAULT 0,
  declared_voucher numeric(12,2) NOT NULL DEFAULT 0,
  withdrawals numeric(12,2) NOT NULL DEFAULT 0,
  card_machine_provider text,
  card_machine_batch text,
  difference_amount numeric(12,2) NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.cash_register_sessions TO authenticated;
GRANT ALL ON public.cash_register_sessions TO service_role;

ALTER TABLE public.cash_register_sessions ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX cash_register_one_open_per_restaurant
  ON public.cash_register_sessions (restaurant_id) WHERE status = 'open';
CREATE INDEX cash_register_sessions_restaurant_opened_idx
  ON public.cash_register_sessions (restaurant_id, opened_at DESC);

CREATE POLICY "Restaurant staff can view cash sessions"
  ON public.cash_register_sessions FOR SELECT TO authenticated
  USING (restaurant_id = public.get_user_restaurant_id());

CREATE POLICY "Restaurant staff can open cash sessions"
  ON public.cash_register_sessions FOR INSERT TO authenticated
  WITH CHECK (restaurant_id = public.get_user_restaurant_id() AND opened_by = auth.uid() AND status = 'open');

CREATE POLICY "Restaurant staff can close open cash sessions"
  ON public.cash_register_sessions FOR UPDATE TO authenticated
  USING (restaurant_id = public.get_user_restaurant_id() AND status = 'open')
  WITH CHECK (restaurant_id = public.get_user_restaurant_id());

CREATE OR REPLACE FUNCTION public.validate_cash_register_session()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status NOT IN ('open', 'closed') THEN
    RAISE EXCEPTION 'Status de caixa invalido';
  END IF;
  IF NEW.opening_amount < 0 OR NEW.declared_cash < 0 OR NEW.declared_pix < 0
     OR NEW.declared_credit < 0 OR NEW.declared_debit < 0 OR NEW.declared_voucher < 0
     OR NEW.withdrawals < 0 THEN
    RAISE EXCEPTION 'Valores do caixa nao podem ser negativos';
  END IF;
  IF NEW.status = 'closed' THEN
    NEW.closed_at := COALESCE(NEW.closed_at, now());
    NEW.closed_by := COALESCE(NEW.closed_by, auth.uid());
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_cash_register_session_trg
  BEFORE INSERT OR UPDATE ON public.cash_register_sessions
  FOR EACH ROW EXECUTE FUNCTION public.validate_cash_register_session();