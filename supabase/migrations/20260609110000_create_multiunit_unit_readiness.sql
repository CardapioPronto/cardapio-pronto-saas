-- Bloco 15: prontidao operacional das unidades da rede.
-- Entrega uma visao executiva do que falta para cada filial operar bem.

DROP FUNCTION IF EXISTS public.get_restaurant_group_readiness(uuid);

CREATE OR REPLACE FUNCTION public.get_restaurant_group_readiness(p_group_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_group public.restaurant_groups%ROWTYPE;
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario nao autenticado';
  END IF;

  SELECT rg.*
  INTO v_group
  FROM public.restaurant_groups rg
  WHERE rg.id = p_group_id;

  IF v_group.id IS NULL THEN
    RAISE EXCEPTION 'Rede nao encontrada';
  END IF;

  IF NOT (
    public.is_super_admin(v_user_id)
    OR v_group.owner_id = v_user_id
    OR EXISTS (
      SELECT 1
      FROM public.restaurant_group_units rgu
      WHERE rgu.group_id = p_group_id
        AND rgu.is_active = true
        AND public.user_has_any_restaurant_access(rgu.restaurant_id)
    )
  ) THEN
    RAISE EXCEPTION 'Sem permissao para visualizar a prontidao desta rede';
  END IF;

  RETURN (
    WITH units AS (
      SELECT
        r.id,
        r.name,
        r.active,
        r.address,
        r.category,
        r.cnpj,
        r.email,
        r.phone,
        r.phone_whatsapp
      FROM public.restaurant_group_units rgu
      JOIN public.restaurants r ON r.id = rgu.restaurant_id
      WHERE rgu.group_id = p_group_id
        AND rgu.is_active = true
    ),
    metrics AS (
      SELECT
        u.*,
        (
          SELECT count(*)::int
          FROM public.categories c
          WHERE c.restaurant_id = u.id
        ) AS categories_count,
        (
          SELECT count(*)::int
          FROM public.products p
          WHERE p.restaurant_id = u.id
        ) AS products_count,
        (
          SELECT count(*)::int
          FROM public.products p
          WHERE p.restaurant_id = u.id
            AND p.available IS DISTINCT FROM false
        ) AS active_products_count,
        (
          SELECT count(*)::int
          FROM public.areas a
          WHERE a.restaurant_id = u.id
            AND a.is_active IS DISTINCT FROM false
        ) AS active_areas_count,
        (
          SELECT count(*)::int
          FROM public.mesas m
          WHERE m.restaurant_id = u.id
            AND m.is_active IS DISTINCT FROM false
        ) AS active_tables_count,
        (
          SELECT count(*)::int
          FROM (
            SELECT e.user_id
            FROM public.employees e
            WHERE e.restaurant_id = u.id
              AND e.is_active = true
            UNION
            SELECT rua.user_id
            FROM public.restaurant_user_access rua
            WHERE rua.restaurant_id = u.id
              AND rua.is_active = true
          ) staff_users
        ) AS active_staff_count,
        (
          SELECT count(*)::int
          FROM public.whatsapp_instances wi
          WHERE wi.restaurant_id = u.id
            AND wi.is_active IS DISTINCT FROM false
        ) AS whatsapp_instances_count,
        (
          SELECT count(*)::int
          FROM public.whatsapp_instances wi
          WHERE wi.restaurant_id = u.id
            AND wi.is_active IS DISTINCT FROM false
            AND lower(coalesce(wi.status, '')) IN ('open', 'connected', 'online', 'ready')
        ) AS whatsapp_connected_count,
        (
          SELECT count(*)::int
          FROM public.ifood_integration ii
          WHERE ii.restaurant_id = u.id
            AND ii.is_enabled = true
            AND nullif(trim(ii.merchant_id), '') IS NOT NULL
        ) AS ifood_enabled_count,
        (
          SELECT count(*)::int
          FROM public.restaurant_recipient_accounts rra
          WHERE rra.restaurant_id = u.id
            AND rra.recipient_id IS NOT NULL
            AND lower(coalesce(rra.recipient_status, '')) NOT IN ('failed', 'rejected', 'error', 'canceled')
        ) AS payment_ready_count,
        (
          SELECT count(*)::int
          FROM public.subscriptions s
          WHERE s.restaurant_id = u.id
            AND (
              lower(coalesce(s.status, '')) IN ('active', 'paid', 'trial', 'trialing')
              OR (
                coalesce(s.is_trial, false) = true
                AND (s.trial_ends_at IS NULL OR s.trial_ends_at >= now())
              )
            )
        ) AS subscription_active_count
      FROM units u
    ),
    checked AS (
      SELECT
        m.*,
        (
          m.active = true
          AND nullif(trim(coalesce(m.name, '')), '') IS NOT NULL
          AND (
            nullif(trim(coalesce(m.phone, '')), '') IS NOT NULL
            OR nullif(trim(coalesce(m.phone_whatsapp, '')), '') IS NOT NULL
            OR nullif(trim(coalesce(m.email, '')), '') IS NOT NULL
          )
          AND nullif(trim(coalesce(m.address, '')), '') IS NOT NULL
        ) AS profile_ok,
        (m.categories_count > 0 AND m.active_products_count > 0) AS menu_ok,
        (m.active_staff_count > 0) AS staff_ok,
        (
          m.whatsapp_instances_count > 0
          OR m.ifood_enabled_count > 0
        ) AS channel_ok,
        (
          m.active_tables_count > 0
          OR m.whatsapp_instances_count > 0
          OR m.ifood_enabled_count > 0
        ) AS service_ok,
        (m.payment_ready_count > 0) AS payment_ok,
        (m.subscription_active_count > 0) AS subscription_ok
      FROM metrics m
    ),
    scored AS (
      SELECT
        c.*,
        (
          CASE WHEN c.profile_ok THEN 15 ELSE 0 END
          + CASE WHEN c.menu_ok THEN 25 ELSE 0 END
          + CASE WHEN c.staff_ok THEN 15 ELSE 0 END
          + CASE WHEN c.service_ok THEN 15 ELSE 0 END
          + CASE WHEN c.channel_ok THEN 15 ELSE 0 END
          + CASE WHEN c.subscription_ok THEN 10 ELSE 0 END
          + CASE WHEN c.payment_ok THEN 5 ELSE 0 END
        )::int AS score
      FROM checked c
    ),
    unit_rows AS (
      SELECT
        s.*,
        CASE
          WHEN s.score >= 80 THEN 'ready'
          WHEN s.score >= 55 THEN 'attention'
          ELSE 'critical'
        END AS readiness_status,
        array_remove(ARRAY[
          CASE WHEN s.profile_ok THEN NULL ELSE 'Completar dados da unidade' END,
          CASE WHEN s.menu_ok THEN NULL ELSE 'Publicar produtos ativos' END,
          CASE WHEN s.staff_ok THEN NULL ELSE 'Atribuir equipe' END,
          CASE WHEN s.service_ok THEN NULL ELSE 'Configurar mesas ou canal de venda' END,
          CASE WHEN s.channel_ok THEN NULL ELSE 'Conectar WhatsApp ou iFood' END,
          CASE WHEN s.subscription_ok THEN NULL ELSE 'Validar assinatura' END,
          CASE WHEN s.payment_ok THEN NULL ELSE 'Configurar conta de repasse' END
        ]::text[], NULL) AS missing
      FROM scored s
    ),
    summary AS (
      SELECT
        count(*)::int AS units,
        count(*) FILTER (WHERE readiness_status = 'ready')::int AS ready_units,
        count(*) FILTER (WHERE readiness_status = 'attention')::int AS attention_units,
        count(*) FILTER (WHERE readiness_status = 'critical')::int AS critical_units,
        coalesce(round(avg(score))::int, 0) AS average_score
      FROM unit_rows
    )
    SELECT jsonb_build_object(
      'group_id', v_group.id,
      'group_name', v_group.name,
      'summary', jsonb_build_object(
        'units', (SELECT units FROM summary),
        'ready_units', (SELECT ready_units FROM summary),
        'attention_units', (SELECT attention_units FROM summary),
        'critical_units', (SELECT critical_units FROM summary),
        'average_score', (SELECT average_score FROM summary)
      ),
      'units', coalesce((
        SELECT jsonb_agg(
          jsonb_build_object(
            'restaurant_id', ur.id,
            'restaurant_name', ur.name,
            'score', ur.score,
            'status', ur.readiness_status,
            'missing', to_jsonb(ur.missing),
            'checks', jsonb_build_object(
              'profile', jsonb_build_object(
                'ok', ur.profile_ok,
                'label', 'Dados cadastrais',
                'detail', CASE
                  WHEN ur.profile_ok THEN 'Unidade com contato e endereco'
                  ELSE 'Informe contato e endereco operacional'
                END
              ),
              'menu', jsonb_build_object(
                'ok', ur.menu_ok,
                'label', 'Cardapio',
                'detail', format('%s categoria(s), %s produto(s) ativo(s)', ur.categories_count, ur.active_products_count)
              ),
              'staff', jsonb_build_object(
                'ok', ur.staff_ok,
                'label', 'Equipe',
                'detail', format('%s usuario(s) com acesso ativo', ur.active_staff_count)
              ),
              'service', jsonb_build_object(
                'ok', ur.service_ok,
                'label', 'Operacao',
                'detail', format('%s mesa(s), %s canal(is) digital(is)', ur.active_tables_count, ur.whatsapp_instances_count + ur.ifood_enabled_count)
              ),
              'channels', jsonb_build_object(
                'ok', ur.channel_ok,
                'label', 'Canais digitais',
                'detail', format('%s WhatsApp ativo(s), %s iFood habilitado(s)', ur.whatsapp_connected_count, ur.ifood_enabled_count)
              ),
              'subscription', jsonb_build_object(
                'ok', ur.subscription_ok,
                'label', 'Assinatura',
                'detail', CASE
                  WHEN ur.subscription_ok THEN 'Assinatura ativa ou em teste'
                  ELSE 'Assinatura pendente'
                END
              ),
              'payment', jsonb_build_object(
                'ok', ur.payment_ok,
                'label', 'Repasse',
                'detail', CASE
                  WHEN ur.payment_ok THEN 'Conta de repasse configurada'
                  ELSE 'Conta de repasse pendente'
                END
              )
            )
          )
          ORDER BY ur.score ASC, ur.name ASC
        )
        FROM unit_rows ur
      ), '[]'::jsonb)
    )
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.get_restaurant_group_readiness(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_restaurant_group_readiness(uuid) TO authenticated, service_role;

COMMENT ON FUNCTION public.get_restaurant_group_readiness(uuid) IS
  'Retorna score de prontidao operacional por unidade de uma rede.';
