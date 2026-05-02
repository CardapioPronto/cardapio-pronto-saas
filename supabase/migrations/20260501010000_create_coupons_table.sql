-- Create coupons table for marketing/promotions
CREATE TABLE IF NOT EXISTS public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  
  -- Coupon identification
  code VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Discount configuration
  discount_type VARCHAR(10) NOT NULL CHECK (discount_type IN ('percentage', 'fixed')), -- 'percentage' ou 'fixed'
  discount_value NUMERIC(10, 2) NOT NULL CHECK (discount_value > 0),
  max_uses INT CHECK (max_uses IS NULL OR max_uses > 0),
  usage_count INT NOT NULL DEFAULT 0 CHECK (usage_count >= 0),
  
  -- Validity period
  valid_from TIMESTAMP WITH TIME ZONE NOT NULL,
  valid_until TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Conditions
  minimum_order_value NUMERIC(10, 2) CHECK (minimum_order_value IS NULL OR minimum_order_value >= 0), -- Valor mínimo do pedido
  applicable_to VARCHAR(50) DEFAULT 'all', -- 'all', 'products', 'categories'
  applicable_products UUID[] DEFAULT NULL, -- IDs de produtos aplicáveis
  applicable_categories UUID[] DEFAULT NULL, -- IDs de categorias aplicáveis
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(restaurant_id, code),
  CHECK (valid_until > valid_from)
);

ALTER TABLE public.coupons
  ALTER COLUMN code TYPE varchar(50),
  ALTER COLUMN code SET NOT NULL;

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

-- Create index for common queries
CREATE INDEX IF NOT EXISTS idx_coupons_restaurant_code ON public.coupons(restaurant_id, code);
CREATE INDEX IF NOT EXISTS idx_coupons_restaurant_active ON public.coupons(restaurant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_coupons_valid_from_until ON public.coupons(valid_from, valid_until);

-- Create coupon usage tracking table
CREATE TABLE IF NOT EXISTS public.coupon_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  customer_phone VARCHAR(20),
  discount_amount NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(order_id, coupon_id)
);

-- Create indexes for coupon_usage
CREATE INDEX IF NOT EXISTS idx_coupon_usage_coupon_id ON public.coupon_usage(coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_order_id ON public.coupon_usage(order_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_created_at ON public.coupon_usage(created_at);

-- Enable RLS
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies for coupons
CREATE POLICY "Restaurants can view their own coupons"
  ON public.coupons
  FOR SELECT
  USING (
    restaurant_id IN (
      SELECT id FROM restaurants 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Restaurants can insert their own coupons"
  ON public.coupons
  FOR INSERT
  WITH CHECK (
    restaurant_id IN (
      SELECT id FROM restaurants 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Restaurants can update their own coupons"
  ON public.coupons
  FOR UPDATE
  USING (
    restaurant_id IN (
      SELECT id FROM restaurants 
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    restaurant_id IN (
      SELECT id FROM restaurants 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Restaurants can delete their own coupons"
  ON public.coupons
  FOR DELETE
  USING (
    restaurant_id IN (
      SELECT id FROM restaurants 
      WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for coupon_usage
DROP POLICY IF EXISTS "Anyone can insert coupon usage" ON public.coupon_usage;

CREATE POLICY "Restaurants can view coupon usage for their coupons"
  ON public.coupon_usage
  FOR SELECT
  USING (
    coupon_id IN (
      SELECT id FROM coupons 
      WHERE restaurant_id IN (
        SELECT id FROM restaurants 
        WHERE user_id = auth.uid()
      )
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_coupons_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS update_coupons_updated_at_trigger ON public.coupons;
CREATE TRIGGER update_coupons_updated_at_trigger
  BEFORE UPDATE ON public.coupons
  FOR EACH ROW
  EXECUTE FUNCTION public.update_coupons_updated_at();

CREATE OR REPLACE FUNCTION public.validate_public_coupon(
  p_code text,
  p_restaurant_id uuid,
  p_order_value numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_coupon public.coupons%ROWTYPE;
  v_discount numeric := 0;
  v_code text := upper(btrim(COALESCE(p_code, '')));
BEGIN
  IF v_code = '' THEN
    RETURN jsonb_build_object('valid', false, 'message', 'Informe um cupom.');
  END IF;

  SELECT *
  INTO v_coupon
  FROM public.coupons
  WHERE restaurant_id = p_restaurant_id
    AND code = v_code
  LIMIT 1;

  IF v_coupon.id IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'message', 'Cupom não encontrado.');
  END IF;

  IF COALESCE(v_coupon.is_active, false) = false THEN
    RETURN jsonb_build_object('valid', false, 'message', 'Cupom inativo.');
  END IF;

  IF now() < v_coupon.valid_from OR now() > v_coupon.valid_until THEN
    RETURN jsonb_build_object('valid', false, 'message', 'Cupom fora do período de validade.');
  END IF;

  IF v_coupon.max_uses IS NOT NULL AND v_coupon.usage_count >= v_coupon.max_uses THEN
    RETURN jsonb_build_object('valid', false, 'message', 'Cupom esgotado.');
  END IF;

  IF v_coupon.minimum_order_value IS NOT NULL AND p_order_value < v_coupon.minimum_order_value THEN
    RETURN jsonb_build_object(
      'valid', false,
      'message', format('Pedido mínimo para este cupom: R$ %s.', trim(to_char(v_coupon.minimum_order_value, '999999990D00')))
    );
  END IF;

  IF v_coupon.discount_type = 'percentage' THEN
    v_discount := LEAST(p_order_value, round((p_order_value * v_coupon.discount_value / 100)::numeric, 2));
  ELSE
    v_discount := LEAST(p_order_value, v_coupon.discount_value);
  END IF;

  RETURN jsonb_build_object(
    'valid', true,
    'message', 'Cupom aplicado com sucesso.',
    'coupon_id', v_coupon.id,
    'code', v_coupon.code,
    'title', v_coupon.title,
    'discount', v_discount
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_public_coupon(text, uuid, numeric) TO anon, authenticated;
