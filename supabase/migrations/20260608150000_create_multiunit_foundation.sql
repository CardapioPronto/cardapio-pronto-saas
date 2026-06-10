-- Bloco 15: fundacao multiunidade/franquias.
-- Mantem compatibilidade com user.restaurant_id como unidade ativa,
-- mas adiciona associacao multiunidade, matriz de cardapio e relatorio consolidado.

CREATE TABLE IF NOT EXISTS public.restaurant_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  master_restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE SET NULL,
  menu_sync_enabled boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT restaurant_groups_owner_unique UNIQUE (owner_id)
);

CREATE TABLE IF NOT EXISTS public.restaurant_group_units (
  group_id uuid NOT NULL REFERENCES public.restaurant_groups(id) ON DELETE CASCADE,
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, restaurant_id),
  CONSTRAINT restaurant_group_units_restaurant_unique UNIQUE (restaurant_id)
);

CREATE TABLE IF NOT EXISTS public.restaurant_user_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  access_type text NOT NULL DEFAULT 'employee',
  label text,
  is_active boolean NOT NULL DEFAULT true,
  granted_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT restaurant_user_access_type_check
    CHECK (access_type IN ('owner', 'manager', 'employee', 'viewer')),
  CONSTRAINT restaurant_user_access_unique UNIQUE (user_id, restaurant_id)
);

CREATE INDEX IF NOT EXISTS idx_restaurant_group_units_group
  ON public.restaurant_group_units (group_id)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_restaurant_user_access_user
  ON public.restaurant_user_access (user_id, is_active, restaurant_id);

CREATE INDEX IF NOT EXISTS idx_restaurant_user_access_restaurant
  ON public.restaurant_user_access (restaurant_id, is_active);

