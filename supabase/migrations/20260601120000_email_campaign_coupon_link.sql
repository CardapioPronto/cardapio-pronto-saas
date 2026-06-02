-- Bloco 3: campaign-linked coupons.

ALTER TABLE public.email_campaigns
  ADD COLUMN IF NOT EXISTS coupon_id uuid REFERENCES public.coupons(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_email_campaigns_coupon
  ON public.email_campaigns(coupon_id)
  WHERE coupon_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.generate_email_campaign_coupon(
  p_campaign_id uuid,
  p_discount_type text DEFAULT 'percentage',
  p_discount_value numeric DEFAULT 10,
  p_valid_days integer DEFAULT 30,
  p_minimum_order_value numeric DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_campaign public.email_campaigns%ROWTYPE;
  v_coupon public.coupons%ROWTYPE;
  v_discount_type text := COALESCE(NULLIF(p_discount_type, ''), 'percentage');
  v_discount_value numeric := round(GREATEST(COALESCE(p_discount_value, 10), 0)::numeric, 2);
  v_valid_days integer := LEAST(GREATEST(COALESCE(p_valid_days, 30), 1), 365);
  v_minimum_order_value numeric := round(GREATEST(COALESCE(p_minimum_order_value, 0), 0)::numeric, 2);
  v_code text;
  v_attempt integer := 0;
BEGIN
  IF p_campaign_id IS NULL THEN
    RAISE EXCEPTION 'Campanha nao informada.';
  END IF;

  SELECT *
  INTO v_campaign
  FROM public.email_campaigns
  WHERE id = p_campaign_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Campanha nao encontrada.';
  END IF;

  IF NOT (
    public.is_super_admin(auth.uid())
    OR v_campaign.restaurant_id = public.get_user_restaurant_id()
  ) THEN
    RAISE EXCEPTION 'Sem permissao para gerar cupom desta campanha.';
  END IF;

  IF v_campaign.status NOT IN ('draft', 'failed') THEN
    RAISE EXCEPTION 'Somente campanhas em rascunho ou falhadas podem receber cupom.';
  END IF;

  IF v_campaign.coupon_id IS NOT NULL THEN
    SELECT *
    INTO v_coupon
    FROM public.coupons
    WHERE id = v_campaign.coupon_id
      AND restaurant_id = v_campaign.restaurant_id;

    IF FOUND THEN
      RETURN jsonb_build_object(
        'coupon_id', v_coupon.id,
        'code', v_coupon.code,
        'title', v_coupon.title,
        'discount_type', v_coupon.discount_type,
        'discount_value', v_coupon.discount_value,
        'valid_until', v_coupon.valid_until,
        'minimum_order_value', v_coupon.minimum_order_value,
        'reused', true
      );
    END IF;
  END IF;

  IF v_discount_type NOT IN ('percentage', 'fixed') THEN
    RAISE EXCEPTION 'Tipo de desconto invalido.';
  END IF;

  IF v_discount_type = 'percentage' AND (v_discount_value <= 0 OR v_discount_value > 80) THEN
    RAISE EXCEPTION 'Percentual de desconto deve ficar entre 0,01 e 80.';
  END IF;

  IF v_discount_type = 'fixed' AND v_discount_value <= 0 THEN
    RAISE EXCEPTION 'Valor de desconto deve ser maior que zero.';
  END IF;

  LOOP
    v_attempt := v_attempt + 1;
    v_code := upper('PUBFY' || substr(md5(v_campaign.id::text || clock_timestamp()::text || v_attempt::text), 1, 6));

    EXIT WHEN NOT EXISTS (
      SELECT 1
      FROM public.coupons c
      WHERE c.restaurant_id = v_campaign.restaurant_id
        AND c.code = v_code
    );

    IF v_attempt >= 10 THEN
      RAISE EXCEPTION 'Nao foi possivel gerar um codigo unico para o cupom.';
    END IF;
  END LOOP;

  INSERT INTO public.coupons (
    restaurant_id,
    code,
    title,
    description,
    discount_type,
    discount_value,
    max_uses,
    valid_from,
    valid_until,
    minimum_order_value,
    applicable_to,
    is_active
  )
  VALUES (
    v_campaign.restaurant_id,
    v_code,
    'Cupom da campanha: ' || left(v_campaign.name, 80),
    'Gerado automaticamente para campanha de e-mail.',
    v_discount_type,
    v_discount_value,
    NULL,
    now(),
    now() + make_interval(days => v_valid_days),
    v_minimum_order_value,
    'all',
    true
  )
  RETURNING *
  INTO v_coupon;

  UPDATE public.email_campaigns
  SET coupon_id = v_coupon.id,
      html_content = CASE
        WHEN html_content ILIKE '%{{coupon}}%' THEN html_content
        ELSE html_content || '<p><strong>Cupom: {{coupon}}</strong></p>'
      END,
      text_content = CASE
        WHEN COALESCE(text_content, '') ILIKE '%{{coupon}}%' THEN text_content
        ELSE COALESCE(text_content, '') || E'\nCupom: {{coupon}}'
      END,
      updated_at = now()
  WHERE id = v_campaign.id;

  RETURN jsonb_build_object(
    'coupon_id', v_coupon.id,
    'code', v_coupon.code,
    'title', v_coupon.title,
    'discount_type', v_coupon.discount_type,
    'discount_value', v_coupon.discount_value,
    'valid_until', v_coupon.valid_until,
    'minimum_order_value', v_coupon.minimum_order_value,
    'reused', false
  );
END;
$$;

REVOKE ALL ON FUNCTION public.generate_email_campaign_coupon(uuid, text, numeric, integer, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_email_campaign_coupon(uuid, text, numeric, integer, numeric) TO authenticated;

COMMENT ON FUNCTION public.generate_email_campaign_coupon(uuid, text, numeric, integer, numeric) IS
  'Gera ou reutiliza um cupom rastreavel vinculado a uma campanha de e-mail.';
