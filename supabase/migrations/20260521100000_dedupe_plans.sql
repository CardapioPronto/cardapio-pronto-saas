-- Remove planos duplicados (mesmo nome), preservando o registro canônico por grupo.
-- Prioridade: assinaturas vinculadas > ativo > sync Pagar.me > IDs Pagar.me > mais antigo.

DO $$
DECLARE
  v_deleted integer;
BEGIN
  CREATE TEMP TABLE _plan_dupes ON COMMIT DROP AS
  WITH ranked AS (
    SELECT
      p.id,
      lower(trim(p.name)) AS norm_name,
      ROW_NUMBER() OVER (
        PARTITION BY lower(trim(p.name))
        ORDER BY
          (SELECT count(*)::int FROM public.subscriptions s WHERE s.plan_id = p.id) DESC,
          p.is_active DESC,
          CASE p.pagarme_sync_status
            WHEN 'synced' THEN 3
            WHEN 'pending' THEN 2
            ELSE 1
          END DESC,
          (p.pagarme_plan_id_monthly IS NOT NULL AND p.pagarme_plan_id_yearly IS NOT NULL) DESC,
          p.created_at ASC
      ) AS rn
    FROM public.plans p
  )
  SELECT d.id AS dupe_id, d.norm_name
  FROM ranked d
  WHERE d.rn > 1;

  IF NOT EXISTS (SELECT 1 FROM _plan_dupes) THEN
    RETURN;
  END IF;

  UPDATE public.subscriptions s
  SET plan_id = k.keeper_id
  FROM _plan_dupes d
  JOIN (
    SELECT norm_name, id AS keeper_id
    FROM (
      SELECT
        p.id,
        lower(trim(p.name)) AS norm_name,
        ROW_NUMBER() OVER (
          PARTITION BY lower(trim(p.name))
          ORDER BY
            (SELECT count(*)::int FROM public.subscriptions sub WHERE sub.plan_id = p.id) DESC,
            p.is_active DESC,
            CASE p.pagarme_sync_status
              WHEN 'synced' THEN 3
              WHEN 'pending' THEN 2
              ELSE 1
            END DESC,
            (p.pagarme_plan_id_monthly IS NOT NULL AND p.pagarme_plan_id_yearly IS NOT NULL) DESC,
            p.created_at ASC
        ) AS rn
      FROM public.plans p
    ) ranked
    WHERE rn = 1
  ) k ON k.norm_name = d.norm_name
  WHERE s.plan_id = d.dupe_id;

  DELETE FROM public.plan_features pf
  WHERE pf.plan_id IN (SELECT dupe_id FROM _plan_dupes);

  DELETE FROM public.plans p
  WHERE p.id IN (SELECT dupe_id FROM _plan_dupes);

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RAISE NOTICE 'Planos duplicados removidos: %', v_deleted;
END $$;
