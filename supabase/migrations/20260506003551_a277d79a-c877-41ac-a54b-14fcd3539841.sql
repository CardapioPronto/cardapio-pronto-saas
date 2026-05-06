
-- 1. Add missing columns to products
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS image_storage_path text,
  ADD COLUMN IF NOT EXISTS image_uploaded_by uuid,
  ADD COLUMN IF NOT EXISTS image_uploaded_at timestamptz,
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS updated_by uuid;

-- 2. Add missing column to categories
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS order_position integer DEFAULT 0;

-- 3. Add missing column to plans
ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS pagarme_payment_methods text[] DEFAULT ARRAY['credit_card','boleto','pix'];

-- 4. Create promotions table
CREATE TABLE IF NOT EXISTS public.promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  discount_type text NOT NULL DEFAULT 'percentage',
  discount_value numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own restaurant promotions"
  ON public.promotions FOR SELECT
  USING (restaurant_id = public.get_user_restaurant_id());

CREATE POLICY "Users can insert own restaurant promotions"
  ON public.promotions FOR INSERT
  WITH CHECK (restaurant_id = public.get_user_restaurant_id());

CREATE POLICY "Users can update own restaurant promotions"
  ON public.promotions FOR UPDATE
  USING (restaurant_id = public.get_user_restaurant_id());

CREATE POLICY "Users can delete own restaurant promotions"
  ON public.promotions FOR DELETE
  USING (restaurant_id = public.get_user_restaurant_id());

CREATE TRIGGER update_promotions_updated_at
  BEFORE UPDATE ON public.promotions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Create coupons table
CREATE TABLE IF NOT EXISTS public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  code text NOT NULL,
  discount_type text NOT NULL DEFAULT 'percentage',
  discount_value numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  valid_until timestamptz,
  usage_count integer NOT NULL DEFAULT 0,
  max_usage integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own restaurant coupons"
  ON public.coupons FOR SELECT
  USING (restaurant_id = public.get_user_restaurant_id());

CREATE POLICY "Users can insert own restaurant coupons"
  ON public.coupons FOR INSERT
  WITH CHECK (restaurant_id = public.get_user_restaurant_id());

CREATE POLICY "Users can update own restaurant coupons"
  ON public.coupons FOR UPDATE
  USING (restaurant_id = public.get_user_restaurant_id());

CREATE POLICY "Users can delete own restaurant coupons"
  ON public.coupons FOR DELETE
  USING (restaurant_id = public.get_user_restaurant_id());

CREATE TRIGGER update_coupons_updated_at
  BEFORE UPDATE ON public.coupons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Create coupon_usage table
CREATE TABLE IF NOT EXISTS public.coupon_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id uuid NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  order_id uuid,
  customer_identifier text,
  used_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.coupon_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view coupon usage for own restaurant"
  ON public.coupon_usage FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.coupons c
      WHERE c.id = coupon_usage.coupon_id
        AND c.restaurant_id = public.get_user_restaurant_id()
    )
  );

CREATE POLICY "Users can insert coupon usage for own restaurant"
  ON public.coupon_usage FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.coupons c
      WHERE c.id = coupon_usage.coupon_id
        AND c.restaurant_id = public.get_user_restaurant_id()
    )
  );
