-- Bloco 8: persistência de resumos diários e revisão de recomendações.

CREATE TABLE IF NOT EXISTS public.owner_copilot_daily_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  summary_date date NOT NULL,
  insights jsonb NOT NULL,
  recommendation_states jsonb NOT NULL DEFAULT '{}'::jsonb,
  generated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT owner_copilot_daily_summaries_unique_day UNIQUE (restaurant_id, summary_date)
);

CREATE INDEX IF NOT EXISTS owner_copilot_daily_summaries_restaurant_date_idx
  ON public.owner_copilot_daily_summaries (restaurant_id, summary_date DESC);

ALTER TABLE public.owner_copilot_daily_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.owner_copilot_daily_summaries FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Restaurant staff can view own copilot summaries" ON public.owner_copilot_daily_summaries;
CREATE POLICY "Restaurant staff can view own copilot summaries"
ON public.owner_copilot_daily_summaries
FOR SELECT
TO authenticated
USING (
  restaurant_id = public.get_user_restaurant_id()
  OR public.is_super_admin(auth.uid())
);

DROP POLICY IF EXISTS "Restaurant staff can manage own copilot summaries" ON public.owner_copilot_daily_summaries;
CREATE POLICY "Restaurant staff can manage own copilot summaries"
ON public.owner_copilot_daily_summaries
FOR ALL
TO authenticated
USING (
  restaurant_id = public.get_user_restaurant_id()
  OR public.is_super_admin(auth.uid())
)
WITH CHECK (
  restaurant_id = public.get_user_restaurant_id()
  OR public.is_super_admin(auth.uid())
);

DROP TRIGGER IF EXISTS update_owner_copilot_daily_summaries_updated_at ON public.owner_copilot_daily_summaries;
CREATE TRIGGER update_owner_copilot_daily_summaries_updated_at
BEFORE UPDATE ON public.owner_copilot_daily_summaries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.refresh_owner_copilot_daily_summary(
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
  v_insights jsonb;
  v_row public.owner_copilot_daily_summaries%ROWTYPE;
BEGIN
  PERFORM public.assert_restaurant_report_access(p_restaurant_id);

  v_insights := public.get_owner_copilot_insights(p_restaurant_id, v_reference_date);

  INSERT INTO public.owner_copilot_daily_summaries (
    restaurant_id,
    summary_date,
    insights,
    generated_at
  )
  VALUES (
    p_restaurant_id,
    v_reference_date,
    v_insights,
    now()
  )
  ON CONFLICT (restaurant_id, summary_date)
  DO UPDATE SET
    insights = EXCLUDED.insights,
    generated_at = EXCLUDED.generated_at
  RETURNING * INTO v_row;

  RETURN jsonb_build_object(
    'id', v_row.id,
    'restaurantId', v_row.restaurant_id,
    'summaryDate', v_row.summary_date,
    'insights', v_row.insights,
    'recommendationStates', v_row.recommendation_states,
    'generatedAt', v_row.generated_at,
    'updatedAt', v_row.updated_at
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_owner_copilot_daily_summaries(
  p_restaurant_id uuid,
  p_limit integer DEFAULT 7
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit integer := LEAST(GREATEST(COALESCE(p_limit, 7), 1), 30);
BEGIN
  PERFORM public.assert_restaurant_report_access(p_restaurant_id);

  RETURN (
    SELECT COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', s.id,
          'restaurantId', s.restaurant_id,
          'summaryDate', s.summary_date,
          'insights', s.insights,
          'recommendationStates', s.recommendation_states,
          'generatedAt', s.generated_at,
          'updatedAt', s.updated_at
        )
        ORDER BY s.summary_date DESC
      ),
      '[]'::jsonb
    )
    FROM (
      SELECT *
      FROM public.owner_copilot_daily_summaries
      WHERE restaurant_id = p_restaurant_id
      ORDER BY summary_date DESC
      LIMIT v_limit
    ) s
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_owner_copilot_recommendation(
  p_restaurant_id uuid,
  p_summary_date date,
  p_recommendation_id text,
  p_status text DEFAULT 'reviewed'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text := COALESCE(NULLIF(trim(p_status), ''), 'reviewed');
  v_row public.owner_copilot_daily_summaries%ROWTYPE;
BEGIN
  PERFORM public.assert_restaurant_report_access(p_restaurant_id);

  IF v_status NOT IN ('reviewed', 'dismissed') THEN
    RAISE EXCEPTION 'Status de recomendacao invalido';
  END IF;

  IF NULLIF(trim(p_recommendation_id), '') IS NULL THEN
    RAISE EXCEPTION 'Recomendacao nao informada';
  END IF;

  UPDATE public.owner_copilot_daily_summaries
  SET recommendation_states =
    recommendation_states
    || jsonb_build_object(
      p_recommendation_id,
      jsonb_build_object(
        'status', v_status,
        'updatedAt', now(),
        'updatedBy', auth.uid()
      )
    )
  WHERE restaurant_id = p_restaurant_id
    AND summary_date = p_summary_date
  RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'Resumo diario nao encontrado';
  END IF;

  RETURN jsonb_build_object(
    'id', v_row.id,
    'restaurantId', v_row.restaurant_id,
    'summaryDate', v_row.summary_date,
    'insights', v_row.insights,
    'recommendationStates', v_row.recommendation_states,
    'generatedAt', v_row.generated_at,
    'updatedAt', v_row.updated_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_owner_copilot_daily_summary(uuid, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.refresh_owner_copilot_daily_summary(uuid, date) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_owner_copilot_daily_summaries(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_owner_copilot_daily_summaries(uuid, integer) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.mark_owner_copilot_recommendation(uuid, date, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_owner_copilot_recommendation(uuid, date, text, text) TO authenticated, service_role;

COMMENT ON TABLE public.owner_copilot_daily_summaries IS
  'Snapshots diarios do Copiloto do dono, com insights gerados e estado de revisao das recomendacoes.';
