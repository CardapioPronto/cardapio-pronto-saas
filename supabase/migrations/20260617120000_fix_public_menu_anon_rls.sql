-- Keep internal helper functions unavailable to anon while allowing the
-- storefront to read only the public data needed for active menus.

ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_menu_config ENABLE ROW LEVEL SECURITY;

-- restaurants ---------------------------------------------------------------
DROP POLICY IF EXISTS "Super admins can access all restaurants" ON public.restaurants;
CREATE POLICY "Super admins can access all restaurants"
ON public.restaurants
FOR ALL
TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can view their own restaurants" ON public.restaurants;
CREATE POLICY "Users can view their own restaurants"
ON public.restaurants
FOR SELECT
TO authenticated
USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Users can insert their own restaurants" ON public.restaurants;
CREATE POLICY "Users can insert their own restaurants"
ON public.restaurants
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Users can update their own restaurants" ON public.restaurants;
CREATE POLICY "Users can update their own restaurants"
ON public.restaurants
FOR UPDATE
TO authenticated
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Public can read active restaurant storefront profile" ON public.restaurants;
CREATE POLICY "Public can read active restaurant storefront profile"
ON public.restaurants
FOR SELECT
TO anon, authenticated
USING (active IS TRUE);

-- categories ----------------------------------------------------------------
DROP POLICY IF EXISTS "Super admins can access all categories" ON public.categories;
CREATE POLICY "Super admins can access all categories"
ON public.categories
FOR ALL
TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can view their own categories" ON public.categories;
CREATE POLICY "Users can view their own categories"
ON public.categories
FOR SELECT
TO authenticated
USING (restaurant_id = public.get_user_restaurant_id());

DROP POLICY IF EXISTS "Users can insert their own categories" ON public.categories;
CREATE POLICY "Users can insert their own categories"
ON public.categories
FOR INSERT
TO authenticated
WITH CHECK (restaurant_id = public.get_user_restaurant_id());

DROP POLICY IF EXISTS "Users can update their own categories" ON public.categories;
CREATE POLICY "Users can update their own categories"
ON public.categories
FOR UPDATE
TO authenticated
USING (restaurant_id = public.get_user_restaurant_id())
WITH CHECK (restaurant_id = public.get_user_restaurant_id());

DROP POLICY IF EXISTS "Public can read active menu categories" ON public.categories;
CREATE POLICY "Public can read active menu categories"
ON public.categories
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.restaurants r
    WHERE r.id = categories.restaurant_id
      AND r.active IS TRUE
  )
);

-- products ------------------------------------------------------------------
DROP POLICY IF EXISTS "Super admins can access all products" ON public.products;
CREATE POLICY "Super admins can access all products"
ON public.products
FOR ALL
TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can view their restaurant's products" ON public.products;
CREATE POLICY "Users can view their restaurant's products"
ON public.products
FOR SELECT
TO authenticated
USING (restaurant_id = public.get_user_restaurant_id());

DROP POLICY IF EXISTS "Users can insert products to their restaurants" ON public.products;
CREATE POLICY "Users can insert products to their restaurants"
ON public.products
FOR INSERT
TO authenticated
WITH CHECK (restaurant_id = public.get_user_restaurant_id());

DROP POLICY IF EXISTS "Users can update their restaurant's products" ON public.products;
CREATE POLICY "Users can update their restaurant's products"
ON public.products
FOR UPDATE
TO authenticated
USING (restaurant_id = public.get_user_restaurant_id())
WITH CHECK (restaurant_id = public.get_user_restaurant_id());

DROP POLICY IF EXISTS "Public can read available active menu products" ON public.products;
CREATE POLICY "Public can read available active menu products"
ON public.products
FOR SELECT
TO anon, authenticated
USING (
  available IS TRUE
  AND EXISTS (
    SELECT 1
    FROM public.restaurants r
    WHERE r.id = products.restaurant_id
      AND r.active IS TRUE
  )
);

