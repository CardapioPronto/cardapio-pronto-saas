-- Testes de integração (SQL) do programa de indicações.
-- Executar com Supabase local ou DATABASE_URL apontando para o projeto:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/referral_program_rpcs.sql
-- Ou: npm run test:referral-db

BEGIN;

CREATE OR REPLACE FUNCTION _referral_test_assert(p_label text, p_ok boolean)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT p_ok THEN
    RAISE EXCEPTION 'ASSERT FAILED: %', p_label;
  END IF;
  RAISE NOTICE 'OK: %', p_label;
END;
$$;

DO $$
DECLARE
  v_public jsonb;
  v_attr jsonb;
BEGIN
  v_public := public.get_referral_program_public_settings();
  PERFORM _referral_test_assert(
    'public settings has program_enabled',
    v_public ? 'program_enabled'
  );
  PERFORM _referral_test_assert(
    'public settings has terms_version',
    v_public ? 'terms_version'
  );
  PERFORM _referral_test_assert(
    'public settings has terms_content key',
    v_public ? 'terms_content'
  );

  v_attr := public.attribute_restaurant_referral(
    NULL,
    'INVALID',
    now()
  );
  PERFORM _referral_test_assert(
    'missing restaurant',
    (v_attr->>'attributed')::boolean = false
      AND v_attr->>'reason' = 'missing_restaurant'
  );

  v_attr := public.attribute_restaurant_referral(
    gen_random_uuid(),
    'AB',
    now()
  );
  PERFORM _referral_test_assert(
    'invalid code length',
    (v_attr->>'attributed')::boolean = false
      AND v_attr->>'reason' = 'invalid_code'
  );

  v_attr := public.attribute_restaurant_referral(
    gen_random_uuid(),
    'ZZZZNOTFOUND',
    now()
  );
  PERFORM _referral_test_assert(
    'unknown code or program off',
    (v_attr->>'attributed')::boolean = false
      AND (v_attr->>'reason') IN ('code_not_found', 'program_disabled', 'not_accepting_referrals', 'restaurant_not_found')
  );
END;
$$;

ROLLBACK;
