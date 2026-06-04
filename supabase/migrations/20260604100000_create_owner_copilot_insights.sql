-- Bloco 8: copiloto operacional com recomendações explicáveis para o dono.

CREATE OR REPLACE FUNCTION public.get_owner_copilot_insights(
  p_restaurant_id uuid,
  p_reference_date date DEFAULT CURRENT_DATE
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reference_date date := COALESCE(p_reference_date, CURRENT_DATE);
  v_today_start timestamptz;
  v_tomorrow_start timestamptz;
  v_last7_start timestamptz;
  v_prev7_start timestamptz;
  v_today_orders integer := 0;
  v_today_revenue numeric := 0;
  v_open_orders integer := 0;
  v_last7_orders integer := 0;
  v_last7_revenue numeric := 0;
  v_prev7_orders integer := 0;
  v_prev7_revenue numeric := 0;
  v_change_percent numeric := 0;
  v_total_products integer := 0;
  v_top_product jsonb := NULL;
  v_slow_product jsonb := NULL;
  v_inactive_customers integer := 0;
  v_recommendations jsonb := '[]'::jsonb;
BEGIN
  PERFORM public.assert_restaurant_report_access(p_restaurant_id);

  v_today_start := v_reference_date::timestamptz;
  v_tomorrow_start := (v_reference_date + 1)::timestamptz;
  v_last7_start := (v_reference_date - 6)::timestamptz;
  v_prev7_start := (v_reference_date - 13)::timestamptz;

  SELECT
    count(*) FILTER (WHERE o.created_at >= v_today_start AND o.created_at < v_tomorrow_start)::integer,
    COALESCE(sum(o.total) FILTER (WHERE o.created_at >= v_today_start AND o.created_at < v_tomorrow_start), 0),
    count(*) FILTER (WHERE o.status NOT IN ('finalizado', 'cancelado'))::integer,
    count(*) FILTER (WHERE o.created_at >= v_last7_start AND o.created_at < v_tomorrow_start)::integer,
    COALESCE(sum(o.total) FILTER (WHERE o.created_at >= v_last7_start AND o.created_at < v_tomorrow_start), 0),
    count(*) FILTER (WHERE o.created_at >= v_prev7_start AND o.created_at < v_last7_start)::integer,
    COALESCE(sum(o.total) FILTER (WHERE o.created_at >= v_prev7_start AND o.created_at < v_last7_start), 0)
  INTO
    v_today_orders,
    v_today_revenue,
    v_open_orders,
    v_last7_orders,
    v_last7_revenue,
    v_prev7_orders,
    v_prev7_revenue
  FROM public.orders o
  WHERE o.restaurant_id = p_restaurant_id
    AND (
      (o.status = 'finalizado' AND o.created_at >= v_prev7_start AND o.created_at < v_tomorrow_start)
      OR o.status NOT IN ('finalizado', 'cancelado')
    );

  IF v_prev7_revenue > 0 THEN
    v_change_percent := ROUND(((v_last7_revenue - v_prev7_revenue) / v_prev7_revenue) * 100, 1);
  ELSIF v_last7_revenue > 0 THEN
    v_change_percent := 100;
  ELSE
    v_change_percent := 0;
  END IF;

  SELECT count(*)::integer
  INTO v_total_products
  FROM public.products p
  WHERE p.restaurant_id = p_restaurant_id
    AND p.available = true;

  SELECT jsonb_build_object(
    'productId', product_id,
    'name', product_name,
    'quantity', quantity,
    'revenue', revenue,
    'orders', orders_count
  )
  INTO v_top_product
  FROM (
    SELECT
      oi.product_id,
      max(oi.product_name) AS product_name,
      sum(oi.quantity)::numeric AS quantity,
      sum((oi.quantity * oi.price)::numeric) AS revenue,
      count(DISTINCT oi.order_id)::integer AS orders_count
    FROM public.order_items oi
    INNER JOIN public.orders o ON o.id = oi.order_id
    WHERE o.restaurant_id = p_restaurant_id
      AND o.status = 'finalizado'
      AND o.created_at >= v_last7_start
      AND o.created_at < v_tomorrow_start
    GROUP BY oi.product_id
    ORDER BY revenue DESC, quantity DESC
    LIMIT 1
  ) top_product;

  SELECT jsonb_build_object(
    'productId', p.id,
    'name', p.name,
    'price', p.price,
    'lastSoldAt', sales.last_sold_at,
    'soldLast30Days', COALESCE(sales.sold_last_30_days, 0)
  )
  INTO v_slow_product
  FROM public.products p
  LEFT JOIN LATERAL (
    SELECT
      max(o.created_at) AS last_sold_at,
      COALESCE(sum(oi.quantity) FILTER (WHERE o.created_at >= (v_reference_date - 29)::timestamptz), 0)::numeric AS sold_last_30_days
    FROM public.order_items oi
    INNER JOIN public.orders o ON o.id = oi.order_id
    WHERE o.restaurant_id = p.restaurant_id
      AND o.status = 'finalizado'
      AND oi.product_id = p.id
  ) sales ON true
  WHERE p.restaurant_id = p_restaurant_id
    AND p.available = true
  ORDER BY COALESCE(sales.sold_last_30_days, 0) ASC, sales.last_sold_at ASC NULLS FIRST, p.updated_at ASC
  LIMIT 1;

  WITH customer_last_orders AS (
    SELECT
      public.normalize_customer_phone(o.customer_phone) AS phone_normalized,
      max(o.created_at) FILTER (WHERE o.status = 'finalizado') AS last_order_at
    FROM public.orders o
    WHERE o.restaurant_id = p_restaurant_id
      AND public.normalize_customer_phone(o.customer_phone) IS NOT NULL
    GROUP BY public.normalize_customer_phone(o.customer_phone)
  )
  SELECT count(*)::integer
  INTO v_inactive_customers
  FROM public.crm_customer_profiles c
  LEFT JOIN customer_last_orders clo ON clo.phone_normalized = c.phone_normalized
  WHERE c.restaurant_id = p_restaurant_id
    AND c.accepts_marketing = true
    AND COALESCE(clo.last_order_at, c.updated_at) < (v_reference_date - 30)::timestamptz;

  IF v_last7_orders = 0 THEN
    v_recommendations := v_recommendations || jsonb_build_array(jsonb_build_object(
      'id', 'start-tracking-sales',
      'type', 'operation',
      'priority', 'high',
      'title', 'Registre pedidos para o copiloto gerar recomendações melhores',
      'summary', 'Ainda não encontrei pedidos finalizados nos últimos 7 dias.',
      'actionLabel', 'Abrir PDV',
      'actionHref', '/pdv',
      'why', jsonb_build_array(
        'Pedidos finalizados nos últimos 7 dias: 0',
        'Sem histórico recente, as recomendações ficam limitadas.'
      ),
      'data', jsonb_build_object('last7Orders', v_last7_orders),
      'guardrail', 'Nenhuma ação será executada automaticamente.'
    ));
  END IF;

  IF v_prev7_revenue > 0 AND v_change_percent <= -15 THEN
    v_recommendations := v_recommendations || jsonb_build_array(jsonb_build_object(
      'id', 'sales-drop',
      'type', 'sales',
      'priority', 'high',
      'title', 'Investigue a queda de vendas desta semana',
      'summary', format('O faturamento dos últimos 7 dias caiu %s%% contra os 7 dias anteriores.', abs(v_change_percent)),
      'actionLabel', 'Ver relatórios',
      'actionHref', '/relatorios',
      'why', jsonb_build_array(
        format('Últimos 7 dias: R$ %s em %s pedidos', to_char(v_last7_revenue, 'FM999G999G990D00'), v_last7_orders),
        format('7 dias anteriores: R$ %s em %s pedidos', to_char(v_prev7_revenue, 'FM999G999G990D00'), v_prev7_orders)
      ),
      'data', jsonb_build_object(
        'last7Revenue', v_last7_revenue,
        'previous7Revenue', v_prev7_revenue,
        'changePercent', v_change_percent
      ),
      'guardrail', 'Use esta recomendação para revisar operação, campanhas ou cardápio antes de alterar preços.'
    ));
  END IF;

  IF v_top_product IS NOT NULL THEN
    v_recommendations := v_recommendations || jsonb_build_array(jsonb_build_object(
      'id', 'top-product',
      'type', 'menu',
      'priority', 'medium',
      'title', 'Aproveite o produto campeão da semana',
      'summary', format('%s liderou o faturamento dos últimos 7 dias.', v_top_product->>'name'),
      'actionLabel', 'Ver produtos',
      'actionHref', '/produtos',
      'why', jsonb_build_array(
        format('Receita do produto: R$ %s', to_char((v_top_product->>'revenue')::numeric, 'FM999G999G990D00')),
        format('Quantidade vendida: %s', v_top_product->>'quantity')
      ),
      'data', v_top_product,
      'guardrail', 'Considere destacar no cardápio, criar combo ou usar como chamada de campanha. Nada será alterado sem confirmação.'
    ));
  END IF;

  IF v_slow_product IS NOT NULL AND COALESCE((v_slow_product->>'soldLast30Days')::numeric, 0) = 0 THEN
    v_recommendations := v_recommendations || jsonb_build_array(jsonb_build_object(
      'id', 'slow-product',
      'type', 'menu',
      'priority', 'medium',
      'title', 'Revise um produto parado no cardápio',
      'summary', format('%s não teve vendas registradas nos últimos 30 dias.', v_slow_product->>'name'),
      'actionLabel', 'Ajustar cardápio',
      'actionHref', '/produtos',
      'why', jsonb_build_array(
        'Produto ativo no cardápio.',
        'Quantidade vendida nos últimos 30 dias: 0'
      ),
      'data', v_slow_product,
      'guardrail', 'Antes de remover, revise foto, descrição, preço ou faça uma promoção de teste.'
    ));
  END IF;

  IF v_inactive_customers >= 3 THEN
    v_recommendations := v_recommendations || jsonb_build_array(jsonb_build_object(
      'id', 'inactive-customers-campaign',
      'type', 'campaign',
      'priority', 'high',
      'title', 'Crie uma campanha para clientes inativos',
      'summary', format('Há %s clientes com opt-in sem compra recente.', v_inactive_customers),
      'actionLabel', 'Criar campanha',
      'actionHref', '/email-integracao?tab=automations',
      'why', jsonb_build_array(
        format('Clientes inativos com opt-in: %s', v_inactive_customers),
        'Critério: última compra há mais de 30 dias ou contato sem compra recente.'
      ),
      'data', jsonb_build_object('inactiveCustomers', v_inactive_customers),
      'guardrail', 'O copiloto sugere a campanha, mas o envio continua dependendo da sua confirmação.'
    ));
  END IF;

  IF jsonb_array_length(v_recommendations) < 3 AND v_total_products > 0 THEN
    v_recommendations := v_recommendations || jsonb_build_array(jsonb_build_object(
      'id', 'direct-channel-push',
      'type', 'growth',
      'priority', 'low',
      'title', 'Divulgue o canal próprio nos horários de maior movimento',
      'summary', 'Use o QR Code e o link do cardápio para aumentar a base própria e reduzir dependência de marketplace.',
      'actionLabel', 'Abrir menu digital',
      'actionHref', '/cardapio',
      'why', jsonb_build_array(
        format('Produtos ativos encontrados: %s', v_total_products),
        'Mais pedidos pelo canal próprio alimentam CRM, fidelidade e campanhas.'
      ),
      'data', jsonb_build_object('activeProducts', v_total_products),
      'guardrail', 'Esta é uma recomendação comercial; nenhuma divulgação automática será feita.'
    ));
  END IF;

  RETURN jsonb_build_object(
    'generatedAt', now(),
    'referenceDate', v_reference_date,
    'summary', jsonb_build_object(
      'todayOrders', v_today_orders,
      'todayRevenue', v_today_revenue,
      'openOrders', v_open_orders,
      'last7Orders', v_last7_orders,
      'last7Revenue', v_last7_revenue,
      'previous7Orders', v_prev7_orders,
      'previous7Revenue', v_prev7_revenue,
      'salesChangePercent', v_change_percent,
      'inactiveCustomers', v_inactive_customers,
      'activeProducts', v_total_products
    ),
    'recommendations', v_recommendations,
    'disclaimer', 'Copiloto em modo recomendação: nenhuma campanha, preço, produto ou configuração é alterada automaticamente.'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_owner_copilot_insights(uuid, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_owner_copilot_insights(uuid, date) TO authenticated, service_role;

COMMENT ON FUNCTION public.get_owner_copilot_insights(uuid, date) IS
  'Gera resumo operacional e recomendações explicáveis para o dono, sem executar alterações automáticas.';
