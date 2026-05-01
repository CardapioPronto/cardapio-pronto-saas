ALTER TYPE public.permission_type ADD VALUE IF NOT EXISTS 'orders_metrics_view';

CREATE OR REPLACE FUNCTION public.get_user_restaurant_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_restaurant_id uuid;
BEGIN
  SELECT e.restaurant_id INTO user_restaurant_id
  FROM public.employees e
  WHERE e.user_id = auth.uid()
    AND e.is_active = true
  LIMIT 1;

  IF user_restaurant_id IS NOT NULL THEN
    RETURN user_restaurant_id;
  END IF;

  SELECT u.restaurant_id INTO user_restaurant_id
  FROM public.users u
  WHERE u.id = auth.uid();

  RETURN user_restaurant_id;
END;
$function$;

DROP POLICY IF EXISTS "Users can view their restaurant's order items" ON public.order_items;
DROP POLICY IF EXISTS "Users can insert order items to their restaurant orders" ON public.order_items;
DROP POLICY IF EXISTS "Users can update their restaurant's order items" ON public.order_items;
DROP POLICY IF EXISTS "Users can delete their restaurant's order items" ON public.order_items;
DROP POLICY IF EXISTS "Super admins can access all order items" ON public.order_items;

CREATE POLICY "Users can view their restaurant's order items"
ON public.order_items
FOR SELECT
TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.orders o
    WHERE o.id = order_items.order_id
      AND (
        o.restaurant_id = public.get_user_restaurant_id()
        OR EXISTS (
          SELECT 1
          FROM public.employees e
          WHERE e.user_id = auth.uid()
            AND e.restaurant_id = o.restaurant_id
            AND e.is_active = true
        )
      )
  )
);

CREATE POLICY "Users can insert order items to their restaurant orders"
ON public.order_items
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_super_admin(auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.orders o
    WHERE o.id = order_items.order_id
      AND (
        o.restaurant_id = public.get_user_restaurant_id()
        OR EXISTS (
          SELECT 1
          FROM public.employees e
          WHERE e.user_id = auth.uid()
            AND e.restaurant_id = o.restaurant_id
            AND e.is_active = true
        )
      )
  )
);

CREATE POLICY "Users can update their restaurant's order items"
ON public.order_items
FOR UPDATE
TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.orders o
    WHERE o.id = order_items.order_id
      AND (
        o.restaurant_id = public.get_user_restaurant_id()
        OR EXISTS (
          SELECT 1
          FROM public.employees e
          WHERE e.user_id = auth.uid()
            AND e.restaurant_id = o.restaurant_id
            AND e.is_active = true
        )
      )
  )
)
WITH CHECK (
  public.is_super_admin(auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.orders o
    WHERE o.id = order_items.order_id
      AND (
        o.restaurant_id = public.get_user_restaurant_id()
        OR EXISTS (
          SELECT 1
          FROM public.employees e
          WHERE e.user_id = auth.uid()
            AND e.restaurant_id = o.restaurant_id
            AND e.is_active = true
        )
      )
  )
);

CREATE POLICY "Users can delete their restaurant's order items"
ON public.order_items
FOR DELETE
TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.orders o
    WHERE o.id = order_items.order_id
      AND (
        o.restaurant_id = public.get_user_restaurant_id()
        OR EXISTS (
          SELECT 1
          FROM public.employees e
          WHERE e.user_id = auth.uid()
            AND e.restaurant_id = o.restaurant_id
            AND e.is_active = true
        )
      )
  )
);
