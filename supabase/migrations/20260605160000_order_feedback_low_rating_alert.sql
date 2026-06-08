-- Bloco 11: alerta proativo ao dono quando a nota NPS for baixa (<= 6).

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

INSERT INTO public.email_templates (
  restaurant_id,
  template_key,
  name,
  description,
  category,
  subject,
  html_content,
  text_content,
  variables,
  is_system
)
VALUES (
  NULL,
  'order_feedback_low_rating',
  'Avaliação baixa',
  'Avisa o dono do restaurante quando um cliente envia nota detratora (0–6) no pós-pedido.',
  'transactional',
  'Avaliação baixa no pedido {{order_number}}',
  '<h2>Avaliação baixa recebida</h2><p>Olá {{owner_name}},</p><p>O cliente <strong>{{customer_name}}</strong> avaliou o pedido <strong>{{order_number}}</strong> ({{order_total}}) com nota <strong>{{rating}}/10</strong> em <strong>{{restaurant_name}}</strong>.</p><p><strong>Comentário:</strong> {{comment_preview}}</p><p><strong>Pediu contato:</strong> {{contact_requested}}</p><p>Telefone informado: {{customer_phone}}</p><p><a href="{{reports_url}}">Ver avaliações no painel</a></p>',
  'Olá {{owner_name}}, o cliente {{customer_name}} deu nota {{rating}}/10 no pedido {{order_number}} ({{order_total}}). Comentário: {{comment_preview}}. Pediu contato: {{contact_requested}}. Ver: {{reports_url}}',
  '["owner_name","restaurant_name","customer_name","customer_phone","rating","comment_preview","contact_requested","order_number","order_total","reports_url"]'::jsonb,
  true
)
ON CONFLICT (restaurant_id, template_key) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  subject = EXCLUDED.subject,
  html_content = EXCLUDED.html_content,
  text_content = EXCLUDED.text_content,
  variables = EXCLUDED.variables,
  is_system = EXCLUDED.is_system,
  updated_at = now();

CREATE OR REPLACE FUNCTION public.enqueue_order_feedback_low_rating_alert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_secret text;
  v_url text;
BEGIN
  IF NEW.rating > 6 THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE'
     AND OLD.rating IS NOT DISTINCT FROM NEW.rating
     AND (NEW.metadata->>'owner_alert_sent_for_rating') IS NOT DISTINCT FROM NEW.rating::text THEN
    RETURN NEW;
  END IF;

  IF (NEW.metadata->>'owner_alert_sent_for_rating') IS NOT DISTINCT FROM NEW.rating::text THEN
    RETURN NEW;
  END IF;

  v_url := coalesce(
    current_setting('app.settings.supabase_functions_url', true),
    'https://jyrfjvyeikhqpuwcvdff.supabase.co/functions/v1/order-feedback-notify'
  );

  v_secret := coalesce(
    (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'order_feedback_notify_secret' LIMIT 1),
    (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'ORDER_FEEDBACK_NOTIFY_SECRET' LIMIT 1),
    (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret' LIMIT 1),
    (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'CRON_SECRET' LIMIT 1),
    ''
  );

  BEGIN
    PERFORM net.http_post(
      url := v_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-internal-secret', v_secret
      ),
      body := jsonb_build_object('feedback_id', NEW.id::text)
    );
  EXCEPTION
    WHEN undefined_function OR undefined_table THEN
      RAISE NOTICE 'order_feedback alert: pg_net indisponível; notificação por e-mail não enfileirada.';
    WHEN OTHERS THEN
      RAISE NOTICE 'order_feedback alert: falha ao enfileirar e-mail (%).', SQLERRM;
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_order_feedback_low_rating_alert ON public.order_feedback;
CREATE TRIGGER trg_order_feedback_low_rating_alert
  AFTER INSERT OR UPDATE OF rating, comment, contact_requested
  ON public.order_feedback
  FOR EACH ROW
  EXECUTE FUNCTION public.enqueue_order_feedback_low_rating_alert();
