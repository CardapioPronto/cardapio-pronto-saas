-- Restrict delivery status history to the owning restaurant and remove direct Realtime publication.
-- Public tracking continues through get_public_order_tracking(), which returns a sanitized status timeline.

DROP POLICY IF EXISTS "Anyone can view status history" ON public.delivery_order_status_history;

DROP POLICY IF EXISTS "Restaurant can view own delivery status history" ON public.delivery_order_status_history;
CREATE POLICY "Restaurant can view own delivery status history"
ON public.delivery_order_status_history
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.delivery_orders d
    WHERE d.id = delivery_order_status_history.delivery_order_id
      AND (
        d.restaurant_id = public.get_user_restaurant_id()
        OR public.is_super_admin(auth.uid())
      )
  )
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'delivery_order_status_history'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.delivery_order_status_history;
  END IF;
END
$$;