DROP TRIGGER IF EXISTS update_restaurant_groups_updated_at ON public.restaurant_groups;
CREATE TRIGGER update_restaurant_groups_updated_at
BEFORE UPDATE ON public.restaurant_groups
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_restaurant_user_access_updated_at ON public.restaurant_user_access;
CREATE TRIGGER update_restaurant_user_access_updated_at
BEFORE UPDATE ON public.restaurant_user_access
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.restaurant_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_group_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_user_access ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.user_has_any_restaurant_access(target_restaurant_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF target_restaurant_id IS NULL THEN
    RETURN false;
  END IF;

  IF public.is_super_admin(auth.uid()) THEN
    RETURN true;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.restaurants r
    WHERE r.id = target_restaurant_id
      AND r.owner_id = auth.uid()
  ) THEN
    RETURN true;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = auth.uid()
      AND u.restaurant_id = target_restaurant_id
      AND u.user_type = 'owner'::public.user_type
  ) THEN
    RETURN true;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.employees e
    WHERE e.user_id = auth.uid()
      AND e.restaurant_id = target_restaurant_id
      AND e.is_active = true
  ) THEN
    RETURN true;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.restaurant_user_access rua
    WHERE rua.user_id = auth.uid()
      AND rua.restaurant_id = target_restaurant_id
      AND rua.is_active = true
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.user_has_restaurant_permission(
  target_restaurant_id uuid,
  required_permission public.permission_type
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF target_restaurant_id IS NULL THEN
    RETURN false;
  END IF;

  IF public.is_super_admin(auth.uid()) THEN
    RETURN true;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.restaurants r
    WHERE r.id = target_restaurant_id
      AND r.owner_id = auth.uid()
  ) THEN
    RETURN true;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = auth.uid()
      AND u.restaurant_id = target_restaurant_id
      AND u.user_type = 'owner'::public.user_type
  ) THEN
    RETURN true;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.restaurant_user_access rua
    WHERE rua.user_id = auth.uid()
      AND rua.restaurant_id = target_restaurant_id
      AND rua.is_active = true
      AND (
        rua.access_type = 'owner'
        OR (
          rua.access_type = 'manager'
          AND required_permission IN (
            'dashboard_view'::public.permission_type,
            'pdv_access'::public.permission_type,
            'orders_view'::public.permission_type,
            'orders_manage'::public.permission_type,
            'orders_metrics_view'::public.permission_type,
            'products_view'::public.permission_type,
            'products_manage'::public.permission_type,
            'reports_view'::public.permission_type,
            'settings_view'::public.permission_type,
            'whatsapp_manage'::public.permission_type,
            'whatsapp_manage_instances'::public.permission_type,
            'whatsapp_take_conversations'::public.permission_type,
            'whatsapp_reply_as_human'::public.permission_type,
            'whatsapp_view_all_conversations'::public.permission_type,
            'whatsapp_configure_automation'::public.permission_type
          )
        )
        OR (
          rua.access_type = 'viewer'
          AND required_permission IN (
            'dashboard_view'::public.permission_type,
            'orders_view'::public.permission_type,
            'orders_metrics_view'::public.permission_type,
            'reports_view'::public.permission_type,
            'products_view'::public.permission_type
          )
        )
      )
  ) THEN
    RETURN true;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.employees e
    WHERE e.user_id = auth.uid()
      AND e.restaurant_id = target_restaurant_id
      AND e.is_active = true
      AND e.user_type = 'manager'::public.user_type
      AND required_permission IN (
        'dashboard_view'::public.permission_type,
        'pdv_access'::public.permission_type,
        'orders_view'::public.permission_type,
        'orders_manage'::public.permission_type,
        'orders_metrics_view'::public.permission_type,
        'products_view'::public.permission_type,
        'products_manage'::public.permission_type,
        'reports_view'::public.permission_type,
        'settings_view'::public.permission_type,
        'whatsapp_manage'::public.permission_type,
        'whatsapp_manage_instances'::public.permission_type,
        'whatsapp_take_conversations'::public.permission_type,
        'whatsapp_reply_as_human'::public.permission_type,
        'whatsapp_view_all_conversations'::public.permission_type,
        'whatsapp_configure_automation'::public.permission_type
      )
  ) THEN
    RETURN true;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.employees e
    JOIN public.employee_permissions ep ON ep.employee_id = e.id
    WHERE e.user_id = auth.uid()
      AND e.restaurant_id = target_restaurant_id
      AND e.is_active = true
      AND ep.permission IN (required_permission, 'settings_manage'::public.permission_type)
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_user_restaurant_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_active_restaurant_id uuid;
BEGIN
  SELECT u.restaurant_id INTO v_active_restaurant_id
  FROM public.users u
  WHERE u.id = auth.uid();

  IF v_active_restaurant_id IS NOT NULL
     AND public.user_has_any_restaurant_access(v_active_restaurant_id) THEN
    RETURN v_active_restaurant_id;
  END IF;

  SELECT r.id INTO v_active_restaurant_id
  FROM public.restaurants r
  WHERE r.owner_id = auth.uid()
  ORDER BY r.created_at ASC
  LIMIT 1;

  IF v_active_restaurant_id IS NOT NULL THEN
    RETURN v_active_restaurant_id;
  END IF;

  SELECT e.restaurant_id INTO v_active_restaurant_id
  FROM public.employees e
  WHERE e.user_id = auth.uid()
    AND e.is_active = true
  ORDER BY e.created_at ASC
  LIMIT 1;

  IF v_active_restaurant_id IS NOT NULL THEN
    RETURN v_active_restaurant_id;
  END IF;

  SELECT rua.restaurant_id INTO v_active_restaurant_id
  FROM public.restaurant_user_access rua
  WHERE rua.user_id = auth.uid()
    AND rua.is_active = true
  ORDER BY rua.created_at ASC
  LIMIT 1;

  RETURN v_active_restaurant_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_my_restaurant_access()
