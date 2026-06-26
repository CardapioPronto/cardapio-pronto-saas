-- M8: Support ticket timeline for status changes and operational history.

CREATE TABLE IF NOT EXISTS public.support_ticket_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  actor_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  actor_name text,
  actor_email text,
  actor_role text NOT NULL DEFAULT 'system',
  message text,
  old_status text,
  new_status text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT support_ticket_events_type_check
    CHECK (event_type IN ('created', 'status_changed', 'comment', 'system_note')),
  CONSTRAINT support_ticket_events_actor_role_check
    CHECK (actor_role IN ('customer', 'support', 'system')),
  CONSTRAINT support_ticket_events_old_status_check
    CHECK (old_status IS NULL OR old_status IN ('open', 'in_progress', 'waiting_customer', 'resolved', 'closed')),
  CONSTRAINT support_ticket_events_new_status_check
    CHECK (new_status IS NULL OR new_status IN ('open', 'in_progress', 'waiting_customer', 'resolved', 'closed'))
);

CREATE INDEX IF NOT EXISTS support_ticket_events_ticket_created_idx
  ON public.support_ticket_events (ticket_id, created_at DESC);

ALTER TABLE public.support_ticket_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_ticket_events FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Ticket participants can view support ticket events"
  ON public.support_ticket_events;
CREATE POLICY "Ticket participants can view support ticket events"
ON public.support_ticket_events
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.support_tickets st
    WHERE st.id = ticket_id
      AND (
        st.requester_id = auth.uid()
        OR st.restaurant_id = public.get_user_restaurant_id()
        OR public.is_super_admin(auth.uid())
      )
  )
);

DROP POLICY IF EXISTS "Ticket participants can create support ticket events"
  ON public.support_ticket_events;
CREATE POLICY "Ticket participants can create support ticket events"
ON public.support_ticket_events
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.support_tickets st
    WHERE st.id = ticket_id
      AND (
        st.requester_id = auth.uid()
        OR st.restaurant_id = public.get_user_restaurant_id()
        OR public.is_super_admin(auth.uid())
      )
  )
);

CREATE OR REPLACE FUNCTION public.record_support_ticket_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_actor_id uuid := auth.uid();
  actor_profile record;
  actor_is_support boolean := false;
BEGIN
  IF current_actor_id IS NOT NULL THEN
    SELECT name, email INTO actor_profile
    FROM public.users
    WHERE id = current_actor_id;

    actor_is_support := public.is_super_admin(current_actor_id);
  END IF;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.support_ticket_events (
      ticket_id,
      event_type,
      actor_id,
      actor_name,
      actor_email,
      actor_role,
      message,
      new_status,
      metadata
    )
    VALUES (
      NEW.id,
      'created',
      COALESCE(current_actor_id, NEW.requester_id),
      COALESCE(actor_profile.name, NEW.requester_name),
      COALESCE(actor_profile.email, NEW.requester_email),
      CASE WHEN actor_is_support THEN 'support' ELSE 'customer' END,
      'Chamado aberto pelo app.',
      NEW.status,
      jsonb_build_object(
        'screen_title', NEW.screen_title,
        'pathname', NEW.pathname,
        'priority', NEW.priority,
        'source', NEW.source
      )
    );

    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.support_ticket_events (
      ticket_id,
      event_type,
      actor_id,
      actor_name,
      actor_email,
      actor_role,
      message,
      old_status,
      new_status
    )
    VALUES (
      NEW.id,
      'status_changed',
      current_actor_id,
      actor_profile.name,
      actor_profile.email,
      CASE WHEN actor_is_support THEN 'support' ELSE 'system' END,
      'Status do chamado atualizado.',
      OLD.status,
      NEW.status
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS support_ticket_created_event
  ON public.support_tickets;
CREATE TRIGGER support_ticket_created_event
AFTER INSERT ON public.support_tickets
FOR EACH ROW
EXECUTE FUNCTION public.record_support_ticket_event();

DROP TRIGGER IF EXISTS support_ticket_status_changed_event
  ON public.support_tickets;
CREATE TRIGGER support_ticket_status_changed_event
AFTER UPDATE OF status ON public.support_tickets
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION public.record_support_ticket_event();

GRANT SELECT, INSERT ON public.support_ticket_events TO authenticated;

COMMENT ON TABLE public.support_ticket_events IS
  'Timeline of support ticket creation, status changes and future comments.';
