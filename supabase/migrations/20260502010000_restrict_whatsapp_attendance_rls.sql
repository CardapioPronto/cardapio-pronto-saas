CREATE OR REPLACE FUNCTION public.user_has_whatsapp_permission(
  target_restaurant_id uuid,
  required_permission public.permission_type
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF target_restaurant_id IS NULL THEN
    RETURN false;
  END IF;

  IF public.is_super_admin(auth.uid()) THEN
    RETURN true;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = auth.uid()
      AND u.restaurant_id = target_restaurant_id
      AND u.user_type IN ('owner'::public.user_type, 'manager'::public.user_type)
  ) THEN
    RETURN true;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.employees e
    JOIN public.employee_permissions ep ON ep.employee_id = e.id
    WHERE e.user_id = auth.uid()
      AND e.restaurant_id = target_restaurant_id
      AND e.is_active = true
      AND ep.permission IN (required_permission, 'whatsapp_manage'::public.permission_type)
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.user_can_view_whatsapp_attendance(target_restaurant_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN public.user_has_whatsapp_permission(target_restaurant_id, 'whatsapp_manage'::public.permission_type)
      OR public.user_has_whatsapp_permission(target_restaurant_id, 'whatsapp_view_all_conversations'::public.permission_type)
      OR public.user_has_whatsapp_permission(target_restaurant_id, 'whatsapp_take_conversations'::public.permission_type)
      OR public.user_has_whatsapp_permission(target_restaurant_id, 'whatsapp_reply_as_human'::public.permission_type)
      OR public.user_has_whatsapp_permission(target_restaurant_id, 'whatsapp_manage_instances'::public.permission_type)
      OR public.user_has_whatsapp_permission(target_restaurant_id, 'whatsapp_configure_automation'::public.permission_type);
END;
$function$;

DROP POLICY IF EXISTS "Users can view their restaurant instances" ON public.whatsapp_instances;
DROP POLICY IF EXISTS "Users can insert instances to their restaurant" ON public.whatsapp_instances;
DROP POLICY IF EXISTS "Users can update their restaurant instances" ON public.whatsapp_instances;
DROP POLICY IF EXISTS "Users can delete their restaurant instances" ON public.whatsapp_instances;
DROP POLICY IF EXISTS "Super admins can access all instances" ON public.whatsapp_instances;

CREATE POLICY "Members can view permitted whatsapp instances"
ON public.whatsapp_instances
FOR SELECT
TO authenticated
USING (public.user_can_view_whatsapp_attendance(restaurant_id));

CREATE POLICY "Members can insert permitted whatsapp instances"
ON public.whatsapp_instances
FOR INSERT
TO authenticated
WITH CHECK (public.user_has_whatsapp_permission(restaurant_id, 'whatsapp_manage_instances'::public.permission_type));

CREATE POLICY "Members can update permitted whatsapp instances"
ON public.whatsapp_instances
FOR UPDATE
TO authenticated
USING (public.user_has_whatsapp_permission(restaurant_id, 'whatsapp_manage_instances'::public.permission_type))
WITH CHECK (public.user_has_whatsapp_permission(restaurant_id, 'whatsapp_manage_instances'::public.permission_type));

CREATE POLICY "Members can delete permitted whatsapp instances"
ON public.whatsapp_instances
FOR DELETE
TO authenticated
USING (public.user_has_whatsapp_permission(restaurant_id, 'whatsapp_manage_instances'::public.permission_type));

DROP POLICY IF EXISTS "Users can view their restaurant instance events" ON public.whatsapp_instance_events;
DROP POLICY IF EXISTS "Users can insert instance events" ON public.whatsapp_instance_events;
DROP POLICY IF EXISTS "Super admins can access all instance events" ON public.whatsapp_instance_events;

CREATE POLICY "Members can view permitted whatsapp instance events"
ON public.whatsapp_instance_events
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.whatsapp_instances wi
    WHERE wi.id = instance_id
      AND public.user_can_view_whatsapp_attendance(wi.restaurant_id)
  )
);

