CREATE OR REPLACE FUNCTION public.insert_paid_checkout_subscription(
  p_restaurant_id uuid,
  p_plan_id uuid,
  p_status text,
  p_is_trial boolean,
  p_trial_start timestamp with time zone,
  p_trial_ends_at timestamp with time zone,
  p_billing_cycle text,
  p_start_date timestamp with time zone,
  p_current_period_start timestamp with time zone,
  p_current_period_end timestamp with time zone,
  p_next_billing_at timestamp with time zone,
  p_pagarme_subscription_id text,
  p_pagarme_customer_id text,
  p_last_payment_status text DEFAULT NULL,
  p_last_payment_at timestamp with time zone DEFAULT NULL
)
RETURNS public.subscriptions
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_subscription public.subscriptions;
BEGIN
  IF p_status <> 'active' THEN
    RAISE EXCEPTION 'paid checkout must be active before replacing current entitlement, got %', p_status
      USING ERRCODE = '23514';
  END IF;

  UPDATE public.subscriptions
  SET
    status = 'canceled',
    end_date = now(),
    updated_at = now()
  WHERE restaurant_id = p_restaurant_id
    AND status IN ('active', 'trialing', 'past_due', 'pending');

  INSERT INTO public.subscriptions (
    restaurant_id,
    plan_id,
    status,
    is_trial,
    trial_start,
    trial_ends_at,
    billing_cycle,
    start_date,
    current_period_start,
    current_period_end,
    next_billing_at,
    pagarme_subscription_id,
    pagarme_customer_id,
    last_payment_status,
    last_payment_at
  )
  VALUES (
    p_restaurant_id,
    p_plan_id,
    p_status,
    p_is_trial,
    p_trial_start,
    p_trial_ends_at,
    p_billing_cycle,
    p_start_date,
    p_current_period_start,
    p_current_period_end,
    p_next_billing_at,
    p_pagarme_subscription_id,
    p_pagarme_customer_id,
    p_last_payment_status,
    p_last_payment_at
  )
  RETURNING * INTO v_subscription;

  RETURN v_subscription;
END;
$$;

REVOKE ALL ON FUNCTION public.insert_paid_checkout_subscription(
  uuid,
  uuid,
  text,
  boolean,
  timestamp with time zone,
  timestamp with time zone,
  text,
  timestamp with time zone,
  timestamp with time zone,
  timestamp with time zone,
  timestamp with time zone,
  text,
  text,
  text,
  timestamp with time zone
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.insert_paid_checkout_subscription(
  uuid,
  uuid,
  text,
  boolean,
  timestamp with time zone,
  timestamp with time zone,
  text,
  timestamp with time zone,
  timestamp with time zone,
  timestamp with time zone,
  timestamp with time zone,
  text,
  text,
  text,
  timestamp with time zone
) TO service_role;
