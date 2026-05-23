-- Polling automático iFood: estado por restaurante + agendamento pg_cron.

ALTER TABLE public.ifood_integration
  ADD COLUMN IF NOT EXISTS last_polled_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_poll_error text;

COMMENT ON COLUMN public.ifood_integration.last_polled_at IS
  'Última execução do poll automático (Edge ifood-poll-cron).';
COMMENT ON COLUMN public.ifood_integration.last_poll_error IS
  'Último erro do poll automático, se houver.';

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

DO $cron$
DECLARE
  v_job_id bigint;
BEGIN
  SELECT jobid INTO v_job_id
  FROM cron.job
  WHERE jobname = 'ifood-poll-cron-every-minute'
  LIMIT 1;

  IF v_job_id IS NOT NULL THEN
    PERFORM cron.unschedule(v_job_id);
  END IF;

  PERFORM cron.schedule(
    'ifood-poll-cron-every-minute',
    '* * * * *',
    $job$
    SELECT net.http_post(
      url := 'https://jyrfjvyeikhqpuwcvdff.supabase.co/functions/v1/ifood-poll-cron',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', coalesce(
          (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret' LIMIT 1),
          (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'CRON_SECRET' LIMIT 1),
          ''
        )
      ),
      body := '{}'::jsonb
    ) AS request_id;
    $job$
  );
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'pg_cron/pg_net ou vault indisponível; configure o job manualmente (docs/IFOOD_POLLING_CRON.md).';
  WHEN OTHERS THEN
    RAISE NOTICE 'ifood poll cron não agendado: %', SQLERRM;
END;
$cron$;
