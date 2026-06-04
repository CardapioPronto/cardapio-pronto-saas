-- Bloco 8: alertas internos do Copiloto para o sino do dashboard.

CREATE OR REPLACE FUNCTION public.get_owner_copilot_alerts(
  p_restaurant_id uuid,
  p_reference_date date DEFAULT CURRENT_DATE
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reference_date date := COALESCE(p_reference_date, CURRENT_DATE);
  v_row public.owner_copilot_daily_summaries%ROWTYPE;
  v_summary jsonb;
  v_alerts jsonb;
BEGIN
  PERFORM public.assert_restaurant_report_access(p_restaurant_id);

  SELECT *
  INTO v_row
  FROM public.owner_copilot_daily_summaries
  WHERE restaurant_id = p_restaurant_id
    AND summary_date = v_reference_date;

  IF v_row.id IS NULL THEN
    v_summary := public.refresh_owner_copilot_daily_summary(p_restaurant_id, v_reference_date);
  ELSE
    v_summary := jsonb_build_object(
      'id', v_row.id,
      'restaurantId', v_row.restaurant_id,
      'summaryDate', v_row.summary_date,
      'insights', v_row.insights,
      'recommendationStates', v_row.recommendation_states,
      'generatedAt', v_row.generated_at,
      'updatedAt', v_row.updated_at
    );
  END IF;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', pending.recommendation->>'id',
        'title', pending.recommendation->>'title',
        'description', pending.recommendation->>'summary',
        'priority', pending.recommendation->>'priority',
        'type', pending.recommendation->>'type',
        'actionHref', pending.recommendation->>'actionHref',
        'summaryDate', v_summary->>'summaryDate'
      )
      ORDER BY pending.priority_order, pending.title
    ),
    '[]'::jsonb
  )
  INTO v_alerts
  FROM (
    SELECT
      recommendation,
      COALESCE(recommendation->>'title', '') AS title,
      CASE recommendation->>'priority'
        WHEN 'high' THEN 1
        WHEN 'medium' THEN 2
        ELSE 3
      END AS priority_order
    FROM jsonb_array_elements(COALESCE(v_summary #> '{insights,recommendations}', '[]'::jsonb)) AS recommendation
    WHERE recommendation->>'priority' IN ('high', 'medium')
      AND COALESCE(v_summary->'recommendationStates'->(recommendation->>'id')->>'status', 'open')
        NOT IN ('reviewed', 'dismissed')
    ORDER BY
      CASE recommendation->>'priority'
        WHEN 'high' THEN 1
        WHEN 'medium' THEN 2
        ELSE 3
      END,
      COALESCE(recommendation->>'title', '')
    LIMIT 5
  ) pending;

  RETURN jsonb_build_object(
    'summaryDate', v_summary->>'summaryDate',
    'generatedAt', v_summary->>'generatedAt',
    'alerts', v_alerts,
    'unreadCount', jsonb_array_length(v_alerts)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_owner_copilot_alerts(uuid, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_owner_copilot_alerts(uuid, date) TO authenticated, service_role;

COMMENT ON FUNCTION public.get_owner_copilot_alerts(uuid, date) IS
  'Retorna recomendacoes de alta/media prioridade ainda nao revisadas ou descartadas para alertas internos do dashboard.';
