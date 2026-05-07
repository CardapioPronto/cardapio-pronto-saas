-- Restaurant online payments foundation.
-- This separates platform subscription billing from restaurant order receipts.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS customer_email text,
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'not_required',
  ADD COLUMN IF NOT EXISTS payment_provider text,
  ADD COLUMN IF NOT EXISTS payment_reference text,
  ADD COLUMN IF NOT EXISTS paid_at timestamp with time zone;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'orders_payment_status_check'
  ) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_payment_status_check
      CHECK (payment_status IN ('not_required', 'pending', 'paid', 'failed', 'refunded', 'canceled'));
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_orders_payment_status
  ON public.orders(restaurant_id, payment_status, created_at DESC);

ALTER TABLE public.delivery_orders
  ADD COLUMN IF NOT EXISTS customer_email text,
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'not_required',
  ADD COLUMN IF NOT EXISTS payment_provider text,
  ADD COLUMN IF NOT EXISTS payment_reference text,
  ADD COLUMN IF NOT EXISTS paid_at timestamp with time zone;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'delivery_orders_payment_status_check'
  ) THEN
    ALTER TABLE public.delivery_orders
      ADD CONSTRAINT delivery_orders_payment_status_check
      CHECK (payment_status IN ('not_required', 'pending', 'paid', 'failed', 'refunded', 'canceled'));
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.restaurant_payment_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL UNIQUE REFERENCES public.restaurants(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'pagarme',
  marketplace_mode text NOT NULL DEFAULT 'split',
  is_enabled boolean NOT NULL DEFAULT false,
  onboarding_status text NOT NULL DEFAULT 'not_started',
  recipient_id text,
  enabled_methods text[] NOT NULL DEFAULT ARRAY['pix']::text[],
  allow_delivery boolean NOT NULL DEFAULT true,
  allow_pickup boolean NOT NULL DEFAULT true,
  allow_table boolean NOT NULL DEFAULT false,
  allow_counter boolean NOT NULL DEFAULT false,
  commission_type text NOT NULL DEFAULT 'none',
  commission_value numeric NOT NULL DEFAULT 0,
  notes text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT restaurant_payment_settings_provider_check
    CHECK (provider IN ('pagarme')),
  CONSTRAINT restaurant_payment_settings_marketplace_mode_check
    CHECK (marketplace_mode IN ('split', 'direct')),
  CONSTRAINT restaurant_payment_settings_onboarding_status_check
    CHECK (onboarding_status IN ('not_started', 'pending', 'approved', 'rejected')),
  CONSTRAINT restaurant_payment_settings_enabled_methods_check
    CHECK (
      array_length(enabled_methods, 1) > 0
      AND enabled_methods <@ ARRAY['pix', 'credit_card']::text[]
    ),
  CONSTRAINT restaurant_payment_settings_commission_type_check
    CHECK (commission_type IN ('none', 'percentage', 'flat')),
  CONSTRAINT restaurant_payment_settings_commission_value_check
    CHECK (commission_value >= 0)
);

CREATE INDEX IF NOT EXISTS idx_restaurant_payment_settings_restaurant
  ON public.restaurant_payment_settings(restaurant_id);

DROP TRIGGER IF EXISTS update_restaurant_payment_settings_updated_at
  ON public.restaurant_payment_settings;
CREATE TRIGGER update_restaurant_payment_settings_updated_at
  BEFORE UPDATE ON public.restaurant_payment_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.restaurant_payment_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Restaurant can view own payment settings"
  ON public.restaurant_payment_settings;
CREATE POLICY "Restaurant can view own payment settings"
  ON public.restaurant_payment_settings FOR SELECT
  USING (
    is_super_admin(auth.uid())
    OR restaurant_id = get_user_restaurant_id()
    OR (is_enabled = true AND onboarding_status = 'approved')
  );

DROP POLICY IF EXISTS "Restaurant can manage own payment settings"
  ON public.restaurant_payment_settings;
