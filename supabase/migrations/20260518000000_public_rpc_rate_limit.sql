-- =====================================================================
-- Sprint 1 — Rate limit para RPCs públicas.
--
-- Endpoints expostos a anon (cardápio público, tracking, cupom) precisam
-- de proteção contra abuso. Esta migration:
--
--   1. Cria tabela public_rate_limit_buckets (privada via RLS forçado).
--   2. Cria helpers _client_request_fingerprint, _enforce_public_rate_limit
--      e _prune_rate_limit_buckets.
--   3. Re-cria as RPCs validate_public_coupon, get_public_order_tracking
--      e create_public_menu_order chamando o enforcement no início.
--
-- O enforcement usa fingerprint baseado em IP (x-forwarded-for / cf-
-- connecting-ip / x-real-ip), com fallback para auth.uid() ou 'anon'.
-- Janelas de tempo: fixed-window via date_trunc; quando o limite excede,
-- RAISE EXCEPTION (SQLSTATE 54000) que rola o INSERT do bucket back,
-- mantendo o contador estável e bloqueando chamadas seguintes.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.public_rate_limit_buckets (
  bucket_key text NOT NULL,
  window_start timestamptz NOT NULL,
  hit_count integer NOT NULL DEFAULT 0,
  last_hit_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (bucket_key, window_start)
);

CREATE INDEX IF NOT EXISTS idx_public_rate_limit_window
  ON public.public_rate_limit_buckets (window_start);

ALTER TABLE public.public_rate_limit_buckets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_rate_limit_buckets FORCE ROW LEVEL SECURITY;

REVOKE ALL ON public.public_rate_limit_buckets FROM PUBLIC, anon, authenticated;

COMMENT ON TABLE public.public_rate_limit_buckets IS
  'Buckets de rate limit para RPCs públicas. Acesso só via SECURITY DEFINER helpers.';

-- ---------------------------------------------------------------------
-- Fingerprint do cliente (IP via headers do PostgREST; fallback auth/anon)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._client_request_fingerprint()
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_headers_raw text;
  v_headers jsonb;
  v_xff text;
  v_ip text;
BEGIN
  BEGIN
    v_headers_raw := current_setting('request.headers', true);
  EXCEPTION WHEN OTHERS THEN
    v_headers_raw := NULL;
  END;

  IF v_headers_raw IS NULL OR v_headers_raw = '' THEN
    RETURN 'auth:' || COALESCE(auth.uid()::text, 'anon');
  END IF;

  BEGIN
    v_headers := v_headers_raw::jsonb;
  EXCEPTION WHEN OTHERS THEN
    v_headers := NULL;
  END;

  IF v_headers IS NULL THEN
    RETURN 'auth:' || COALESCE(auth.uid()::text, 'anon');
  END IF;

  v_xff := v_headers->>'x-forwarded-for';
  IF v_xff IS NOT NULL AND v_xff <> '' THEN
    v_ip := btrim(split_part(v_xff, ',', 1));
  END IF;

  IF v_ip IS NULL OR v_ip = '' THEN
    v_ip := v_headers->>'cf-connecting-ip';
  END IF;

  IF v_ip IS NULL OR v_ip = '' THEN
    v_ip := v_headers->>'x-real-ip';
  END IF;

  IF v_ip IS NULL OR v_ip = '' THEN
    RETURN 'auth:' || COALESCE(auth.uid()::text, 'anon');
  END IF;

  RETURN 'ip:' || v_ip;
END;
$$;

REVOKE ALL ON FUNCTION public._client_request_fingerprint() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._client_request_fingerprint() TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------
-- Poda probabilística de buckets antigos.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._prune_rate_limit_buckets()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.public_rate_limit_buckets
  WHERE window_start < now() - interval '1 hour';
$$;

REVOKE ALL ON FUNCTION public._prune_rate_limit_buckets() FROM PUBLIC;

