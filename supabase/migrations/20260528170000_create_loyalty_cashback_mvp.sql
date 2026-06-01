-- Bloco 2: Loyalty/cashback MVP.
-- Provides restaurant settings, signed customer ledger, automatic earn on
-- finalized orders and dashboard/public quote RPCs.

CREATE TABLE IF NOT EXISTS public.loyalty_program_settings (
  restaurant_id uuid PRIMARY KEY REFERENCES public.restaurants(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT false,
  cashback_percent numeric(5, 2) NOT NULL DEFAULT 3,
  min_order_value numeric(10, 2) NOT NULL DEFAULT 0,
  max_redeem_percent numeric(5, 2) NOT NULL DEFAULT 30,
  credit_valid_days integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT loyalty_cashback_percent_check CHECK (cashback_percent >= 0 AND cashback_percent <= 50),
  CONSTRAINT loyalty_min_order_value_check CHECK (min_order_value >= 0),
  CONSTRAINT loyalty_max_redeem_percent_check CHECK (max_redeem_percent >= 0 AND max_redeem_percent <= 100),
  CONSTRAINT loyalty_credit_valid_days_check CHECK (credit_valid_days IS NULL OR credit_valid_days BETWEEN 1 AND 3650)
);

CREATE TABLE IF NOT EXISTS public.loyalty_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  phone_normalized text NOT NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  type text NOT NULL,
  amount numeric(10, 2) NOT NULL,
  description text,
  expires_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT loyalty_transactions_phone_check CHECK (phone_normalized ~ '^\d{8,15}$'),
  CONSTRAINT loyalty_transactions_type_check CHECK (
    type IN ('earn', 'redeem', 'earn_reversal', 'redeem_reversal', 'adjustment')
  ),
  CONSTRAINT loyalty_transactions_amount_check CHECK (amount <> 0)
);

ALTER TABLE public.loyalty_program_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_program_settings FORCE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_transactions FORCE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_restaurant_phone
  ON public.loyalty_transactions (restaurant_id, phone_normalized, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_order
  ON public.loyalty_transactions (order_id)
  WHERE order_id IS NOT NULL;

DROP POLICY IF EXISTS "Restaurant staff can view own loyalty settings" ON public.loyalty_program_settings;
CREATE POLICY "Restaurant staff can view own loyalty settings"
ON public.loyalty_program_settings FOR SELECT
TO authenticated
USING (
  restaurant_id = public.get_user_restaurant_id()
  OR public.is_super_admin(auth.uid())
);

DROP POLICY IF EXISTS "Restaurant managers can manage own loyalty settings" ON public.loyalty_program_settings;
CREATE POLICY "Restaurant managers can manage own loyalty settings"
ON public.loyalty_program_settings FOR ALL
TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR public.user_has_restaurant_permission(restaurant_id, 'settings_manage'::public.permission_type)
)
WITH CHECK (
  public.is_super_admin(auth.uid())
  OR public.user_has_restaurant_permission(restaurant_id, 'settings_manage'::public.permission_type)
);

DROP POLICY IF EXISTS "Restaurant staff can view own loyalty transactions" ON public.loyalty_transactions;
CREATE POLICY "Restaurant staff can view own loyalty transactions"
ON public.loyalty_transactions FOR SELECT
TO authenticated
USING (
  restaurant_id = public.get_user_restaurant_id()
  OR public.is_super_admin(auth.uid())
);