CREATE POLICY "Restaurant can manage own payment settings"
  ON public.restaurant_payment_settings FOR ALL
  USING (
    is_super_admin(auth.uid())
    OR user_has_restaurant_permission(restaurant_id, 'settings_integrations_manage'::public.permission_type)
    OR user_has_restaurant_permission(restaurant_id, 'settings_manage'::public.permission_type)
  )
  WITH CHECK (
    is_super_admin(auth.uid())
    OR user_has_restaurant_permission(restaurant_id, 'settings_integrations_manage'::public.permission_type)
    OR user_has_restaurant_permission(restaurant_id, 'settings_manage'::public.permission_type)
  );

DROP POLICY IF EXISTS "Service role can manage restaurant payment settings"
  ON public.restaurant_payment_settings;
CREATE POLICY "Service role can manage restaurant payment settings"
  ON public.restaurant_payment_settings FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.order_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'pagarme',
  provider_order_id text,
  provider_charge_id text,
  status text NOT NULL DEFAULT 'pending',
  payment_method text NOT NULL,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'BRL',
  qr_code text,
  qr_code_url text,
  checkout_url text,
  boleto_url text,
  boleto_barcode text,
  boleto_line text,
  expires_at timestamp with time zone,
  paid_at timestamp with time zone,
  raw_response jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT order_payments_provider_check CHECK (provider IN ('pagarme')),
  CONSTRAINT order_payments_status_check
    CHECK (status IN ('pending', 'paid', 'failed', 'refunded', 'canceled')),
  CONSTRAINT order_payments_method_check
    CHECK (payment_method IN ('pix', 'credit_card')),
  CONSTRAINT order_payments_amount_check CHECK (amount >= 0)
);

