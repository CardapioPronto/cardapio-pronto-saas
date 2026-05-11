-- Bloco 7 - marketing hardening:
-- - coupon pre-validation uses real coupon_usage count as source of truth when stricter
-- - campaign dispatch records partial progress during batch sends

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
  v_usage_count integer := 0;
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

  SELECT COUNT(*)::integer
  INTO v_usage_count
  FROM public.coupon_usage
  WHERE coupon_id = v_coupon.id;

  v_usage_count := GREATEST(COALESCE(v_coupon.usage_count, 0), COALESCE(v_usage_count, 0));

  IF COALESCE(v_coupon.is_active, false) = false THEN
    RETURN jsonb_build_object('valid', false, 'message', 'Cupom inativo.');
  END IF;

  IF now() < v_coupon.valid_from OR now() > v_coupon.valid_until THEN
    RETURN jsonb_build_object('valid', false, 'message', 'Cupom fora do período de validade.');
  END IF;

  IF v_coupon.max_uses IS NOT NULL AND v_usage_count >= v_coupon.max_uses THEN
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
    'discount', v_discount,
    'usage_count', v_usage_count,
    'max_uses', v_coupon.max_uses
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_public_coupon(text, uuid, numeric) TO anon, authenticated;
