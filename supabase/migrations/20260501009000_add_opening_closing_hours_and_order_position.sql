-- Add structured opening/closing hours and order position for products/categories

-- 1. Add opening_time and closing_time to restaurant_settings
-- This allows per-restaurant operational hours (can vary by day later)
ALTER TABLE public.restaurant_settings
  ADD COLUMN IF NOT EXISTS opening_time time,
  ADD COLUMN IF NOT EXISTS closing_time time;

-- 2. Add order_position to categories for manual ordering
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS order_position integer DEFAULT 0;

-- Create index for category ordering
CREATE INDEX IF NOT EXISTS idx_categories_order_position 
ON public.categories(restaurant_id, order_position);

-- 3. Add order_position to products for manual ordering
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS order_position integer DEFAULT 0;

-- Create index for product ordering
CREATE INDEX IF NOT EXISTS idx_products_order_position 
ON public.products(restaurant_id, category_id, order_position);

-- 4. Create promotions table
CREATE TABLE IF NOT EXISTS public.promotions (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  
  -- Basic info
  name text NOT NULL,
  description text,
  discount_type text NOT NULL CHECK (discount_type IN ('percentage', 'fixed')), -- percentage or fixed amount
  discount_value numeric NOT NULL CHECK (discount_value > 0),
  
  -- Applicability
  applicable_to text NOT NULL CHECK (applicable_to IN ('product', 'category', 'order')), -- what this promo applies to
  target_id uuid, -- product_id or category_id (null if applies to all)
  min_order_value numeric, -- minimum order value to apply (null = no minimum)
  
  -- Status and dates
  is_active boolean DEFAULT true NOT NULL,
  valid_from timestamp with time zone DEFAULT now() NOT NULL,
  valid_until timestamp with time zone,
  
  -- Metadata
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Add indexes for promotions
CREATE INDEX idx_promotions_restaurant ON public.promotions(restaurant_id);
CREATE INDEX idx_promotions_active_dates ON public.promotions(is_active, valid_from, valid_until) 
WHERE is_active = true;
CREATE INDEX idx_promotions_target ON public.promotions(target_id) WHERE target_id IS NOT NULL;

-- 5. Add promotion_id to order_items
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS promotion_id uuid REFERENCES public.promotions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS promotion_discount numeric DEFAULT 0;

CREATE INDEX idx_order_items_promotion ON public.order_items(promotion_id);

-- 6. Add slug validation and uniqueness
-- Note: slug should already exist in restaurants from previous migrations
-- Adding unique constraint
ALTER TABLE public.restaurants
  DROP CONSTRAINT IF EXISTS restaurants_slug_unique,
  ADD CONSTRAINT restaurants_slug_unique UNIQUE (slug);

-- Create index for faster slug lookups
CREATE INDEX IF NOT EXISTS idx_restaurants_slug ON public.restaurants(slug);

-- Set up RLS for promotions
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Restaurant staff can view own promotions" ON public.promotions;
CREATE POLICY "Restaurant staff can view own promotions"
ON public.promotions FOR SELECT
TO authenticated
USING (
  restaurant_id = public.get_user_restaurant_id() OR 
  public.is_super_admin(auth.uid())
);

DROP POLICY IF EXISTS "Restaurant staff can manage own promotions" ON public.promotions;
CREATE POLICY "Restaurant staff can manage own promotions"
ON public.promotions FOR ALL
TO authenticated
USING (
  restaurant_id = public.get_user_restaurant_id() OR 
  public.is_super_admin(auth.uid())
)
WITH CHECK (
  restaurant_id = public.get_user_restaurant_id() OR 
  public.is_super_admin(auth.uid())
);

-- Grant permissions
GRANT SELECT ON public.promotions TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.promotions TO authenticated;