CREATE INDEX IF NOT EXISTS idx_order_payments_restaurant
  ON public.order_payments(restaurant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_payments_order
  ON public.order_payments(order_id);
CREATE INDEX IF NOT EXISTS idx_order_payments_provider_order
  ON public.order_payments(provider, provider_order_id)
  WHERE provider_order_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uniq_order_payments_active_order_method
  ON public.order_payments(order_id, payment_method)
  WHERE status IN ('pending', 'paid');

DROP TRIGGER IF EXISTS update_order_payments_updated_at ON public.order_payments;
CREATE TRIGGER update_order_payments_updated_at
  BEFORE UPDATE ON public.order_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.order_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Restaurant can view own order payments"
  ON public.order_payments;
CREATE POLICY "Restaurant can view own order payments"
  ON public.order_payments FOR SELECT
  USING (
    is_super_admin(auth.uid())
    OR restaurant_id = get_user_restaurant_id()
  );

DROP POLICY IF EXISTS "Service role can manage order payments"
  ON public.order_payments;
CREATE POLICY "Service role can manage order payments"
  ON public.order_payments FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

ALTER TABLE public.pagarme_webhook_events
  ADD COLUMN IF NOT EXISTS pagarme_order_id text,
  ADD COLUMN IF NOT EXISTS order_id uuid;

CREATE INDEX IF NOT EXISTS idx_pagarme_webhook_events_order
  ON public.pagarme_webhook_events(order_id)
  WHERE order_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pagarme_webhook_events_pagarme_order
  ON public.pagarme_webhook_events(pagarme_order_id)
  WHERE pagarme_order_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.create_public_menu_order(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_restaurant_id uuid;
  v_fulfillment_type text;
  v_table_id uuid;
  v_customer_name text;
  v_customer_phone text;
  v_customer_email text;
  v_payment_method text;
  v_change_for numeric;
  v_notes text;
  v_delivery_fee numeric := 0;
  v_estimated_minutes integer;
  v_items jsonb;
  v_item jsonb;
  v_product record;
  v_quantity integer;
  v_observations text;
  v_subtotal numeric := 0;
  v_discount numeric := 0;
  v_total numeric := 0;
  v_order_id uuid;
  v_delivery_order_id uuid;
  v_order_number text;
  v_delivery_config jsonb := '{}'::jsonb;
  v_delivery_enabled boolean := true;
  v_pickup_enabled boolean := true;
  v_table_valid boolean := false;
  v_coupon_code text;
  v_coupon public.coupons%ROWTYPE;
  v_requires_online_payment boolean := false;
  v_payment_status text := 'not_required';
BEGIN
  v_restaurant_id := NULLIF(payload->>'restaurant_id', '')::uuid;
  v_fulfillment_type := COALESCE(NULLIF(payload->>'fulfillment_type', ''), 'delivery');
  v_table_id := NULLIF(payload->>'table_id', '')::uuid;
  v_customer_name := btrim(COALESCE(payload->>'customer_name', ''));
  v_customer_phone := NULLIF(btrim(COALESCE(payload->>'customer_phone', '')), '');
  v_customer_email := NULLIF(lower(btrim(COALESCE(payload->>'customer_email', ''))), '');
  v_payment_method := NULLIF(payload->>'payment_method', '');
  v_change_for := NULLIF(payload->>'change_for', '')::numeric;
  v_notes := NULLIF(btrim(COALESCE(payload->>'notes', '')), '');
  v_delivery_fee := COALESCE(NULLIF(payload->>'delivery_fee', '')::numeric, 0);
  v_estimated_minutes := NULLIF(payload->>'estimated_delivery_minutes', '')::integer;
  v_coupon_code := upper(NULLIF(btrim(COALESCE(payload->>'coupon_code', '')), ''));
  v_items := payload->'items';
  v_requires_online_payment := v_payment_method IN ('pix_online', 'credit_card_online');
  v_payment_status := CASE WHEN v_requires_online_payment THEN 'pending' ELSE 'not_required' END;

  IF v_restaurant_id IS NULL THEN
    RAISE EXCEPTION 'Restaurante não informado.';
  END IF;

  IF v_fulfillment_type NOT IN ('delivery', 'pickup', 'table', 'counter') THEN
    RAISE EXCEPTION 'Tipo de atendimento inválido.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.restaurants r
    WHERE r.id = v_restaurant_id
      AND COALESCE(r.active, true) = true
  ) THEN
    RAISE EXCEPTION 'Restaurante indisponível.';
  END IF;

  SELECT COALESCE(rs.setting_value, '{}'::jsonb)
  INTO v_delivery_config
  FROM public.restaurant_settings rs
  WHERE rs.restaurant_id = v_restaurant_id
    AND rs.setting_key = 'delivery_config';

  v_delivery_enabled := COALESCE((v_delivery_config->>'delivery_enabled')::boolean, true);
  v_pickup_enabled := COALESCE((v_delivery_config->>'pickup_enabled')::boolean, true);

  IF v_fulfillment_type = 'delivery' AND NOT v_delivery_enabled THEN
    RAISE EXCEPTION 'Delivery indisponível no momento.';
  END IF;

  IF v_fulfillment_type IN ('pickup', 'counter') AND NOT v_pickup_enabled THEN
    RAISE EXCEPTION 'Retirada/balcão indisponível no momento.';
  END IF;

  IF v_customer_name = '' THEN
    v_customer_name := CASE
      WHEN v_fulfillment_type = 'table' THEN 'Cliente da mesa'
      WHEN v_fulfillment_type = 'counter' THEN 'Cliente balcão'
      ELSE 'Cliente'
    END;
  END IF;

  IF v_fulfillment_type IN ('delivery', 'pickup') AND COALESCE(v_customer_phone, '') = '' THEN
    RAISE EXCEPTION 'Telefone do cliente é obrigatório.';
  END IF;

  IF v_requires_online_payment AND v_payment_method = 'credit_card_online' THEN
    RAISE EXCEPTION 'Pagamento online por cartão ainda não está liberado neste checkout.';
  END IF;

  IF v_requires_online_payment AND COALESCE(v_customer_phone, '') = '' THEN
    RAISE EXCEPTION 'Telefone é obrigatório para pagamento online.';
  END IF;

  IF jsonb_typeof(v_items) <> 'array' OR jsonb_array_length(v_items) = 0 THEN
    RAISE EXCEPTION 'Adicione ao menos um item ao pedido.';
  END IF;

  IF v_fulfillment_type = 'table' THEN
    IF v_table_id IS NULL THEN
      RAISE EXCEPTION 'Mesa não informada.';
    END IF;

    SELECT EXISTS (
      SELECT 1 FROM public.mesas m
      WHERE m.id = v_table_id
        AND m.restaurant_id = v_restaurant_id
        AND m.is_active = true
    ) INTO v_table_valid;

    IF NOT v_table_valid THEN
      RAISE EXCEPTION 'Mesa inválida ou indisponível.';
    END IF;
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(v_items)
  LOOP
    v_quantity := GREATEST(COALESCE(NULLIF(v_item->>'quantity', '')::integer, 1), 1);

    SELECT p.id, p.name, p.price, p.available
    INTO v_product
    FROM public.products p
    WHERE p.id = NULLIF(v_item->>'product_id', '')::uuid
      AND p.restaurant_id = v_restaurant_id
    LIMIT 1;

    IF v_product.id IS NULL THEN
      RAISE EXCEPTION 'Produto inválido no pedido.';
    END IF;

    IF v_product.available = false THEN
      RAISE EXCEPTION 'O produto "%" não está disponível.', v_product.name;
    END IF;

    v_subtotal := v_subtotal + (v_product.price * v_quantity);
  END LOOP;

  IF v_coupon_code IS NOT NULL THEN
    SELECT *
    INTO v_coupon
    FROM public.coupons
    WHERE restaurant_id = v_restaurant_id
      AND code = v_coupon_code
    FOR UPDATE;

    IF v_coupon.id IS NULL THEN
      RAISE EXCEPTION 'Cupom não encontrado.';
    END IF;

    IF COALESCE(v_coupon.is_active, false) = false THEN
      RAISE EXCEPTION 'Cupom inativo.';
    END IF;

    IF now() < v_coupon.valid_from OR now() > v_coupon.valid_until THEN
      RAISE EXCEPTION 'Cupom fora do período de validade.';
    END IF;

    IF v_coupon.max_uses IS NOT NULL AND v_coupon.usage_count >= v_coupon.max_uses THEN
      RAISE EXCEPTION 'Cupom esgotado.';
    END IF;

    IF v_coupon.minimum_order_value IS NOT NULL AND v_subtotal < v_coupon.minimum_order_value THEN
      RAISE EXCEPTION 'Pedido mínimo não atingido para este cupom.';
    END IF;

    IF v_coupon.discount_type = 'percentage' THEN
      v_discount := LEAST(v_subtotal, round((v_subtotal * v_coupon.discount_value / 100)::numeric, 2));
    ELSE
      v_discount := LEAST(v_subtotal, v_coupon.discount_value);
    END IF;
  END IF;

  IF v_fulfillment_type <> 'delivery' THEN
    v_delivery_fee := 0;
  END IF;

  v_total := GREATEST(v_subtotal - v_discount, 0) + v_delivery_fee;

  INSERT INTO public.orders (
    restaurant_id,
    customer_name,
    customer_phone,
    customer_email,
    order_type,
    table_id,
    status,
    total,
    payment_method,
    payment_status,
    source
  )
  VALUES (
    v_restaurant_id,
    v_customer_name,
    v_customer_phone,
    v_customer_email,
    CASE
      WHEN v_fulfillment_type = 'table' THEN 'mesa'
      WHEN v_fulfillment_type = 'delivery' THEN 'delivery'
      ELSE 'balcao'
    END,
    CASE WHEN v_fulfillment_type = 'table' THEN v_table_id ELSE NULL END,
    CASE WHEN v_requires_online_payment THEN 'aguardando_pagamento' ELSE 'pendente' END,
    v_total,
    v_payment_method,
    v_payment_status,
    'cardapio'
  )
  RETURNING id, order_number INTO v_order_id, v_order_number;

  FOR v_item IN SELECT * FROM jsonb_array_elements(v_items)
  LOOP
    v_quantity := GREATEST(COALESCE(NULLIF(v_item->>'quantity', '')::integer, 1), 1);
    v_observations := NULLIF(btrim(COALESCE(v_item->>'observations', '')), '');

    SELECT p.id, p.name, p.price
    INTO v_product
    FROM public.products p
    WHERE p.id = NULLIF(v_item->>'product_id', '')::uuid
      AND p.restaurant_id = v_restaurant_id
    LIMIT 1;

    INSERT INTO public.order_items (
      order_id,
      product_id,
      product_name,
      quantity,
      price,
      observations,
      addons
    )
    VALUES (
      v_order_id,
      v_product.id,
      v_product.name,
      v_quantity,
      v_product.price,
      v_observations,
      COALESCE(v_item->'addons', '[]'::jsonb)
    );
  END LOOP;

  IF v_coupon.id IS NOT NULL AND v_discount > 0 THEN
    INSERT INTO public.coupon_usage (
      coupon_id,
      order_id,
      customer_phone,
      discount_amount
    )
    VALUES (
      v_coupon.id,
      v_order_id,
      v_customer_phone,
      v_discount
    );

    UPDATE public.coupons
    SET usage_count = usage_count + 1,
        updated_at = now()
    WHERE id = v_coupon.id;
  END IF;

  IF v_fulfillment_type = 'table' AND v_table_id IS NOT NULL AND NOT v_requires_online_payment THEN
    UPDATE public.mesas
    SET status = 'ocupada', updated_at = now()
    WHERE id = v_table_id
      AND restaurant_id = v_restaurant_id;
  END IF;

  IF v_fulfillment_type = 'delivery' THEN
    INSERT INTO public.delivery_orders (
      restaurant_id,
      order_id,
      customer_name,
      customer_phone,
      customer_email,
      zip_code,
      street,
      number,
      complement,
      neighborhood,
      city,
      state,
      reference_point,
      delivery_fee,
      subtotal,
      total,
      payment_method,
      payment_status,
      change_for,
      notes,
      estimated_delivery_minutes,
      status,
      fulfillment_type
    )
    VALUES (
      v_restaurant_id,
      v_order_id,
      v_customer_name,
      COALESCE(v_customer_phone, ''),
      v_customer_email,
      btrim(COALESCE(payload#>>'{address,zip_code}', '')),
      btrim(COALESCE(payload#>>'{address,street}', '')),
      btrim(COALESCE(payload#>>'{address,number}', '')),
      NULLIF(btrim(COALESCE(payload#>>'{address,complement}', '')), ''),
      btrim(COALESCE(payload#>>'{address,neighborhood}', '')),
      btrim(COALESCE(payload#>>'{address,city}', '')),
      btrim(COALESCE(payload#>>'{address,state}', '')),
      NULLIF(btrim(COALESCE(payload#>>'{address,reference_point}', '')), ''),
      v_delivery_fee,
      v_subtotal,
      v_total,
      v_payment_method,
      v_payment_status,
      v_change_for,
      v_notes,
      v_estimated_minutes,
      CASE WHEN v_requires_online_payment THEN 'awaiting_payment' ELSE 'pending' END,
      'delivery'
    )
    RETURNING id INTO v_delivery_order_id;
  END IF;

  RETURN jsonb_build_object(
    'order_id', v_order_id,
    'delivery_order_id', v_delivery_order_id,
    'tracking_id', COALESCE(v_delivery_order_id, v_order_id),
    'order_number', v_order_number,
    'fulfillment_type', v_fulfillment_type,
    'coupon_code', CASE WHEN v_coupon.id IS NULL THEN NULL ELSE v_coupon.code END,
    'discount_amount', v_discount,
    'total', v_total,
    'payment_status', v_payment_status,
    'requires_online_payment', v_requires_online_payment
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_public_menu_order(jsonb) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_public_order_tracking(p_tracking_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_delivery public.delivery_orders%ROWTYPE;
  v_order public.orders%ROWTYPE;
  v_restaurant record;
  v_items jsonb := '[]'::jsonb;
  v_history jsonb := '[]'::jsonb;
  v_payment jsonb := NULL;
BEGIN
  SELECT * INTO v_delivery
  FROM public.delivery_orders
  WHERE id = p_tracking_id
  LIMIT 1;

  IF v_delivery.id IS NOT NULL THEN
    SELECT * INTO v_order FROM public.orders WHERE id = v_delivery.order_id;
  ELSE
    SELECT * INTO v_order FROM public.orders WHERE id = p_tracking_id;
  END IF;

  IF v_order.id IS NULL THEN
    RAISE EXCEPTION 'Pedido não encontrado.';
  END IF;

  SELECT r.id, r.name, r.logo_url, r.phone, r.phone_whatsapp
  INTO v_restaurant
  FROM public.restaurants r
  WHERE r.id = v_order.restaurant_id;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', oi.id,
    'product_id', oi.product_id,
    'product_name', oi.product_name,
    'quantity', oi.quantity,
    'price', oi.price,
    'observations', oi.observations,
    'addons', COALESCE(oi.addons, '[]'::jsonb)
  ) ORDER BY oi.created_at), '[]'::jsonb)
  INTO v_items
  FROM public.order_items oi
  WHERE oi.order_id = v_order.id;

  IF v_delivery.id IS NOT NULL THEN
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'status', h.new_status,
      'previous_status', h.previous_status,
      'notes', h.notes,
      'created_at', h.created_at
    ) ORDER BY h.created_at), '[]'::jsonb)
    INTO v_history
    FROM public.delivery_order_status_history h
    WHERE h.delivery_order_id = v_delivery.id;
  END IF;

  SELECT jsonb_build_object(
    'status', op.status,
    'payment_method', op.payment_method,
    'provider', op.provider,
    'amount', op.amount,
    'qr_code', op.qr_code,
    'qr_code_url', op.qr_code_url,
    'checkout_url', op.checkout_url,
    'expires_at', op.expires_at,
    'paid_at', op.paid_at
  )
  INTO v_payment
  FROM public.order_payments op
  WHERE op.order_id = v_order.id
  ORDER BY op.created_at DESC
  LIMIT 1;

  RETURN jsonb_build_object(
    'id', COALESCE(v_delivery.id, v_order.id),
    'order_id', v_order.id,
    'delivery_order_id', v_delivery.id,
    'order_number', v_order.order_number,
    'restaurant_id', v_order.restaurant_id,
    'restaurant', jsonb_build_object(
      'id', v_restaurant.id,
      'name', v_restaurant.name,
      'logo_url', v_restaurant.logo_url,
      'phone', v_restaurant.phone,
      'phone_whatsapp', v_restaurant.phone_whatsapp
    ),
    'customer_name', v_order.customer_name,
    'customer_phone', v_order.customer_phone,
    'customer_email', v_order.customer_email,
    'fulfillment_type', CASE
      WHEN v_order.order_type = 'mesa' THEN 'table'
      WHEN v_order.order_type = 'delivery' THEN 'delivery'
      ELSE 'pickup'
    END,
    'status', COALESCE(v_delivery.status, v_order.status),
    'order_status', v_order.status,
    'payment_method', COALESCE(v_delivery.payment_method, v_order.payment_method),
    'payment_status', COALESCE(v_delivery.payment_status, v_order.payment_status),
    'payment_provider', COALESCE(v_delivery.payment_provider, v_order.payment_provider),
    'payment_reference', COALESCE(v_delivery.payment_reference, v_order.payment_reference),
    'paid_at', COALESCE(v_delivery.paid_at, v_order.paid_at),
    'payment', v_payment,
    'change_for', v_delivery.change_for,
    'delivery_fee', COALESCE(v_delivery.delivery_fee, 0),
    'subtotal', COALESCE(v_delivery.subtotal, v_order.total),
    'total', COALESCE(v_delivery.total, v_order.total),
    'estimated_delivery_minutes', v_delivery.estimated_delivery_minutes,
    'address', CASE WHEN v_delivery.id IS NULL THEN NULL ELSE jsonb_build_object(
      'zip_code', v_delivery.zip_code,
      'street', v_delivery.street,
      'number', v_delivery.number,
      'complement', v_delivery.complement,
      'neighborhood', v_delivery.neighborhood,
      'city', v_delivery.city,
      'state', v_delivery.state,
      'reference_point', v_delivery.reference_point
    ) END,
    'zip_code', v_delivery.zip_code,
    'street', v_delivery.street,
    'number', v_delivery.number,
    'complement', v_delivery.complement,
    'neighborhood', v_delivery.neighborhood,
    'city', v_delivery.city,
    'state', v_delivery.state,
    'reference_point', v_delivery.reference_point,
    'items', v_items,
    'history', v_history,
    'created_at', v_order.created_at,
    'updated_at', GREATEST(v_order.updated_at, COALESCE(v_delivery.updated_at, v_order.updated_at))
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_order_tracking(uuid) TO anon, authenticated;