RETURNS TABLE (
  restaurant_id uuid,
  restaurant_name text,
  restaurant_slug text,
  access_type text,
  is_active_unit boolean,
  group_id uuid,
  group_name text,
  is_group_master boolean,
  menu_sync_enabled boolean,
  permissions text[]
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_active_restaurant_id uuid;
  v_all_permissions text[] := ARRAY[
    'dashboard_view', 'subscription_view',
    'pdv_access', 'orders_view', 'orders_manage', 'orders_metrics_view',
    'products_view', 'products_manage',
    'reports_view', 'settings_view', 'settings_manage',
    'settings_establishment_manage', 'settings_system_manage', 'settings_integrations_manage',
    'settings_audit_view',
    'employees_manage',
    'whatsapp_manage', 'whatsapp_manage_instances',
    'whatsapp_take_conversations', 'whatsapp_reply_as_human',
    'whatsapp_view_all_conversations', 'whatsapp_configure_automation'
  ];
  v_manager_permissions text[] := ARRAY[
    'dashboard_view',
    'pdv_access', 'orders_view', 'orders_manage', 'orders_metrics_view',
    'products_view', 'products_manage',
    'reports_view', 'settings_view',
    'whatsapp_manage', 'whatsapp_manage_instances',
    'whatsapp_take_conversations', 'whatsapp_reply_as_human',
    'whatsapp_view_all_conversations', 'whatsapp_configure_automation'
  ];
BEGIN
  v_active_restaurant_id := public.get_user_restaurant_id();

  RETURN QUERY
  WITH raw_access AS (
    SELECT
      r.id AS restaurant_id,
      'owner'::text AS access_type,
      v_all_permissions AS permissions,
      1 AS priority
    FROM public.restaurants r
    WHERE r.owner_id = auth.uid()

    UNION ALL

    SELECT
      rua.restaurant_id,
      rua.access_type,
      CASE
        WHEN rua.access_type = 'owner' THEN v_all_permissions
        WHEN rua.access_type = 'manager' THEN v_manager_permissions
        WHEN rua.access_type = 'viewer' THEN ARRAY[
          'dashboard_view', 'orders_view', 'orders_metrics_view', 'reports_view', 'products_view'
        ]::text[]
        ELSE ARRAY[]::text[]
      END AS permissions,
      CASE rua.access_type
        WHEN 'owner' THEN 2
        WHEN 'manager' THEN 3
        WHEN 'viewer' THEN 5
        ELSE 6
      END AS priority
    FROM public.restaurant_user_access rua
    WHERE rua.user_id = auth.uid()
      AND rua.is_active = true

    UNION ALL

    SELECT
      e.restaurant_id,
      e.user_type::text AS access_type,
      CASE
        WHEN e.user_type = 'manager'::public.user_type
          THEN ARRAY(SELECT DISTINCT unnest(v_manager_permissions || coalesce(ep.permissions, ARRAY[]::text[])))
        ELSE coalesce(ep.permissions, ARRAY[]::text[])
      END AS permissions,
      CASE e.user_type
        WHEN 'manager'::public.user_type THEN 4
        ELSE 7
      END AS priority
    FROM public.employees e
    LEFT JOIN LATERAL (
      SELECT array_agg(DISTINCT employee_permissions.permission::text) AS permissions
      FROM public.employee_permissions
      WHERE employee_permissions.employee_id = e.id
    ) ep ON true
    WHERE e.user_id = auth.uid()
      AND e.is_active = true
  ),
  ranked AS (
    SELECT DISTINCT ON (raw_access.restaurant_id)
      raw_access.restaurant_id,
      raw_access.access_type,
      raw_access.permissions
    FROM raw_access
    ORDER BY raw_access.restaurant_id, raw_access.priority
  )
  SELECT
    r.id AS restaurant_id,
    r.name AS restaurant_name,
    r.slug AS restaurant_slug,
    ranked.access_type,
    r.id = v_active_restaurant_id AS is_active_unit,
    rg.id AS group_id,
    rg.name AS group_name,
    rg.master_restaurant_id = r.id AS is_group_master,
    coalesce(rg.menu_sync_enabled, false) AS menu_sync_enabled,
    ranked.permissions
  FROM ranked
  JOIN public.restaurants r ON r.id = ranked.restaurant_id
  LEFT JOIN public.restaurant_group_units rgu
    ON rgu.restaurant_id = r.id
   AND rgu.is_active = true
  LEFT JOIN public.restaurant_groups rg ON rg.id = rgu.group_id
  WHERE public.user_has_any_restaurant_access(r.id)
  ORDER BY r.name ASC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_active_restaurant(p_restaurant_id uuid)
RETURNS TABLE (
  restaurant_id uuid,
  restaurant_name text,
  access_type text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_access record;
BEGIN
  IF p_restaurant_id IS NULL THEN
    RAISE EXCEPTION 'Restaurante não informado';
  END IF;

  SELECT a.restaurant_id, a.restaurant_name, a.access_type
  INTO v_access
  FROM public.get_my_restaurant_access() a
  WHERE a.restaurant_id = p_restaurant_id
  LIMIT 1;

  IF v_access.restaurant_id IS NULL THEN
    RAISE EXCEPTION 'Sem acesso a esta unidade';
  END IF;

  UPDATE public.users
  SET restaurant_id = p_restaurant_id,
      updated_at = now()
  WHERE id = auth.uid();

  RETURN QUERY
  SELECT
    v_access.restaurant_id,
    v_access.restaurant_name,
    v_access.access_type;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_restaurant_group_menu_matrix(
  p_group_id uuid,
  p_master_restaurant_id uuid,
  p_menu_sync_enabled boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_group record;
BEGIN
  SELECT *
  INTO v_group
  FROM public.restaurant_groups rg
  WHERE rg.id = p_group_id;

  IF v_group.id IS NULL THEN
    RAISE EXCEPTION 'Rede não encontrada';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.restaurant_group_units rgu
    WHERE rgu.group_id = p_group_id
      AND rgu.restaurant_id = p_master_restaurant_id
      AND rgu.is_active = true
  ) THEN
    RAISE EXCEPTION 'A unidade matriz precisa pertencer a esta rede';
  END IF;

  IF NOT (
    public.is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.restaurant_group_units rgu
      WHERE rgu.group_id = p_group_id
        AND rgu.is_active = true
        AND public.user_has_restaurant_permission(
          rgu.restaurant_id,
          'settings_manage'::public.permission_type
        )
    )
  ) THEN
    RAISE EXCEPTION 'Sem permissão para configurar matriz de cardápio';
  END IF;

  UPDATE public.restaurant_groups
  SET master_restaurant_id = p_master_restaurant_id,
      menu_sync_enabled = coalesce(p_menu_sync_enabled, false),
      updated_at = now()
  WHERE id = p_group_id;

  RETURN jsonb_build_object(
    'group_id', p_group_id,
    'master_restaurant_id', p_master_restaurant_id,
    'menu_sync_enabled', coalesce(p_menu_sync_enabled, false)
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_multiunit_consolidated_report(
  p_restaurant_ids uuid[] DEFAULT NULL,
  p_from timestamptz DEFAULT (now() - interval '30 days'),
  p_to timestamptz DEFAULT now(),
  p_include_financials boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_authorized_count integer;
BEGIN
  IF p_to < p_from THEN
    RAISE EXCEPTION 'A data inicial não pode ser maior que a data final';
  END IF;

  IF (p_to::date - p_from::date) + 1 > 366 THEN
    RAISE EXCEPTION 'Período inválido (máximo 366 dias)';
  END IF;

  WITH selected_access AS (
    SELECT a.restaurant_id
    FROM public.get_my_restaurant_access() a
    WHERE (
      p_restaurant_ids IS NULL
      OR cardinality(p_restaurant_ids) = 0
      OR a.restaurant_id = ANY(p_restaurant_ids)
    )
      AND (
        public.user_has_restaurant_permission(a.restaurant_id, 'reports_view'::public.permission_type)
        OR public.user_has_restaurant_permission(a.restaurant_id, 'orders_metrics_view'::public.permission_type)
      )
  )
  SELECT count(*) INTO v_authorized_count
  FROM selected_access;

  IF v_authorized_count = 0 THEN
    RAISE EXCEPTION 'Sem permissão para relatório consolidado das unidades selecionadas';
  END IF;

  RETURN (
    WITH selected_access AS (
      SELECT a.restaurant_id
      FROM public.get_my_restaurant_access() a
      WHERE (
        p_restaurant_ids IS NULL
        OR cardinality(p_restaurant_ids) = 0
        OR a.restaurant_id = ANY(p_restaurant_ids)
      )
        AND (
          public.user_has_restaurant_permission(a.restaurant_id, 'reports_view'::public.permission_type)
          OR public.user_has_restaurant_permission(a.restaurant_id, 'orders_metrics_view'::public.permission_type)
        )
    ),
    units AS (
      SELECT r.id, r.name, r.slug
      FROM public.restaurants r
      JOIN selected_access sa ON sa.restaurant_id = r.id
    ),
    period_orders AS (
      SELECT o.*
      FROM public.orders o
      JOIN units u ON u.id = o.restaurant_id
      WHERE o.created_at >= p_from
        AND o.created_at <= p_to
    ),
    finalized AS (
      SELECT *
      FROM period_orders
      WHERE status = 'finalizado'
    ),
    open_orders AS (
      SELECT o.restaurant_id, count(*)::int AS open_orders
      FROM public.orders o
      JOIN units u ON u.id = o.restaurant_id
      WHERE o.status IN ('pendente', 'preparo', 'em-andamento', 'pending', 'preparing')
      GROUP BY o.restaurant_id
    ),
    active_products AS (
      SELECT p.restaurant_id, count(*)::int AS active_products
      FROM public.products p
      JOIN units u ON u.id = p.restaurant_id
      WHERE p.available IS DISTINCT FROM false
      GROUP BY p.restaurant_id
    ),
    unit_rows AS (
      SELECT
        u.id,
        u.name,
        u.slug,
        count(po.id)::int AS total_orders,
        count(f.id)::int AS finalized_orders,
        CASE
          WHEN p_include_financials THEN coalesce(sum(f.total)::float8, 0::float8)
          ELSE 0::float8
        END AS revenue,
        CASE
          WHEN count(f.id) = 0 OR NOT p_include_financials THEN 0::float8
          ELSE coalesce(sum(f.total)::float8, 0::float8) / NULLIF(count(f.id)::float8, 0)
        END AS average_ticket,
        coalesce(max(oo.open_orders), 0)::int AS open_orders,
        coalesce(max(ap.active_products), 0)::int AS active_products
      FROM units u
      LEFT JOIN period_orders po ON po.restaurant_id = u.id
      LEFT JOIN finalized f ON f.id = po.id
      LEFT JOIN open_orders oo ON oo.restaurant_id = u.id
      LEFT JOIN active_products ap ON ap.restaurant_id = u.id
      GROUP BY u.id, u.name, u.slug
    ),
    daily AS (
      SELECT
        gs::date AS d
      FROM generate_series(p_from::date, p_to::date, interval '1 day') AS gs
    ),
    daily_rows AS (
      SELECT
        d.d,
        CASE
          WHEN p_include_financials THEN coalesce(sum(f.total)::float8, 0::float8)
          ELSE 0::float8
        END AS revenue,
        count(f.id)::int AS orders
      FROM daily d
      LEFT JOIN finalized f ON (f.created_at AT TIME ZONE 'UTC')::date = d.d
      GROUP BY d.d
      ORDER BY d.d
    ),
    summary AS (
      SELECT
        count(DISTINCT u.id)::int AS units,
        coalesce(sum(ur.revenue)::float8, 0::float8) AS revenue,
        coalesce(sum(ur.total_orders), 0)::int AS total_orders,
        coalesce(sum(ur.finalized_orders), 0)::int AS finalized_orders,
        coalesce(sum(ur.open_orders), 0)::int AS open_orders,
        coalesce(sum(ur.active_products), 0)::int AS active_products,
        CASE
          WHEN coalesce(sum(ur.finalized_orders), 0) = 0 OR NOT p_include_financials THEN 0::float8
          ELSE coalesce(sum(ur.revenue)::float8, 0::float8) / NULLIF(sum(ur.finalized_orders)::float8, 0)
        END AS average_ticket
      FROM units u
      LEFT JOIN unit_rows ur ON ur.id = u.id
    )
    SELECT jsonb_build_object(
      'period', jsonb_build_object(
        'from', p_from,
        'to', p_to
      ),
      'summary', jsonb_build_object(
        'units', (SELECT units FROM summary),
        'revenue', (SELECT revenue FROM summary),
        'totalOrders', (SELECT total_orders FROM summary),
        'finalizedOrders', (SELECT finalized_orders FROM summary),
        'openOrders', (SELECT open_orders FROM summary),
        'activeProducts', (SELECT active_products FROM summary),
        'averageTicket', (SELECT average_ticket FROM summary)
      ),
      'units', coalesce((
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', unit_rows.id,
            'name', unit_rows.name,
            'slug', unit_rows.slug,
            'revenue', unit_rows.revenue,
            'totalOrders', unit_rows.total_orders,
            'finalizedOrders', unit_rows.finalized_orders,
            'averageTicket', unit_rows.average_ticket,
            'openOrders', unit_rows.open_orders,
            'activeProducts', unit_rows.active_products
          )
          ORDER BY unit_rows.revenue DESC, unit_rows.name ASC
        )
        FROM unit_rows
      ), '[]'::jsonb),
      'daily', coalesce((
        SELECT jsonb_agg(
          jsonb_build_object(
            'date', daily_rows.d::text,
            'revenue', daily_rows.revenue,
            'orders', daily_rows.orders
          )
          ORDER BY daily_rows.d
        )
        FROM daily_rows
      ), '[]'::jsonb)
    )
  );
END;
$function$;

DROP POLICY IF EXISTS "Restaurant group members can view groups" ON public.restaurant_groups;
CREATE POLICY "Restaurant group members can view groups"
ON public.restaurant_groups
FOR SELECT
TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR owner_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.restaurant_group_units rgu
    WHERE rgu.group_id = restaurant_groups.id
      AND rgu.is_active = true
      AND public.user_has_any_restaurant_access(rgu.restaurant_id)
  )
);