CREATE POLICY "Members can insert permitted whatsapp instance events"
ON public.whatsapp_instance_events
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.whatsapp_instances wi
    WHERE wi.id = instance_id
      AND public.user_has_whatsapp_permission(wi.restaurant_id, 'whatsapp_manage_instances'::public.permission_type)
  )
);

DROP POLICY IF EXISTS "Users can view their restaurant threads" ON public.conversation_threads;
DROP POLICY IF EXISTS "Users can insert threads to their restaurant" ON public.conversation_threads;
DROP POLICY IF EXISTS "Users can update their restaurant threads" ON public.conversation_threads;
DROP POLICY IF EXISTS "Super admins can access all threads" ON public.conversation_threads;

CREATE POLICY "Members can view permitted whatsapp threads"
ON public.conversation_threads
FOR SELECT
TO authenticated
USING (
  public.user_has_whatsapp_permission(restaurant_id, 'whatsapp_manage'::public.permission_type)
  OR public.user_has_whatsapp_permission(restaurant_id, 'whatsapp_view_all_conversations'::public.permission_type)
  OR assigned_to = auth.uid()
  OR (status = 'waiting_human' AND public.user_has_whatsapp_permission(restaurant_id, 'whatsapp_take_conversations'::public.permission_type))
);

CREATE POLICY "Members can update permitted whatsapp threads"
ON public.conversation_threads
FOR UPDATE
TO authenticated
USING (
  public.user_has_whatsapp_permission(restaurant_id, 'whatsapp_manage'::public.permission_type)
  OR public.user_has_whatsapp_permission(restaurant_id, 'whatsapp_take_conversations'::public.permission_type)
)
WITH CHECK (
  public.user_has_whatsapp_permission(restaurant_id, 'whatsapp_manage'::public.permission_type)
  OR public.user_has_whatsapp_permission(restaurant_id, 'whatsapp_take_conversations'::public.permission_type)
);

CREATE POLICY "Members can insert permitted whatsapp threads"
ON public.conversation_threads
FOR INSERT
TO authenticated
WITH CHECK (public.user_can_view_whatsapp_attendance(restaurant_id));

DROP POLICY IF EXISTS "Users can view their restaurant messages" ON public.conversation_messages;
DROP POLICY IF EXISTS "Users can insert messages to their restaurant" ON public.conversation_messages;
DROP POLICY IF EXISTS "Super admins can access all messages" ON public.conversation_messages;

CREATE POLICY "Members can view permitted whatsapp messages"
ON public.conversation_messages
FOR SELECT
TO authenticated
USING (
  public.user_has_whatsapp_permission(restaurant_id, 'whatsapp_manage'::public.permission_type)
  OR public.user_has_whatsapp_permission(restaurant_id, 'whatsapp_view_all_conversations'::public.permission_type)
  OR EXISTS (
    SELECT 1 FROM public.conversation_threads ct
    WHERE ct.id = thread_id
      AND (
        ct.assigned_to = auth.uid()
        OR (ct.status = 'waiting_human' AND public.user_has_whatsapp_permission(ct.restaurant_id, 'whatsapp_take_conversations'::public.permission_type))
      )
  )
);

CREATE POLICY "Members can insert permitted whatsapp messages"
ON public.conversation_messages
FOR INSERT
TO authenticated
WITH CHECK (public.user_has_whatsapp_permission(restaurant_id, 'whatsapp_reply_as_human'::public.permission_type));

DROP POLICY IF EXISTS "Users can view their restaurant assignments" ON public.conversation_assignments;
DROP POLICY IF EXISTS "Users can insert assignments" ON public.conversation_assignments;
DROP POLICY IF EXISTS "Super admins can access all assignments" ON public.conversation_assignments;

CREATE POLICY "Members can view permitted whatsapp assignments"
ON public.conversation_assignments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_threads ct
    WHERE ct.id = thread_id
      AND public.user_can_view_whatsapp_attendance(ct.restaurant_id)
  )
);

CREATE POLICY "Members can insert permitted whatsapp assignments"
ON public.conversation_assignments
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.conversation_threads ct
    WHERE ct.id = thread_id
      AND public.user_has_whatsapp_permission(ct.restaurant_id, 'whatsapp_take_conversations'::public.permission_type)
  )
);

