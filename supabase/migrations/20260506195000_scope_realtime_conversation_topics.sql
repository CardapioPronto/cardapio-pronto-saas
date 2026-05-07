-- Scope private Realtime channel joins for WhatsApp/conversation topics to the user's restaurant.
-- Postgres Changes still rely on source-table RLS; this policy protects channel authorization.

CREATE OR REPLACE FUNCTION public.user_can_access_conversation_realtime_topic(p_topic text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_matches text[];
  v_restaurant_id uuid;
  v_thread_id uuid;
BEGIN
  IF auth.uid() IS NULL OR p_topic IS NULL THEN
    RETURN false;
  END IF;

  IF public.is_super_admin(auth.uid()) THEN
    RETURN true;
  END IF;

  v_matches := regexp_match(p_topic, '^threads-([0-9a-fA-F-]{36})$');
  IF v_matches IS NOT NULL THEN
    v_restaurant_id := v_matches[1]::uuid;
    RETURN public.user_can_view_whatsapp_attendance(v_restaurant_id);
  END IF;

  v_matches := regexp_match(p_topic, '^messages-([0-9a-fA-F-]{36})-([0-9a-fA-F-]{36})$');
  IF v_matches IS NOT NULL THEN
    v_restaurant_id := v_matches[1]::uuid;
    v_thread_id := v_matches[2]::uuid;

    RETURN EXISTS (
      SELECT 1
      FROM public.conversation_threads ct
      WHERE ct.id = v_thread_id
        AND ct.restaurant_id = v_restaurant_id
        AND public.user_can_view_whatsapp_attendance(ct.restaurant_id)
    );
  END IF;

  v_matches := regexp_match(p_topic, '^whatsapp-chat-([0-9a-fA-F-]{36})$');
  IF v_matches IS NOT NULL THEN
    v_restaurant_id := v_matches[1]::uuid;
    RETURN public.user_can_view_whatsapp_attendance(v_restaurant_id);
  END IF;

  RETURN false;
END;
$$;

ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can receive restaurant conversation realtime"
ON realtime.messages;
CREATE POLICY "Authenticated users can receive restaurant conversation realtime"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  public.user_can_access_conversation_realtime_topic((SELECT realtime.topic()))
);

DROP POLICY IF EXISTS "Authenticated users can send restaurant conversation realtime"
ON realtime.messages;
CREATE POLICY "Authenticated users can send restaurant conversation realtime"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  public.user_can_access_conversation_realtime_topic((SELECT realtime.topic()))
);
