-- Restrict raw delivery orders access to the owning restaurant.
-- Public checkout/tracking continues through SECURITY DEFINER RPCs with validated/sanitized payloads.

DROP POLICY IF EXISTS "Anyone can create delivery orders" ON public.delivery_orders;
DROP POLICY IF EXISTS "Anyone can view delivery order by id" ON public.delivery_orders;

DROP POLICY IF EXISTS "Restaurant can view own delivery orders" ON public.delivery_orders;
CREATE POLICY "Restaurant can view own delivery orders"
ON public.delivery_orders
FOR SELECT
TO authenticated
USING (
  restaurant_id = public.get_user_restaurant_id()
  OR public.is_super_admin(auth.uid())
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'delivery_orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.delivery_orders;
  END IF;
END
$$;
