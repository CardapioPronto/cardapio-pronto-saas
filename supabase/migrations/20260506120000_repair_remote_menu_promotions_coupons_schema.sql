-- Repair remote schema drift for menu ordering, promotions and coupons.
-- This file is intentionally idempotent because some remote tables already
-- existed with older column sets.

ALTER TABLE public.restaurant_settings
  ADD COLUMN IF NOT EXISTS opening_time time,
  ADD COLUMN IF NOT EXISTS closing_time time;

ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS order_position integer DEFAULT 0;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS order_position integer DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_categories_order_position
  ON public.categories(restaurant_id, order_position);

CREATE INDEX IF NOT EXISTS idx_products_order_position
  ON public.products(restaurant_id, category_id, order_position);

CREATE TABLE IF NOT EXISTS public.promotions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  discount_type text NOT NULL,
  discount_value numeric NOT NULL,
  applicable_to text NOT NULL DEFAULT 'order',
  target_id uuid,
  min_order_value numeric,
  is_active boolean DEFAULT true NOT NULL,
  valid_from timestamp with time zone DEFAULT now() NOT NULL,
  valid_until timestamp with time zone,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.promotions
  ADD COLUMN IF NOT EXISTS applicable_to text,
  ADD COLUMN IF NOT EXISTS target_id uuid,
  ADD COLUMN IF NOT EXISTS min_order_value numeric,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now() NOT NULL,
  ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now() NOT NULL;

UPDATE public.promotions
SET applicable_to = 'order'
WHERE applicable_to IS NULL;