DROP POLICY IF EXISTS "Restaurant group owners can manage groups" ON public.restaurant_groups;
CREATE POLICY "Restaurant group owners can manage groups"
ON public.restaurant_groups
FOR ALL
TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR owner_id = auth.uid()
)
WITH CHECK (
  public.is_super_admin(auth.uid())
  OR owner_id = auth.uid()
);

DROP POLICY IF EXISTS "Restaurant group members can view units" ON public.restaurant_group_units;
CREATE POLICY "Restaurant group members can view units"
ON public.restaurant_group_units
FOR SELECT
TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR public.user_has_any_restaurant_access(restaurant_id)
  OR EXISTS (
    SELECT 1
    FROM public.restaurant_groups rg
    WHERE rg.id = restaurant_group_units.group_id
      AND rg.owner_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Restaurant group owners can manage units" ON public.restaurant_group_units;
CREATE POLICY "Restaurant group owners can manage units"
ON public.restaurant_group_units
FOR ALL
TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.restaurant_groups rg
    WHERE rg.id = restaurant_group_units.group_id
      AND rg.owner_id = auth.uid()
  )
)
WITH CHECK (
  public.is_super_admin(auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.restaurant_groups rg
    WHERE rg.id = restaurant_group_units.group_id
      AND rg.owner_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Restaurant access members can view own access" ON public.restaurant_user_access;
CREATE POLICY "Restaurant access members can view own access"
ON public.restaurant_user_access
FOR SELECT
TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR user_id = auth.uid()
  OR public.user_has_restaurant_permission(restaurant_id, 'employees_manage'::public.permission_type)
);

DROP POLICY IF EXISTS "Restaurant access owners can manage access" ON public.restaurant_user_access;
CREATE POLICY "Restaurant access owners can manage access"
ON public.restaurant_user_access
FOR ALL
TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR public.user_has_restaurant_permission(restaurant_id, 'employees_manage'::public.permission_type)
)
WITH CHECK (
  public.is_super_admin(auth.uid())
  OR public.user_has_restaurant_permission(restaurant_id, 'employees_manage'::public.permission_type)
);