DROP TRIGGER IF EXISTS update_loyalty_program_settings_updated_at ON public.loyalty_program_settings;
CREATE TRIGGER update_loyalty_program_settings_updated_at
BEFORE UPDATE ON public.loyalty_program_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.assert_loyalty_view_access(p_restaurant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_restaurant_id IS NULL THEN
    RAISE EXCEPTION 'Restaurante nao informado.';
  END IF;

  IF public.is_super_admin(auth.uid()) THEN
    RETURN;
  END IF;

  IF public.user_has_restaurant_permission(p_restaurant_id, 'orders_view'::public.permission_type)
    OR public.user_has_restaurant_permission(p_restaurant_id, 'orders_metrics_view'::public.permission_type)
    OR public.user_has_restaurant_permission(p_restaurant_id, 'reports_view'::public.permission_type)
    OR public.user_has_restaurant_permission(p_restaurant_id, 'settings_manage'::public.permission_type)
  THEN
    RETURN;
  END IF;

  RAISE EXCEPTION 'Sem permissao para acessar fidelidade.';
END;
$$;

REVOKE ALL ON FUNCTION public.assert_loyalty_view_access(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.assert_loyalty_view_access(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.assert_loyalty_manage_access(p_restaurant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_restaurant_id IS NULL THEN
    RAISE EXCEPTION 'Restaurante nao informado.';
  END IF;

  IF public.is_super_admin(auth.uid())
    OR public.user_has_restaurant_permission(p_restaurant_id, 'settings_manage'::public.permission_type)
  THEN
    RETURN;
  END IF;

  RAISE EXCEPTION 'Sem permissao para configurar fidelidade.';
END;
$$;

REVOKE ALL ON FUNCTION public.assert_loyalty_manage_access(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.assert_loyalty_manage_access(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.save_restaurant_loyalty_settings(
  p_restaurant_id uuid,
  p_patch jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_saved public.loyalty_program_settings%ROWTYPE;
BEGIN
  PERFORM public.assert_loyalty_manage_access(p_restaurant_id);

  INSERT INTO public.loyalty_program_settings (
    restaurant_id,
    enabled,
    cashback_percent,
    min_order_value,
    max_redeem_percent,
    credit_valid_days
  )
  VALUES (
    p_restaurant_id,
    COALESCE((p_patch->>'enabled')::boolean, false),
    GREATEST(0, LEAST(50, COALESCE(NULLIF(p_patch->>'cashback_percent', '')::numeric, 3))),
    GREATEST(0, COALESCE(NULLIF(p_patch->>'min_order_value', '')::numeric, 0)),
    GREATEST(0, LEAST(100, COALESCE(NULLIF(p_patch->>'max_redeem_percent', '')::numeric, 30))),
    NULLIF(p_patch->>'credit_valid_days', '')::integer
  )
  ON CONFLICT (restaurant_id) DO UPDATE
  SET
    enabled = EXCLUDED.enabled,
    cashback_percent = EXCLUDED.cashback_percent,
    min_order_value = EXCLUDED.min_order_value,
    max_redeem_percent = EXCLUDED.max_redeem_percent,
    credit_valid_days = EXCLUDED.credit_valid_days,
    updated_at = now()
  RETURNING * INTO v_saved;

  RETURN to_jsonb(v_saved);
END;
$$;

REVOKE ALL ON FUNCTION public.save_restaurant_loyalty_settings(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_restaurant_loyalty_settings(uuid, jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_restaurant_loyalty_dashboard(p_restaurant_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  PERFORM public.assert_loyalty_view_access(p_restaurant_id);

  WITH settings AS (
    SELECT *
    FROM public.loyalty_program_settings
    WHERE restaurant_id = p_restaurant_id
  ),
  transactions AS (
    SELECT *
    FROM public.loyalty_transactions
    WHERE restaurant_id = p_restaurant_id
  ),
  balances AS (
    SELECT
      phone_normalized,
      COALESCE(sum(amount) FILTER (WHERE expires_at IS NULL OR expires_at > now()), 0)::numeric AS balance,
      COALESCE(sum(amount) FILTER (WHERE amount > 0), 0)::numeric AS total_earned,
      ABS(COALESCE(sum(amount) FILTER (WHERE amount < 0), 0))::numeric AS total_redeemed,
      max(created_at) AS last_transaction_at
    FROM transactions
    GROUP BY phone_normalized
  ),
  order_names AS (
    SELECT
      public.normalize_customer_phone(customer_phone) AS phone_normalized,
      (array_agg(NULLIF(btrim(customer_name), '') ORDER BY created_at DESC))[1] AS name
    FROM public.orders
    WHERE restaurant_id = p_restaurant_id
      AND public.normalize_customer_phone(customer_phone) IS NOT NULL
    GROUP BY public.normalize_customer_phone(customer_phone)
  ),
  profile_names AS (
    SELECT phone_normalized, name
    FROM public.crm_customer_profiles
    WHERE restaurant_id = p_restaurant_id
  ),
  customers AS (
    SELECT
      b.phone_normalized,
      COALESCE(p.name, o.name, 'Cliente') AS name,
      b.balance,
      b.total_earned,
      b.total_redeemed,
      b.last_transaction_at
    FROM balances b
    LEFT JOIN profile_names p ON p.phone_normalized = b.phone_normalized
    LEFT JOIN order_names o ON o.phone_normalized = b.phone_normalized
    WHERE b.balance <> 0 OR b.total_earned <> 0 OR b.total_redeemed <> 0
    ORDER BY b.balance DESC, b.last_transaction_at DESC NULLS LAST
    LIMIT 100
  )
  SELECT jsonb_build_object(
    'settings', COALESCE((SELECT to_jsonb(settings) FROM settings), jsonb_build_object(
      'restaurant_id', p_restaurant_id,
      'enabled', false,
      'cashback_percent', 3,
      'min_order_value', 0,
      'max_redeem_percent', 30,
      'credit_valid_days', null
    )),
    'metrics', jsonb_build_object(
      'active_balance', COALESCE((SELECT sum(balance) FROM balances WHERE balance > 0), 0),
      'customers_with_balance', COALESCE((SELECT count(*) FROM balances WHERE balance > 0), 0),
      'total_earned', COALESCE((SELECT sum(amount) FROM transactions WHERE amount > 0), 0),
      'total_redeemed', ABS(COALESCE((SELECT sum(amount) FROM transactions WHERE amount < 0), 0))
    ),
    'customers', COALESCE((SELECT jsonb_agg(to_jsonb(customers)) FROM customers), '[]'::jsonb),
    'recent_transactions', COALESCE((
      SELECT jsonb_agg(to_jsonb(t))
      FROM (
        SELECT
          lt.id,
          lt.phone_normalized,
          COALESCE(pn.name, onm.name, 'Cliente') AS customer_name,
          lt.order_id,
          lt.type,
          lt.amount,
          lt.description,
          lt.expires_at,
          lt.created_at
        FROM transactions lt
        LEFT JOIN profile_names pn ON pn.phone_normalized = lt.phone_normalized
        LEFT JOIN order_names onm ON onm.phone_normalized = lt.phone_normalized
        ORDER BY lt.created_at DESC
        LIMIT 30
      ) t
    ), '[]'::jsonb)
  )
  INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_restaurant_loyalty_dashboard(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_restaurant_loyalty_dashboard(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_public_loyalty_quote(
  p_restaurant_id uuid,
  p_phone text,
  p_order_subtotal numeric DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_phone text := public.normalize_customer_phone(p_phone);
  v_settings public.loyalty_program_settings%ROWTYPE;
  v_balance numeric := 0;
  v_subtotal numeric := GREATEST(COALESCE(p_order_subtotal, 0), 0);
  v_max_redeem numeric := 0;
  v_earn_estimate numeric := 0;
BEGIN
  IF p_restaurant_id IS NULL OR v_phone IS NULL THEN
    RETURN jsonb_build_object(
      'enabled', false,
      'balance', 0,
      'max_redeem_amount', 0,
      'earn_estimate', 0
    );
  END IF;

  SELECT *
  INTO v_settings
  FROM public.loyalty_program_settings
  WHERE restaurant_id = p_restaurant_id
    AND enabled = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'enabled', false,
      'balance', 0,
      'max_redeem_amount', 0,
      'earn_estimate', 0
    );
  END IF;

  SELECT COALESCE(sum(amount), 0)::numeric
  INTO v_balance
  FROM public.loyalty_transactions
  WHERE restaurant_id = p_restaurant_id
    AND phone_normalized = v_phone
    AND (expires_at IS NULL OR expires_at > now());

  IF v_subtotal >= COALESCE(v_settings.min_order_value, 0) THEN
    v_max_redeem := LEAST(
      GREATEST(v_balance, 0),
      v_subtotal,
      round((v_subtotal * COALESCE(v_settings.max_redeem_percent, 0) / 100)::numeric, 2)
    );
    v_earn_estimate := round((v_subtotal * COALESCE(v_settings.cashback_percent, 0) / 100)::numeric, 2);
  END IF;

  RETURN jsonb_build_object(
    'enabled', true,
    'balance', GREATEST(v_balance, 0),
    'max_redeem_amount', GREATEST(v_max_redeem, 0),
    'earn_estimate', GREATEST(v_earn_estimate, 0),
    'cashback_percent', v_settings.cashback_percent,
    'min_order_value', v_settings.min_order_value,
    'max_redeem_percent', v_settings.max_redeem_percent
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_loyalty_quote(uuid, text, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_loyalty_quote(uuid, text, numeric) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.apply_order_loyalty_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_settings public.loyalty_program_settings%ROWTYPE;
  v_phone text;
  v_amount numeric := 0;
  v_expires_at timestamptz;
  v_existing_earned numeric := 0;
  v_existing_redeemed numeric := 0;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  v_phone := public.normalize_customer_phone(NEW.customer_phone);

  IF v_phone IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'finalizado'
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'finalizado') THEN
    SELECT *
    INTO v_settings
    FROM public.loyalty_program_settings
    WHERE restaurant_id = NEW.restaurant_id
      AND enabled = true;

    IF FOUND
       AND COALESCE(v_settings.cashback_percent, 0) > 0
       AND COALESCE(NEW.total, 0) >= COALESCE(v_settings.min_order_value, 0) THEN
      v_amount := round((COALESCE(NEW.total, 0) * v_settings.cashback_percent / 100)::numeric, 2);
      v_expires_at := CASE
        WHEN v_settings.credit_valid_days IS NULL THEN NULL
        ELSE now() + make_interval(days => v_settings.credit_valid_days)
      END;

      IF v_amount > 0 THEN
        INSERT INTO public.loyalty_transactions (
          restaurant_id,
          phone_normalized,
          order_id,
          type,
          amount,
          description,
          expires_at,
          metadata
        )
        VALUES (
          NEW.restaurant_id,
          v_phone,
          NEW.id,
          'earn',
          v_amount,
          'Cashback de pedido finalizado',
          v_expires_at,
          jsonb_build_object('order_total', NEW.total, 'cashback_percent', v_settings.cashback_percent)
        );
      END IF;
    END IF;
  END IF;

  IF TG_OP = 'UPDATE'
     AND OLD.status = 'finalizado'
     AND NEW.status IS DISTINCT FROM 'finalizado' THEN
    SELECT COALESCE(sum(amount), 0)
    INTO v_existing_earned
    FROM public.loyalty_transactions
    WHERE restaurant_id = NEW.restaurant_id
      AND order_id = NEW.id
      AND type = 'earn';

    IF v_existing_earned > 0 THEN
      INSERT INTO public.loyalty_transactions (
        restaurant_id,
        phone_normalized,
        order_id,
        type,
        amount,
        description,
        metadata
      )
      VALUES (
        NEW.restaurant_id,
        v_phone,
        NEW.id,
        'earn_reversal',
        -v_existing_earned,
        'Estorno de cashback por reabertura/cancelamento',
        jsonb_build_object('previous_status', OLD.status, 'new_status', NEW.status)
      );
    END IF;

    SELECT ABS(COALESCE(sum(amount), 0))
    INTO v_existing_redeemed
    FROM public.loyalty_transactions
    WHERE restaurant_id = NEW.restaurant_id
      AND order_id = NEW.id
      AND type = 'redeem';

    IF v_existing_redeemed > 0 THEN
      INSERT INTO public.loyalty_transactions (
        restaurant_id,
        phone_normalized,
        order_id,
        type,
        amount,
        description,
        metadata
      )
      VALUES (
        NEW.restaurant_id,
        v_phone,
        NEW.id,
        'redeem_reversal',
        v_existing_redeemed,
        'Devolucao de credito por reabertura/cancelamento',
        jsonb_build_object('previous_status', OLD.status, 'new_status', NEW.status)
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_apply_order_loyalty_event ON public.orders;
CREATE TRIGGER trg_apply_order_loyalty_event
AFTER INSERT OR UPDATE OF status ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.apply_order_loyalty_event();

COMMENT ON TABLE public.loyalty_program_settings IS
  'Configuracao de cashback/fidelidade por restaurante.';

COMMENT ON TABLE public.loyalty_transactions IS
  'Ledger assinado de creditos e debitos de fidelidade por telefone normalizado.';
