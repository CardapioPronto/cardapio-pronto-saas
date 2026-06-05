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
VALUES
(
  NULL,
  'recipient_activated',
  'Recebedor ativo',
  'Avisa o lojista que o recebedor Pagar.me foi aprovado e o PIX online pode ser ligado.',
  'transactional',
  'Recebedor aprovado — PIX online disponível',
  '<h2>Recebedor aprovado</h2><p>Olá {{customer_name}},</p><p>O cadastro do recebedor do restaurante <strong>{{restaurant_name}}</strong> foi aprovado pelo Pagar.me.</p><p>Status: <strong>{{recipient_status}}</strong></p><p>Você já pode ativar o PIX online em Recebimentos Online no painel.</p><p><a href="{{config_url}}">Abrir configuração de recebimentos</a></p>',
  'Olá {{customer_name}}, o recebedor de {{restaurant_name}} foi aprovado ({{recipient_status}}). Ative o PIX online em Recebimentos Online.',
  '["customer_name","restaurant_name","recipient_status","config_url"]'::jsonb,
  true
),
(
  NULL,
  'recipient_refused',
  'Recebedor recusado',
  'Avisa o lojista que o recebedor Pagar.me foi recusado no KYC.',
  'transactional',
  'Recebedor recusado — revise os dados',
  '<h2>Recebedor recusado</h2><p>Olá {{customer_name}},</p><p>O Pagar.me recusou o cadastro do recebedor do restaurante <strong>{{restaurant_name}}</strong>.</p><p>Status: <strong>{{recipient_status}}</strong></p><p>{{status_message}}</p><p><a href="{{config_url}}">Revisar dados em Recebimentos Online</a></p>',
  'Olá {{customer_name}}, o recebedor de {{restaurant_name}} foi recusado ({{recipient_status}}). {{status_message}}',
  '["customer_name","restaurant_name","recipient_status","status_message","config_url"]'::jsonb,
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
