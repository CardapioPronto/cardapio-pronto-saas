-- M8: Aggregated onboarding health for Super Admin and customer success.

CREATE OR REPLACE FUNCTION public.get_admin_onboarding_health()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Acesso restrito a super administradores';
  END IF;

  RETURN (
    WITH product_counts AS (
      SELECT
        restaurant_id,
        count(*)::integer AS total_products,
        count(*) FILTER (WHERE available IS DISTINCT FROM false)::integer AS available_products
      FROM public.products
      GROUP BY restaurant_id
    ),
    category_counts AS (
      SELECT
        restaurant_id,
        count(*)::integer AS total_categories
      FROM public.categories
      GROUP BY restaurant_id
    ),
    order_counts AS (
      SELECT
        restaurant_id,
        count(*)::integer AS total_orders,
        max(created_at) AS last_order_at
      FROM public.orders
      GROUP BY restaurant_id
    ),
    menu_config AS (
      SELECT
        restaurant_id,
        bool_or(is_active) AS menu_theme_configured
      FROM public.restaurant_menu_config
      GROUP BY restaurant_id
    ),
    progress AS (
      SELECT
        restaurant_id,
        bool_or(step_id = 'team-training' AND status IN ('done', 'skipped')) AS team_training_resolved,
        bool_or(step_id = 'support-handoff' AND status IN ('done', 'skipped')) AS support_handoff_resolved,
        max(updated_at) AS last_progress_at
      FROM public.restaurant_onboarding_progress
      GROUP BY restaurant_id
    ),
    readiness AS (
      SELECT
        r.id AS restaurant_id,
        r.name AS restaurant_name,
        r.slug,
        r.active,
        r.created_at,
        COALESCE(pc.total_products, 0) AS total_products,
        COALESCE(pc.available_products, 0) AS available_products,
        COALESCE(cc.total_categories, 0) AS total_categories,
        COALESCE(oc.total_orders, 0) AS total_orders,
        oc.last_order_at,
        COALESCE(mc.menu_theme_configured, false) AS menu_theme_configured,
        COALESCE(p.team_training_resolved, false) AS team_training_resolved,
        COALESCE(p.support_handoff_resolved, false) AS support_handoff_resolved,
        p.last_progress_at,
        (
          COALESCE(NULLIF(trim(r.name), ''), '') <> ''
          AND r.active IS TRUE
          AND COALESCE(NULLIF(trim(r.address), ''), '') <> ''
          AND (
            COALESCE(NULLIF(trim(r.phone), ''), '') <> ''
            OR COALESCE(NULLIF(trim(r.phone_whatsapp), ''), '') <> ''
          )
        ) AS restaurant_profile_completed
      FROM public.restaurants r
      LEFT JOIN product_counts pc ON pc.restaurant_id = r.id
      LEFT JOIN category_counts cc ON cc.restaurant_id = r.id
      LEFT JOIN order_counts oc ON oc.restaurant_id = r.id
      LEFT JOIN menu_config mc ON mc.restaurant_id = r.id
      LEFT JOIN progress p ON p.restaurant_id = r.id
    ),
    scored AS (
      SELECT
        *,
        (
          (CASE WHEN restaurant_profile_completed THEN 1 ELSE 0 END)
          + (CASE WHEN total_categories > 0 AND available_products > 0 THEN 1 ELSE 0 END)
          + (CASE WHEN active IS TRUE AND menu_theme_configured AND total_categories > 0 AND available_products > 0 THEN 1 ELSE 0 END)
          + (CASE WHEN total_orders > 0 THEN 1 ELSE 0 END)
          + (CASE WHEN team_training_resolved THEN 1 ELSE 0 END)
          + (CASE WHEN support_handoff_resolved THEN 1 ELSE 0 END)
        ) AS completed_steps
      FROM readiness
    ),
    classified AS (
      SELECT
        *,
        round((completed_steps::numeric / 6::numeric) * 100)::integer AS progress_percent,
        CASE
          WHEN NOT restaurant_profile_completed OR available_products = 0 OR total_categories = 0 THEN 'blocked'
          WHEN completed_steps = 6 AND total_orders > 0 THEN 'ready_to_sell'
          WHEN total_orders > 0 AND round((completed_steps::numeric / 6::numeric) * 100)::integer >= 70 THEN 'active'
          ELSE 'at_risk'
        END AS health_status,
        CASE
          WHEN NOT restaurant_profile_completed THEN 'Completar dados do restaurante'
          WHEN total_categories = 0 OR available_products = 0 THEN 'Cadastrar categorias e produtos'
          WHEN NOT (active IS TRUE AND menu_theme_configured AND total_categories > 0 AND available_products > 0) THEN 'Publicar QR Code e link rastreavel'
          WHEN total_orders = 0 THEN 'Fazer um pedido de teste'
          WHEN NOT team_training_resolved THEN 'Treinar equipe de operacao'
          WHEN NOT support_handoff_resolved THEN 'Confirmar canal de suporte'
          ELSE 'Operacao pronta para piloto'
        END AS next_step
      FROM scored
    )
    SELECT COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'restaurantId', restaurant_id,
          'restaurantName', restaurant_name,
          'slug', slug,
          'active', active,
          'createdAt', created_at,
          'totalProducts', total_products,
          'availableProducts', available_products,
          'totalCategories', total_categories,
          'totalOrders', total_orders,
          'lastOrderAt', last_order_at,
          'menuThemeConfigured', menu_theme_configured,
          'restaurantProfileCompleted', restaurant_profile_completed,
          'teamTrainingResolved', team_training_resolved,
          'supportHandoffResolved', support_handoff_resolved,
          'completedSteps', completed_steps,
          'progressPercent', progress_percent,
          'healthStatus', health_status,
          'nextStep', next_step,
          'lastProgressAt', last_progress_at
        )
        ORDER BY
          CASE health_status
            WHEN 'blocked' THEN 1
            WHEN 'at_risk' THEN 2
            WHEN 'active' THEN 3
            ELSE 4
          END,
          created_at DESC
      ),
      '[]'::jsonb
    )
    FROM classified
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_onboarding_health() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_onboarding_health() TO authenticated, service_role;

COMMENT ON FUNCTION public.get_admin_onboarding_health() IS
  'Returns aggregated restaurant onboarding health for Super Admin and customer success dashboards.';