ALTER TABLE public.promotions
  ALTER COLUMN applicable_to SET DEFAULT 'order',
  ALTER COLUMN applicable_to SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'promotions_discount_type_check'
      AND conrelid = 'public.promotions'::regclass
  ) THEN
    ALTER TABLE public.promotions
      ADD CONSTRAINT promotions_discount_type_check
      CHECK (discount_type IN ('percentage', 'fixed'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'promotions_discount_value_check'
      AND conrelid = 'public.promotions'::regclass
  ) THEN
    ALTER TABLE public.promotions
      ADD CONSTRAINT promotions_discount_value_check
      CHECK (discount_value > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'promotions_applicable_to_check'
      AND conrelid = 'public.promotions'::regclass
  ) THEN
    ALTER TABLE public.promotions
      ADD CONSTRAINT promotions_applicable_to_check
      CHECK (applicable_to IN ('product', 'category', 'order'));
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_promotions_restaurant
  ON public.promotions(restaurant_id);

CREATE INDEX IF NOT EXISTS idx_promotions_active_dates
  ON public.promotions(is_active, valid_from, valid_until)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_promotions_target
  ON public.promotions(target_id)
  WHERE target_id IS NOT NULL;

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS promotion_id uuid REFERENCES public.promotions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS promotion_discount numeric DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_order_items_promotion
  ON public.order_items(promotion_id);

CREATE INDEX IF NOT EXISTS idx_restaurants_slug
  ON public.restaurants(slug);

ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Restaurant staff can view own promotions" ON public.promotions;
CREATE POLICY "Restaurant staff can view own promotions"
ON public.promotions FOR SELECT
TO authenticated
USING (
  restaurant_id = public.get_user_restaurant_id()
  OR public.is_super_admin(auth.uid())
);

DROP POLICY IF EXISTS "Restaurant staff can manage own promotions" ON public.promotions;
CREATE POLICY "Restaurant staff can manage own promotions"
ON public.promotions FOR ALL
TO authenticated
USING (
  restaurant_id = public.get_user_restaurant_id()
  OR public.is_super_admin(auth.uid())
)
WITH CHECK (
  restaurant_id = public.get_user_restaurant_id()
  OR public.is_super_admin(auth.uid())
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.promotions TO authenticated;

CREATE TABLE IF NOT EXISTS public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  code varchar(50) NOT NULL,
  title varchar(255),
  description text,
  discount_type varchar(10) NOT NULL,
  discount_value numeric(10, 2) NOT NULL,
  max_uses integer,
  usage_count integer NOT NULL DEFAULT 0,
  valid_from timestamp with time zone,
  valid_until timestamp with time zone NOT NULL,
  minimum_order_value numeric(10, 2),
  applicable_to varchar(50) DEFAULT 'all',
  applicable_products uuid[] DEFAULT NULL,
  applicable_categories uuid[] DEFAULT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.coupons
  ADD COLUMN IF NOT EXISTS title varchar(255),
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS max_uses integer,
  ADD COLUMN IF NOT EXISTS max_usage integer,
  ADD COLUMN IF NOT EXISTS valid_from timestamp with time zone,
  ADD COLUMN IF NOT EXISTS minimum_order_value numeric(10, 2),
  ADD COLUMN IF NOT EXISTS applicable_to varchar(50) DEFAULT 'all',
  ADD COLUMN IF NOT EXISTS applicable_products uuid[] DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS applicable_categories uuid[] DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

UPDATE public.coupons
SET
  code = upper(btrim(code)),
  title = COALESCE(NULLIF(title, ''), code),
  max_uses = COALESCE(max_uses, max_usage),
  valid_from = COALESCE(valid_from, created_at, now()),
  applicable_to = COALESCE(applicable_to, 'all'),
  usage_count = COALESCE(usage_count, 0)
WHERE title IS NULL
  OR max_uses IS NULL
  OR valid_from IS NULL
  OR applicable_to IS NULL
  OR usage_count IS NULL
  OR code <> upper(btrim(code));

ALTER TABLE public.coupons
  ALTER COLUMN code TYPE varchar(50),
  ALTER COLUMN code SET NOT NULL,
  ALTER COLUMN title SET NOT NULL,
  ALTER COLUMN usage_count SET DEFAULT 0,
  ALTER COLUMN usage_count SET NOT NULL,
  ALTER COLUMN valid_from SET NOT NULL,
  ALTER COLUMN applicable_to SET DEFAULT 'all';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'coupons_discount_type_check'
      AND conrelid = 'public.coupons'::regclass
  ) THEN
    ALTER TABLE public.coupons
      ADD CONSTRAINT coupons_discount_type_check
      CHECK (discount_type IN ('percentage', 'fixed'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'coupons_discount_value_check'
      AND conrelid = 'public.coupons'::regclass
  ) THEN
    ALTER TABLE public.coupons
      ADD CONSTRAINT coupons_discount_value_check
      CHECK (discount_value > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'coupons_usage_count_check'
      AND conrelid = 'public.coupons'::regclass
  ) THEN
    ALTER TABLE public.coupons
      ADD CONSTRAINT coupons_usage_count_check
      CHECK (usage_count >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'coupons_valid_period_check'
      AND conrelid = 'public.coupons'::regclass
  ) THEN
    ALTER TABLE public.coupons
      ADD CONSTRAINT coupons_valid_period_check
      CHECK (valid_until > valid_from);
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.normalize_coupon_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.code := upper(btrim(NEW.code));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_normalize_coupon_code ON public.coupons;
CREATE TRIGGER trg_normalize_coupon_code
  BEFORE INSERT OR UPDATE OF code ON public.coupons
  FOR EACH ROW
  EXECUTE FUNCTION public.normalize_coupon_code();

CREATE INDEX IF NOT EXISTS idx_coupons_restaurant_code
  ON public.coupons(restaurant_id, code);

CREATE INDEX IF NOT EXISTS idx_coupons_restaurant_active
  ON public.coupons(restaurant_id, is_active);

CREATE INDEX IF NOT EXISTS idx_coupons_valid_from_until
  ON public.coupons(valid_from, valid_until);

CREATE TABLE IF NOT EXISTS public.coupon_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id uuid NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  customer_phone varchar(20),
  discount_amount numeric(10, 2) NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.coupon_usage
  ADD COLUMN IF NOT EXISTS customer_phone varchar(20),
  ADD COLUMN IF NOT EXISTS discount_amount numeric(10, 2),
  ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_coupon_usage_coupon_id
  ON public.coupon_usage(coupon_id);

CREATE INDEX IF NOT EXISTS idx_coupon_usage_order_id
  ON public.coupon_usage(order_id);

CREATE INDEX IF NOT EXISTS idx_coupon_usage_created_at
  ON public.coupon_usage(created_at);

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Restaurant staff can view own coupons" ON public.coupons;
CREATE POLICY "Restaurant staff can view own coupons"
ON public.coupons FOR SELECT
TO authenticated
USING (
  restaurant_id = public.get_user_restaurant_id()
  OR public.is_super_admin(auth.uid())
);

DROP POLICY IF EXISTS "Restaurant staff can manage own coupons" ON public.coupons;
CREATE POLICY "Restaurant staff can manage own coupons"
ON public.coupons FOR ALL
TO authenticated
USING (
  restaurant_id = public.get_user_restaurant_id()
  OR public.is_super_admin(auth.uid())
)
WITH CHECK (
  restaurant_id = public.get_user_restaurant_id()
  OR public.is_super_admin(auth.uid())
);

DROP POLICY IF EXISTS "Restaurant staff can view coupon usage" ON public.coupon_usage;
CREATE POLICY "Restaurant staff can view coupon usage"
ON public.coupon_usage FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.coupons c
    WHERE c.id = coupon_usage.coupon_id
      AND (
        c.restaurant_id = public.get_user_restaurant_id()
        OR public.is_super_admin(auth.uid())
      )
  )
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.coupons TO authenticated;
GRANT SELECT ON public.coupon_usage TO authenticated;
GRANT INSERT ON public.coupon_usage TO anon, authenticated;
