ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS image_storage_path text,
ADD COLUMN IF NOT EXISTS image_uploaded_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS image_uploaded_at timestamp with time zone;

CREATE INDEX IF NOT EXISTS idx_products_restaurant_created_at
ON public.products(restaurant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_products_restaurant_available
ON public.products(restaurant_id, available);

CREATE INDEX IF NOT EXISTS idx_products_restaurant_category
ON public.products(restaurant_id, category_id);

CREATE INDEX IF NOT EXISTS idx_products_restaurant_name
ON public.products(restaurant_id, name);

CREATE INDEX IF NOT EXISTS idx_products_restaurant_price
ON public.products(restaurant_id, price);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'products'
      AND policyname = 'Members can view their restaurant products'
  ) THEN
    CREATE POLICY "Members can view their restaurant products"
    ON public.products
    FOR SELECT
    USING (restaurant_id = public.get_user_restaurant_id());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'products'
      AND policyname = 'Members can insert their restaurant products'
  ) THEN
    CREATE POLICY "Members can insert their restaurant products"
    ON public.products
    FOR INSERT
    WITH CHECK (restaurant_id = public.get_user_restaurant_id());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'products'
      AND policyname = 'Members can update their restaurant products'
  ) THEN
    CREATE POLICY "Members can update their restaurant products"
    ON public.products
    FOR UPDATE
    USING (restaurant_id = public.get_user_restaurant_id())
    WITH CHECK (restaurant_id = public.get_user_restaurant_id());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'products'
      AND policyname = 'Users can delete their restaurant products'
  ) THEN
    CREATE POLICY "Users can delete their restaurant products"
    ON public.products
    FOR DELETE
    USING (
      restaurant_id = public.get_user_restaurant_id()
      OR restaurant_id IN (
        SELECT id FROM public.restaurants
        WHERE owner_id = auth.uid()
      )
    );
  END IF;
END $$;
