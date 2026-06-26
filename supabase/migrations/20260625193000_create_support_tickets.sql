-- M8: In-app support tickets with operational context.

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE SET NULL,
  requester_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  requester_name text,
  requester_email text,
  screen_title text NOT NULL,
  pathname text NOT NULL,
  subject text NOT NULL,
  message text NOT NULL,
  context text NOT NULL,
  priority text NOT NULL DEFAULT 'normal',
  status text NOT NULL DEFAULT 'open',
  source text NOT NULL DEFAULT 'in_app',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT support_tickets_priority_check
    CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  CONSTRAINT support_tickets_status_check
    CHECK (status IN ('open', 'in_progress', 'waiting_customer', 'resolved', 'closed')),
  CONSTRAINT support_tickets_subject_check
    CHECK (length(trim(subject)) BETWEEN 3 AND 160),
  CONSTRAINT support_tickets_message_check
    CHECK (length(trim(message)) BETWEEN 3 AND 5000),
  CONSTRAINT support_tickets_context_check
    CHECK (length(trim(context)) BETWEEN 10 AND 12000)
);

CREATE INDEX IF NOT EXISTS support_tickets_restaurant_created_idx
  ON public.support_tickets (restaurant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS support_tickets_status_priority_idx
  ON public.support_tickets (status, priority, created_at DESC);

CREATE INDEX IF NOT EXISTS support_tickets_requester_created_idx
  ON public.support_tickets (requester_id, created_at DESC);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Restaurant staff can view own support tickets"
  ON public.support_tickets;
CREATE POLICY "Restaurant staff can view own support tickets"
ON public.support_tickets
FOR SELECT
TO authenticated
USING (
  requester_id = auth.uid()
  OR restaurant_id = public.get_user_restaurant_id()
  OR public.is_super_admin(auth.uid())
);

DROP POLICY IF EXISTS "Authenticated users can create support tickets"
  ON public.support_tickets;
CREATE POLICY "Authenticated users can create support tickets"
ON public.support_tickets
FOR INSERT
TO authenticated
WITH CHECK (
  requester_id = auth.uid()
  AND (
    restaurant_id IS NULL
    OR restaurant_id = public.get_user_restaurant_id()
    OR public.is_super_admin(auth.uid())
  )
);

DROP POLICY IF EXISTS "Super admins can manage support tickets"
  ON public.support_tickets;
CREATE POLICY "Super admins can manage support tickets"
ON public.support_tickets
FOR UPDATE
TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

DROP TRIGGER IF EXISTS update_support_tickets_updated_at
  ON public.support_tickets;
CREATE TRIGGER update_support_tickets_updated_at
BEFORE UPDATE ON public.support_tickets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

GRANT SELECT, INSERT, UPDATE ON public.support_tickets TO authenticated;

COMMENT ON TABLE public.support_tickets IS
  'In-app support tickets opened by restaurants with screen, browser and operational context.';