DROP POLICY IF EXISTS "Users can view their restaurant notes" ON public.conversation_notes;
DROP POLICY IF EXISTS "Users can insert notes" ON public.conversation_notes;
DROP POLICY IF EXISTS "Users can update their own notes" ON public.conversation_notes;
DROP POLICY IF EXISTS "Users can delete their own notes" ON public.conversation_notes;
DROP POLICY IF EXISTS "Super admins can access all notes" ON public.conversation_notes;

CREATE POLICY "Members can view permitted whatsapp notes"
ON public.conversation_notes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_threads ct
    WHERE ct.id = thread_id
      AND public.user_can_view_whatsapp_attendance(ct.restaurant_id)
  )
);

CREATE POLICY "Members can insert permitted whatsapp notes"
ON public.conversation_notes
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.conversation_threads ct
    WHERE ct.id = thread_id
      AND public.user_can_view_whatsapp_attendance(ct.restaurant_id)
  )
);

CREATE POLICY "Members can update own whatsapp notes"
ON public.conversation_notes
FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Members can delete own whatsapp notes"
ON public.conversation_notes
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can view their restaurant automation" ON public.automation_settings;
DROP POLICY IF EXISTS "Users can insert automation for their restaurant" ON public.automation_settings;
DROP POLICY IF EXISTS "Users can update their restaurant automation" ON public.automation_settings;
DROP POLICY IF EXISTS "Super admins can access all automation" ON public.automation_settings;

CREATE POLICY "Members can view permitted whatsapp automation"
ON public.automation_settings
FOR SELECT
TO authenticated
USING (public.user_can_view_whatsapp_attendance(restaurant_id));

CREATE POLICY "Members can insert permitted whatsapp automation"
ON public.automation_settings
FOR INSERT
TO authenticated
WITH CHECK (public.user_has_whatsapp_permission(restaurant_id, 'whatsapp_configure_automation'::public.permission_type));

CREATE POLICY "Members can update permitted whatsapp automation"
ON public.automation_settings
FOR UPDATE
TO authenticated
USING (public.user_has_whatsapp_permission(restaurant_id, 'whatsapp_configure_automation'::public.permission_type))
WITH CHECK (public.user_has_whatsapp_permission(restaurant_id, 'whatsapp_configure_automation'::public.permission_type));

DROP POLICY IF EXISTS "Users can view their restaurant handoff rules" ON public.ai_handoff_rules;
DROP POLICY IF EXISTS "Users can insert handoff rules" ON public.ai_handoff_rules;
DROP POLICY IF EXISTS "Users can update their restaurant handoff rules" ON public.ai_handoff_rules;
DROP POLICY IF EXISTS "Users can delete their restaurant handoff rules" ON public.ai_handoff_rules;
DROP POLICY IF EXISTS "Super admins can access all handoff rules" ON public.ai_handoff_rules;

CREATE POLICY "Members can view permitted whatsapp handoff rules"
ON public.ai_handoff_rules
FOR SELECT
TO authenticated
USING (public.user_can_view_whatsapp_attendance(restaurant_id));

CREATE POLICY "Members can insert permitted whatsapp handoff rules"
ON public.ai_handoff_rules
FOR INSERT
TO authenticated
WITH CHECK (public.user_has_whatsapp_permission(restaurant_id, 'whatsapp_configure_automation'::public.permission_type));

CREATE POLICY "Members can update permitted whatsapp handoff rules"
ON public.ai_handoff_rules
FOR UPDATE
TO authenticated
USING (public.user_has_whatsapp_permission(restaurant_id, 'whatsapp_configure_automation'::public.permission_type))
WITH CHECK (public.user_has_whatsapp_permission(restaurant_id, 'whatsapp_configure_automation'::public.permission_type));

CREATE POLICY "Members can delete permitted whatsapp handoff rules"
ON public.ai_handoff_rules
FOR DELETE
TO authenticated
USING (public.user_has_whatsapp_permission(restaurant_id, 'whatsapp_configure_automation'::public.permission_type));
