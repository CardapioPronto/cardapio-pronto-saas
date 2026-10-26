DO $$ DECLARE d text; BEGIN
  d := pg_get_functiondef('public.user_has_restaurant_permission(uuid,public.permission_type)'::regprocedure);
  d := replace(d, '''pdv_access''::public.permission_type,', '''pdv_access''::public.permission_type, ''cash_manage''::public.permission_type,');
  EXECUTE d;
END $$;

INSERT INTO public.employee_permissions (employee_id, permission, granted_by)
SELECT ep.employee_id, 'cash_manage', ep.granted_by FROM public.employee_permissions ep
WHERE ep.permission = 'pdv_access'
  AND NOT EXISTS (SELECT 1 FROM public.employee_permissions x WHERE x.employee_id = ep.employee_id AND x.permission = 'cash_manage');

DROP POLICY IF EXISTS "Restaurant staff can open cash sessions" ON public.cash_register_sessions;
DROP POLICY IF EXISTS "Restaurant staff can close open cash sessions" ON public.cash_register_sessions;
CREATE POLICY "Cash managers can open cash sessions" ON public.cash_register_sessions FOR INSERT TO authenticated
  WITH CHECK (restaurant_id = public.get_user_restaurant_id() AND public.user_has_restaurant_permission(restaurant_id, 'cash_manage'));
CREATE POLICY "Cash managers can update open cash sessions" ON public.cash_register_sessions FOR UPDATE TO authenticated
  USING (restaurant_id = public.get_user_restaurant_id() AND status = 'open' AND public.user_has_restaurant_permission(restaurant_id, 'cash_manage'))
  WITH CHECK (restaurant_id = public.get_user_restaurant_id());

CREATE TABLE public.cash_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  order_id uuid,
  session_id uuid,
  actor_id uuid,
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.cash_audit_events TO authenticated;
GRANT ALL ON public.cash_audit_events TO service_role;
ALTER TABLE public.cash_audit_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Managers view cash audit" ON public.cash_audit_events FOR SELECT TO authenticated
  USING (public.user_has_restaurant_permission(restaurant_id, 'reports_view') OR public.user_has_restaurant_permission(restaurant_id, 'cash_manage'));
CREATE INDEX cash_audit_events_restaurant_idx ON public.cash_audit_events (restaurant_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.log_cash_audit_event() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF TG_TABLE_NAME = 'orders' THEN
    INSERT INTO public.cash_audit_events(restaurant_id,event_type,order_id,actor_id,old_value,new_value)
    VALUES (NEW.restaurant_id,'payment_method_changed',NEW.id,auth.uid(),
      jsonb_build_object('payment_method',OLD.payment_method,'payment_status',OLD.payment_status),
      jsonb_build_object('payment_method',NEW.payment_method,'payment_status',NEW.payment_status));
  ELSE
    INSERT INTO public.cash_audit_events(restaurant_id,event_type,session_id,actor_id,new_value)
    VALUES (NEW.restaurant_id,'cash_session_closed',NEW.id,auth.uid(),
      jsonb_build_object('difference',NEW.difference_amount,'received',NEW.system_received_total,'notes',NEW.notes));
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.log_cash_audit_event() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER audit_order_payment_method AFTER UPDATE OF payment_method ON public.orders
  FOR EACH ROW WHEN (OLD.payment_method IS DISTINCT FROM NEW.payment_method AND OLD.payment_method IS NOT NULL)
  EXECUTE FUNCTION public.log_cash_audit_event();
CREATE TRIGGER audit_cash_session_closed AFTER UPDATE OF status ON public.cash_register_sessions
  FOR EACH ROW WHEN (OLD.status = 'open' AND NEW.status = 'closed')
  EXECUTE FUNCTION public.log_cash_audit_event();