-- restaurant_settings -------------------------------------------------------
DROP POLICY IF EXISTS "Super admins can access all restaurant settings" ON public.restaurant_settings;
CREATE POLICY "Super admins can access all restaurant settings"
ON public.restaurant_settings
FOR ALL
TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can view their restaurant's configurations" ON public.restaurant_settings;
CREATE POLICY "Users can view their restaurant's configurations"
ON public.restaurant_settings
FOR SELECT
TO authenticated
USING (restaurant_id = public.get_user_restaurant_id());

DROP POLICY IF EXISTS "Users can insert configurations for their restaurant" ON public.restaurant_settings;
CREATE POLICY "Users can insert configurations for their restaurant"
ON public.restaurant_settings
FOR INSERT
TO authenticated
WITH CHECK (restaurant_id = public.get_user_restaurant_id());

DROP POLICY IF EXISTS "Users can update their restaurant's configurations" ON public.restaurant_settings;
CREATE POLICY "Users can update their restaurant's configurations"
ON public.restaurant_settings
FOR UPDATE
TO authenticated
USING (restaurant_id = public.get_user_restaurant_id())
WITH CHECK (restaurant_id = public.get_user_restaurant_id());

DROP POLICY IF EXISTS "Users can delete their restaurant's configurations" ON public.restaurant_settings;
CREATE POLICY "Users can delete their restaurant's configurations"
ON public.restaurant_settings
FOR DELETE
TO authenticated
USING (restaurant_id = public.get_user_restaurant_id());

DROP POLICY IF EXISTS "Public can read delivery config for active menus" ON public.restaurant_settings;
CREATE POLICY "Public can read delivery config for active menus"
ON public.restaurant_settings
FOR SELECT
TO anon, authenticated
USING (
  setting_key = 'delivery_config'
  AND EXISTS (
    SELECT 1
    FROM public.restaurants r
    WHERE r.id = restaurant_settings.restaurant_id
      AND r.active IS TRUE
  )
);

-- restaurant_menu_config ----------------------------------------------------
DROP POLICY IF EXISTS "Public can read active menu configs for public menus" ON public.restaurant_menu_config;
CREATE POLICY "Public can read active menu configs for public menus"
ON public.restaurant_menu_config
FOR SELECT
TO anon, authenticated
USING (
  is_active IS TRUE
  AND EXISTS (
    SELECT 1
    FROM public.restaurants r
    WHERE r.id = restaurant_menu_config.restaurant_id
      AND r.active IS TRUE
  )
);

DROP POLICY IF EXISTS "Restaurant owners can manage their menu config" ON public.restaurant_menu_config;
CREATE POLICY "Restaurant owners can manage their menu config"
ON public.restaurant_menu_config
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.restaurants r
    WHERE r.id = restaurant_menu_config.restaurant_id
      AND r.owner_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.restaurants r
    WHERE r.id = restaurant_menu_config.restaurant_id
      AND r.owner_id = auth.uid()
  )
);

-- promotions are read by the public menu through get_public_restaurant_promotions.
-- Keep direct table access restricted to authenticated restaurant users/admins.
DROP POLICY IF EXISTS "Users can view own restaurant promotions" ON public.promotions;
CREATE POLICY "Users can view own restaurant promotions"
ON public.promotions
FOR SELECT
TO authenticated
USING (restaurant_id = public.get_user_restaurant_id());

DROP POLICY IF EXISTS "Users can insert own restaurant promotions" ON public.promotions;
CREATE POLICY "Users can insert own restaurant promotions"
ON public.promotions
FOR INSERT
TO authenticated
WITH CHECK (restaurant_id = public.get_user_restaurant_id());

DROP POLICY IF EXISTS "Users can update own restaurant promotions" ON public.promotions;
CREATE POLICY "Users can update own restaurant promotions"
ON public.promotions
FOR UPDATE
TO authenticated
USING (restaurant_id = public.get_user_restaurant_id())
WITH CHECK (restaurant_id = public.get_user_restaurant_id());

DROP POLICY IF EXISTS "Users can delete own restaurant promotions" ON public.promotions;
CREATE POLICY "Users can delete own restaurant promotions"
ON public.promotions
FOR DELETE
TO authenticated
USING (restaurant_id = public.get_user_restaurant_id());
