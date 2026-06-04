-- Programa de indicações — fase 6: funil e ranking no snapshot administrativo.

CREATE OR REPLACE FUNCTION public.list_referral_admin_snapshot()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL OR NOT public.is_super_admin(v_user_id) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  PERFORM public.mature_referral_commissions(NULL);

  RETURN (
    WITH
      funnel AS (
        SELECT
          (SELECT count(*)::bigint FROM public.restaurant_referrals rr WHERE rr.status = 'active') AS attributed_restaurants,
          (
            SELECT count(DISTINCT l.restaurant_id)::bigint
            FROM public.referral_commission_ledger l
            WHERE l.restaurant_paid_at IS NOT NULL
              AND l.status IN ('pending', 'approved', 'paid')
          ) AS restaurants_with_paid_subscription,
          (
            SELECT coalesce(
              sum(CASE WHEN l.status <> 'reversed' THEN l.commission_amount_cents ELSE 0 END),
              0
            )::bigint
            FROM public.referral_commission_ledger l
          ) AS commission_generated_cents,
          (
            SELECT coalesce(sum(l.commission_amount_cents), 0)::bigint
            FROM public.referral_commission_ledger l
            WHERE l.status = 'paid'
          ) AS commission_paid_cents,
          (
            SELECT count(*)::bigint
            FROM public.affiliate_payout_requests r
            WHERE r.status IN ('requested', 'processing')
          ) AS open_payout_requests
      ),
      top_affiliates AS (
        SELECT coalesce(
          jsonb_agg(
            jsonb_build_object(
              'user_id', x.user_id,
              'referral_code', x.referral_code,
              'display_name', x.display_name,
              'attributed_restaurants', x.attributed_restaurants,
              'paying_restaurants', x.paying_restaurants,
              'generated_commission_cents', x.generated_commission_cents,
              'paid_commission_cents', x.paid_commission_cents
            )
            ORDER BY x.generated_commission_cents DESC, x.attributed_restaurants DESC
          ),
          '[]'::jsonb
        ) AS data
        FROM (
          WITH
            rr AS (
              SELECT
                referrer_user_id AS user_id,
                count(DISTINCT restaurant_id)::bigint AS attributed_restaurants
              FROM public.restaurant_referrals
              WHERE status = 'active'
              GROUP BY referrer_user_id
            ),
            lg AS (
              SELECT
                referrer_user_id AS user_id,
                count(DISTINCT restaurant_id) FILTER (
                  WHERE restaurant_paid_at IS NOT NULL
                    AND status IN ('pending', 'approved', 'paid')
                )::bigint AS paying_restaurants,
                coalesce(sum(CASE WHEN status <> 'reversed' THEN commission_amount_cents ELSE 0 END), 0)::bigint AS generated_commission_cents,
                coalesce(sum(CASE WHEN status = 'paid' THEN commission_amount_cents ELSE 0 END), 0)::bigint AS paid_commission_cents
              FROM public.referral_commission_ledger
              GROUP BY referrer_user_id
            )
          SELECT
            ap.user_id,
            ap.referral_code,
            coalesce(
              nullif(trim(ap.display_name), ''),
              nullif(trim(u.name), ''),
              nullif(trim(u.email), ''),
              ap.referral_code
            ) AS display_name,
            coalesce(rr.attributed_restaurants, 0)::bigint AS attributed_restaurants,
            coalesce(lg.paying_restaurants, 0)::bigint AS paying_restaurants,
            coalesce(lg.generated_commission_cents, 0)::bigint AS generated_commission_cents,
            coalesce(lg.paid_commission_cents, 0)::bigint AS paid_commission_cents
          FROM public.affiliate_profiles ap
          LEFT JOIN public.users u ON u.id = ap.user_id
          LEFT JOIN rr ON rr.user_id = ap.user_id
          LEFT JOIN lg ON lg.user_id = ap.user_id
          WHERE coalesce(rr.attributed_restaurants, 0) > 0
             OR coalesce(lg.generated_commission_cents, 0) > 0
          ORDER BY coalesce(lg.generated_commission_cents, 0) DESC, coalesce(rr.attributed_restaurants, 0) DESC
          LIMIT 10
        ) x
      )
    SELECT jsonb_build_object(
      'funnel_summary', jsonb_build_object(
        'attributed_restaurants', f.attributed_restaurants,
        'restaurants_with_paid_subscription', f.restaurants_with_paid_subscription,
        'conversion_to_paid_pct', CASE
          WHEN f.attributed_restaurants = 0 THEN 0
          ELSE round((f.restaurants_with_paid_subscription::numeric / f.attributed_restaurants::numeric) * 100, 2)
        END,
        'commission_generated_cents', f.commission_generated_cents,
        'commission_paid_cents', f.commission_paid_cents,
        'open_payout_requests', f.open_payout_requests
      ),
      'top_affiliates', ta.data,
      'pending_payouts', coalesce((
        SELECT jsonb_agg(jsonb_build_object(
          'id', r.id,
          'user_id', r.user_id,
          'amount_cents', r.amount_cents,
          'status', r.status,
          'requested_at', r.requested_at,
          'affiliate_code', ap.referral_code,
          'pix_key', ap.payout_pix_key
        ) ORDER BY r.requested_at ASC)
        FROM public.affiliate_payout_requests r
        LEFT JOIN public.affiliate_profiles ap ON ap.user_id = r.user_id
        WHERE r.status IN ('requested', 'processing')
      ), '[]'::jsonb),
      'recent_commissions', coalesce((
        SELECT jsonb_agg(jsonb_build_object(
          'id', l.id,
          'referrer_user_id', l.referrer_user_id,
          'referral_code', ap.referral_code,
          'restaurant_id', l.restaurant_id,
          'commission_amount_cents', l.commission_amount_cents,
          'status', l.status,
          'restaurant_paid_at', l.restaurant_paid_at,
          'created_at', l.created_at
        ) ORDER BY l.created_at DESC)
        FROM (
          SELECT * FROM public.referral_commission_ledger
          ORDER BY created_at DESC
          LIMIT 50
        ) l
        LEFT JOIN public.affiliate_profiles ap ON ap.user_id = l.referrer_user_id
      ), '[]'::jsonb),
      'materials', coalesce((
        SELECT jsonb_agg(to_jsonb(m) ORDER BY m.sort_order ASC, m.created_at DESC)
        FROM public.affiliate_campaign_materials m
      ), '[]'::jsonb)
    )
    FROM funnel f, top_affiliates ta
  );
END;
$$;

REVOKE ALL ON FUNCTION public.list_referral_admin_snapshot() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_referral_admin_snapshot() TO authenticated;
