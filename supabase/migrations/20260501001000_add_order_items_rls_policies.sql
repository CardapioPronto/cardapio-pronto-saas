ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

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
  order_id IN (
    SELECT id
    FROM public.orders
    WHERE restaurant_id = public.get_user_restaurant_id()
  )
);

CREATE POLICY "Users can insert order items to their restaurant orders"
ON public.order_items
FOR INSERT
TO authenticated
WITH CHECK (
  order_id IN (
    SELECT id
    FROM public.orders
    WHERE restaurant_id = public.get_user_restaurant_id()
  )
);

CREATE POLICY "Users can update their restaurant's order items"
ON public.order_items
FOR UPDATE
TO authenticated
USING (
  order_id IN (
    SELECT id
    FROM public.orders
    WHERE restaurant_id = public.get_user_restaurant_id()
  )
)
WITH CHECK (
  order_id IN (
    SELECT id
    FROM public.orders
    WHERE restaurant_id = public.get_user_restaurant_id()
  )
);

CREATE POLICY "Users can delete their restaurant's order items"
ON public.order_items
FOR DELETE
TO authenticated
USING (
  order_id IN (
    SELECT id
    FROM public.orders
    WHERE restaurant_id = public.get_user_restaurant_id()
  )
);

CREATE POLICY "Super admins can access all order items"
ON public.order_items
FOR ALL
TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));