INSERT INTO public.restaurant_user_access (
  user_id,
  restaurant_id,
  access_type,
  label,
  is_active,
  granted_by
)
SELECT
  r.owner_id,
  r.id,
  'owner',
  'Dono',
  true,
  r.owner_id
FROM public.restaurants r
ON CONFLICT (user_id, restaurant_id) DO UPDATE
SET access_type = CASE
    WHEN public.restaurant_user_access.access_type = 'owner' THEN public.restaurant_user_access.access_type
    ELSE EXCLUDED.access_type
  END,
  is_active = true,
  updated_at = now();

INSERT INTO public.restaurant_user_access (
  user_id,
  restaurant_id,
  access_type,
  label,
  is_active,
  granted_by
)
SELECT
  e.user_id,
  e.restaurant_id,
  e.user_type::text,
  CASE e.user_type
    WHEN 'manager'::public.user_type THEN 'Gerente'
    ELSE 'Colaborador'
  END,
  e.is_active,
  e.created_by
FROM public.employees e
ON CONFLICT (user_id, restaurant_id) DO NOTHING;

WITH owner_networks AS (
  SELECT
    r.owner_id,
    coalesce(
      nullif(max(u.name), ''),
      max(u.email),
      'Rede Pubfy'
    ) AS owner_name,
    (array_agg(r.id ORDER BY r.created_at ASC))[1] AS master_restaurant_id
  FROM public.restaurants r
  LEFT JOIN public.users u ON u.id = r.owner_id
  GROUP BY r.owner_id
)
INSERT INTO public.restaurant_groups (
  name,
  owner_id,
  master_restaurant_id,
  created_by
)
SELECT
  'Rede ' || owner_networks.owner_name,
  owner_networks.owner_id,
  owner_networks.master_restaurant_id,
  owner_networks.owner_id
