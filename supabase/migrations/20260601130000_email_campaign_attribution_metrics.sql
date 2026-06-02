-- Bloco 3: attributed revenue metrics for email campaigns.

CREATE OR REPLACE FUNCTION public.get_email_campaign_attribution_metrics(
  p_campaign_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_campaign public.email_campaigns%ROWTYPE;
  v_result jsonb;
BEGIN
  IF p_campaign_id IS NULL THEN
    RAISE EXCEPTION 'Campanha nao informada.';
  END IF;

  SELECT *
  INTO v_campaign
  FROM public.email_campaigns
  WHERE id = p_campaign_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Campanha nao encontrada.';
  END IF;

  IF NOT (
    public.is_super_admin(auth.uid())
    OR v_campaign.restaurant_id = public.get_user_restaurant_id()
  ) THEN
    RAISE EXCEPTION 'Sem permissao para acessar metricas desta campanha.';
  END IF;

  IF v_campaign.coupon_id IS NULL THEN
    RETURN jsonb_build_object(
      'coupon_id', null,
      'orders_count', 0,
      'finalized_orders_count', 0,
      'attributed_revenue', 0,
      'discount_amount', 0
    );
  END IF;

  SELECT jsonb_build_object(
    'coupon_id', v_campaign.coupon_id,
    'orders_count', COALESCE(count(DISTINCT cu.order_id) FILTER (
      WHERE cu.order_id IS NOT NULL
        AND COALESCE(o.status, '') <> 'cancelado'
    ), 0),
    'finalized_orders_count', COALESCE(count(DISTINCT cu.order_id) FILTER (
      WHERE cu.order_id IS NOT NULL
        AND o.status = 'finalizado'
    ), 0),
    'attributed_revenue', COALESCE(sum(o.total) FILTER (
      WHERE cu.order_id IS NOT NULL
        AND o.status = 'finalizado'
    ), 0),
    'discount_amount', COALESCE(sum(cu.discount_amount), 0)
  )
  INTO v_result
  FROM public.coupon_usage cu
  LEFT JOIN public.orders o
    ON o.id = cu.order_id
   AND o.restaurant_id = v_campaign.restaurant_id
  WHERE cu.coupon_id = v_campaign.coupon_id;

  RETURN COALESCE(v_result, jsonb_build_object(
    'coupon_id', v_campaign.coupon_id,
    'orders_count', 0,
    'finalized_orders_count', 0,
    'attributed_revenue', 0,
    'discount_amount', 0
  ));
END;
$$;

REVOKE ALL ON FUNCTION public.get_email_campaign_attribution_metrics(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_email_campaign_attribution_metrics(uuid) TO authenticated;

COMMENT ON FUNCTION public.get_email_campaign_attribution_metrics(uuid) IS
  'Retorna pedidos, receita e desconto atribuidos a uma campanha pelo cupom vinculado.';