-- ---------------------------------------------------------------------
-- Enforcement: fixed window de p_window_seconds, máximo p_max hits.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._enforce_public_rate_limit(
  p_scope text,
  p_max integer,
  p_window_seconds integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fingerprint text;
  v_bucket_key text;
  v_window_start timestamptz;
  v_count integer;
BEGIN
  IF p_max IS NULL OR p_max <= 0 OR p_window_seconds IS NULL OR p_window_seconds <= 0 THEN
    RETURN;
  END IF;

  v_fingerprint := public._client_request_fingerprint();
  v_bucket_key := p_scope || '|' || v_fingerprint;
  v_window_start := to_timestamp(
    floor(extract(epoch FROM now()) / p_window_seconds) * p_window_seconds
  );

  INSERT INTO public.public_rate_limit_buckets AS b (bucket_key, window_start, hit_count, last_hit_at)
  VALUES (v_bucket_key, v_window_start, 1, now())
  ON CONFLICT (bucket_key, window_start)
  DO UPDATE SET
    hit_count = b.hit_count + 1,
    last_hit_at = now()
  RETURNING b.hit_count INTO v_count;

  IF v_count > p_max THEN
    RAISE EXCEPTION USING
      ERRCODE = '54000',
      MESSAGE = 'Limite de requisições atingido. Tente novamente em alguns instantes.';
  END IF;

  -- Poda probabilística (≈1% das chamadas) para evitar crescimento ilimitado
  IF random() < 0.01 THEN
    PERFORM public._prune_rate_limit_buckets();
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public._enforce_public_rate_limit(text, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._enforce_public_rate_limit(text, integer, integer)
  TO anon, authenticated, service_role;

-- =====================================================================
-- RPCs públicas atualizadas com rate limit no topo.
-- =====================================================================

-- ---------------------------------------------------------------------
-- validate_public_coupon: 30/min por IP.
-- ---------------------------------------------------------------------
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
  PERFORM public._enforce_public_rate_limit('coupon_validate', 30, 60);

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

-- ---------------------------------------------------------------------
-- get_public_order_tracking: 120/min por IP (suporta polling).
-- Mantém mascaramento de QR/checkout pós-pagamento.
-- ---------------------------------------------------------------------
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
  PERFORM public._enforce_public_rate_limit('order_tracking', 120, 60);

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
    'name', oi.product_name,
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
      'new_status', h.new_status,
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
    'qr_code', CASE
      WHEN op.paid_at IS NOT NULL
        OR op.status IN ('paid', 'captured', 'succeeded', 'confirmed')
        OR COALESCE(v_delivery.payment_status, v_order.payment_status) IN ('paid', 'pago')
      THEN NULL
      ELSE op.qr_code
    END,
    'qr_code_url', CASE
      WHEN op.paid_at IS NOT NULL
        OR op.status IN ('paid', 'captured', 'succeeded', 'confirmed')
        OR COALESCE(v_delivery.payment_status, v_order.payment_status) IN ('paid', 'pago')
      THEN NULL
      ELSE op.qr_code_url
    END,
    'checkout_url', CASE
      WHEN op.paid_at IS NOT NULL
        OR op.status IN ('paid', 'captured', 'succeeded', 'confirmed')
        OR COALESCE(v_delivery.payment_status, v_order.payment_status) IN ('paid', 'pago')
      THEN NULL
      ELSE op.checkout_url
    END,
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
    'fulfillment_type', CASE
      WHEN v_order.order_type = 'mesa' THEN 'table'
      WHEN v_order.order_type = 'delivery' THEN 'delivery'
      ELSE 'pickup'
    END,
    'status', COALESCE(v_delivery.status, v_order.status),
    'order_status', v_order.status,
    'payment_method', COALESCE(v_delivery.payment_method, v_order.payment_method),
    'payment_status', COALESCE(v_delivery.payment_status, v_order.payment_status),
    'paid_at', COALESCE(v_delivery.paid_at, v_order.paid_at),
    'payment', v_payment,
    'change_for', v_delivery.change_for,
    'delivery_fee', COALESCE(v_delivery.delivery_fee, 0),
    'subtotal', COALESCE(v_delivery.subtotal, v_order.total),
    'total', COALESCE(v_delivery.total, v_order.total),
    'estimated_delivery_minutes', v_delivery.estimated_delivery_minutes,
    'items', v_items,
    'history', v_history,
    'created_at', v_order.created_at,
    'updated_at', GREATEST(v_order.updated_at, COALESCE(v_delivery.updated_at, v_order.updated_at))
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_order_tracking(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_order_tracking(uuid) TO anon, authenticated;

COMMENT ON FUNCTION public.get_public_order_tracking(uuid) IS
  'Tracking público sanitizado + rate limit 120/min por IP.';