FROM owner_networks
ON CONFLICT (owner_id) DO NOTHING;

INSERT INTO public.restaurant_group_units (
  group_id,
  restaurant_id,
  is_active
)
SELECT
  rg.id,
  r.id,
  true
FROM public.restaurants r
JOIN public.restaurant_groups rg ON rg.owner_id = r.owner_id
ON CONFLICT (restaurant_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.ensure_restaurant_multiunit_defaults()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_group_id uuid;
BEGIN
  INSERT INTO public.restaurant_user_access (
    user_id,
    restaurant_id,
    access_type,
    label,
    is_active,
    granted_by
  )
  VALUES (
    NEW.owner_id,
    NEW.id,
    'owner',
    'Dono',
    true,
    NEW.owner_id
  )
  ON CONFLICT (user_id, restaurant_id) DO UPDATE
  SET access_type = 'owner',
      is_active = true,
      updated_at = now();

  INSERT INTO public.restaurant_groups (
    name,
    owner_id,
    master_restaurant_id,
    created_by
  )
  VALUES (
    'Rede ' || NEW.name,
    NEW.owner_id,
    NEW.id,
    NEW.owner_id
  )
  ON CONFLICT (owner_id) DO UPDATE
  SET master_restaurant_id = coalesce(public.restaurant_groups.master_restaurant_id, NEW.id),
      updated_at = now()
  RETURNING id INTO v_group_id;

  INSERT INTO public.restaurant_group_units (
    group_id,
    restaurant_id,
    is_active
  )
  VALUES (v_group_id, NEW.id, true)
  ON CONFLICT (restaurant_id) DO UPDATE
  SET group_id = EXCLUDED.group_id,
      is_active = true;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_ensure_restaurant_multiunit_defaults ON public.restaurants;
CREATE TRIGGER trg_ensure_restaurant_multiunit_defaults
AFTER INSERT ON public.restaurants
FOR EACH ROW
EXECUTE FUNCTION public.ensure_restaurant_multiunit_defaults();

CREATE OR REPLACE FUNCTION public.sync_employee_multiunit_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE public.restaurant_user_access
    SET is_active = false,
        updated_at = now()
    WHERE user_id = OLD.user_id
      AND restaurant_id = OLD.restaurant_id
      AND access_type <> 'owner';

    RETURN OLD;
  END IF;

  INSERT INTO public.restaurant_user_access (
    user_id,
    restaurant_id,
    access_type,
    label,
    is_active,
    granted_by
  )
  VALUES (
    NEW.user_id,
    NEW.restaurant_id,
    NEW.user_type::text,
    CASE NEW.user_type
      WHEN 'manager'::public.user_type THEN 'Gerente'
      ELSE 'Colaborador'
    END,
    NEW.is_active,
    NEW.created_by
  )
  ON CONFLICT (user_id, restaurant_id) DO UPDATE
  SET access_type = CASE
        WHEN public.restaurant_user_access.access_type = 'owner' THEN 'owner'
        ELSE EXCLUDED.access_type
      END,
      label = EXCLUDED.label,
      is_active = EXCLUDED.is_active,
      granted_by = EXCLUDED.granted_by,
      updated_at = now();

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_sync_employee_multiunit_access ON public.employees;
CREATE TRIGGER trg_sync_employee_multiunit_access
AFTER INSERT OR UPDATE OF user_id, restaurant_id, user_type, is_active OR DELETE ON public.employees
FOR EACH ROW
EXECUTE FUNCTION public.sync_employee_multiunit_access();

REVOKE ALL ON FUNCTION public.user_has_any_restaurant_access(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.user_has_restaurant_permission(uuid, public.permission_type) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_user_restaurant_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_my_restaurant_access() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_active_restaurant(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_restaurant_group_menu_matrix(uuid, uuid, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_multiunit_consolidated_report(uuid[], timestamptz, timestamptz, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ensure_restaurant_multiunit_defaults() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_employee_multiunit_access() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.user_has_any_restaurant_access(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.user_has_restaurant_permission(uuid, public.permission_type) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_restaurant_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_my_restaurant_access() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.set_active_restaurant(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.set_restaurant_group_menu_matrix(uuid, uuid, boolean) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_multiunit_consolidated_report(uuid[], timestamptz, timestamptz, boolean) TO authenticated, service_role;

COMMENT ON TABLE public.restaurant_groups IS
  'Agrupamento comercial de unidades para redes pequenas e franquias. MVP: uma rede por dono.';

COMMENT ON TABLE public.restaurant_user_access IS
  'Associacao explicita de usuario a unidades. Complementa users.restaurant_id e employees para multiunidade.';

COMMENT ON FUNCTION public.get_my_restaurant_access() IS
  'Lista unidades acessiveis pelo usuario autenticado com permissao efetiva e metadados da rede.';

COMMENT ON FUNCTION public.get_multiunit_consolidated_report(uuid[], timestamptz, timestamptz, boolean) IS
  'Relatorio consolidado multiunidade com filtro por unidades autorizadas e sem vazamento entre restaurantes.';
