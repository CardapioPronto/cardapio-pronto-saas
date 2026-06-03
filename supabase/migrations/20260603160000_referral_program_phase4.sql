-- Programa de indicações — fase 4: termos editáveis, templates de e-mail, RPCs públicas/admin.

ALTER TABLE public.referral_program_settings
  ADD COLUMN IF NOT EXISTS terms_content text;

UPDATE public.referral_program_settings
SET terms_content = COALESCE(
  terms_content,
  $terms$
# Termos do Programa de Indicações Pubfy

**Versão:** conforme campo `terms_version` no painel administrativo.

## 1. Quem pode participar
Qualquer pessoa física com conta ativa no Pubfy pode solicitar um código de indicação, salvo quando o programa estiver pausado ou desativado.

## 2. Como funciona a indicação
- Você recebe um link/código exclusivo para convidar restaurantes ao cadastro do Pubfy.
- A atribuição segue o modelo **first-touch**: o primeiro clique válido dentro da janela configurada (padrão 90 dias) é o que conta.
- Cada restaurante pode ser atribuído **uma única vez**; a indicação é imutável.

## 3. Comissão
- A comissão incide sobre **assinaturas pagas** do restaurante indicado (mensal ou anual), conforme percentuais vigentes no programa.
- Períodos de trial, cortesia ou pagamentos estornados não geram comissão definitiva.
- Valores ficam em **carência** pelo prazo configurado antes de entrarem no saldo disponível para saque.

## 4. Pagamento ao afiliado
- Saques respeitam o valor mínimo configurado e exigem chave PIX válida no perfil.
- A Pubfy pode solicitar documentação e validar dados antes de liberar pagamentos.
- Comissões fraudulentas ou em desacordo com estes termos podem ser estornadas ou retidas.

## 5. Conduta
É proibido spam, dados falsos, autoindicação, manipulação de atribuição ou qualquer prática que viole a lei ou prejudique a marca Pubfy.

## 6. Alterações
A Pubfy pode alterar percentuais, prazos, pausas e estes termos mediante nova versão publicada. O aceite no cadastro de afiliado referencia a versão vigente no momento da ativação.

## 7. Contato
Dúvidas: contato@pubfy.com.br
$terms$
)
WHERE id = 'default';

CREATE OR REPLACE FUNCTION public.get_referral_program_public_settings()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_settings public.referral_program_settings%ROWTYPE;
  v_show_pause_message boolean;
BEGIN
  SELECT * INTO v_settings FROM public.referral_program_settings WHERE id = 'default';

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'program_enabled', false,
      'accepting_new_referrals', false,
      'show_pause_message', true,
      'paused_message', 'Programa indisponível no momento.',
      'paused_until', NULL,
      'attribution_window_days', 90,
      'min_payout_amount', 50,
      'terms_version', '1',
      'terms_content', NULL
    );
  END IF;

  v_show_pause_message := NOT v_settings.program_enabled OR NOT v_settings.accepting_new_referrals;

  RETURN jsonb_build_object(
    'program_enabled', v_settings.program_enabled,
    'accepting_new_referrals', v_settings.accepting_new_referrals,
    'show_pause_message', v_show_pause_message,
    'paused_message', v_settings.paused_message,
    'paused_until', v_settings.paused_until,
    'attribution_window_days', v_settings.attribution_window_days,
    'min_payout_amount', v_settings.min_payout_amount,
    'default_commission_percent_monthly', v_settings.default_commission_percent_monthly,
    'default_commission_percent_yearly', v_settings.default_commission_percent_yearly,
    'terms_version', v_settings.terms_version,
    'terms_content', v_settings.terms_content
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_referral_program_admin_settings()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_settings public.referral_program_settings%ROWTYPE;
BEGIN
  IF v_user_id IS NULL OR NOT public.is_super_admin(v_user_id) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  SELECT * INTO v_settings FROM public.referral_program_settings WHERE id = 'default';

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'program_enabled', false,
      'accepting_new_referrals', true,
      'accrual_enabled', true,
      'paused_message', null,
      'paused_until', null,
      'default_commission_percent_monthly', 10,
      'default_commission_percent_yearly', 10,
      'attribution_window_days', 90,
      'hold_days_before_approval', 30,
      'min_payout_amount', 50,
      'terms_version', '1',
      'terms_content', null
    );
  END IF;

  RETURN jsonb_build_object(
    'program_enabled', v_settings.program_enabled,
    'accepting_new_referrals', v_settings.accepting_new_referrals,
    'accrual_enabled', v_settings.accrual_enabled,
    'paused_message', v_settings.paused_message,
    'paused_until', v_settings.paused_until,
    'default_commission_percent_monthly', v_settings.default_commission_percent_monthly,
    'default_commission_percent_yearly', v_settings.default_commission_percent_yearly,
    'attribution_window_days', v_settings.attribution_window_days,
    'hold_days_before_approval', v_settings.hold_days_before_approval,
    'min_payout_amount', v_settings.min_payout_amount,
    'terms_version', v_settings.terms_version,
    'terms_content', v_settings.terms_content
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.save_referral_program_settings(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL OR NOT public.is_super_admin(v_user_id) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  UPDATE public.referral_program_settings
  SET
    program_enabled = coalesce((p_payload->>'program_enabled')::boolean, program_enabled),
    accepting_new_referrals = coalesce((p_payload->>'accepting_new_referrals')::boolean, accepting_new_referrals),
    accrual_enabled = coalesce((p_payload->>'accrual_enabled')::boolean, accrual_enabled),
    paused_message = coalesce(nullif(trim(p_payload->>'paused_message'), ''), paused_message),
    paused_until = CASE
      WHEN p_payload ? 'paused_until' THEN (p_payload->>'paused_until')::timestamptz
      ELSE paused_until
    END,
    default_commission_percent_monthly = coalesce(
      (p_payload->>'default_commission_percent_monthly')::numeric,
      default_commission_percent_monthly
    ),
    default_commission_percent_yearly = coalesce(
      (p_payload->>'default_commission_percent_yearly')::numeric,
      default_commission_percent_yearly
    ),
    attribution_window_days = coalesce((p_payload->>'attribution_window_days')::integer, attribution_window_days),
    hold_days_before_approval = coalesce((p_payload->>'hold_days_before_approval')::integer, hold_days_before_approval),
    min_payout_amount = coalesce((p_payload->>'min_payout_amount')::numeric, min_payout_amount),
    terms_version = coalesce(nullif(trim(p_payload->>'terms_version'), ''), terms_version),
    terms_content = CASE
      WHEN p_payload ? 'terms_content' THEN nullif(trim(p_payload->>'terms_content'), '')
      ELSE terms_content
    END,
    updated_at = now(),
    updated_by = v_user_id
  WHERE id = 'default';

  RETURN public.get_referral_program_public_settings();
END;
$$;

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
  'referral_commission_pending',
  'Indicações — comissão em carência',
  'Aviso ao afiliado quando uma nova comissão entra no ledger (carência).',
  'transactional',
  'Nova comissão de indicação registrada',
  '<p>Olá{{name}},</p><p>Registramos uma nova comissão de <strong>{{amount}}</strong> no programa de indicações Pubfy.</p><p>Ela ficará em carência por {{hold_days}} dias após o pagamento do restaurante indicado. Depois disso, entrará no saldo disponível para saque.</p><p><a href="{{panel_url}}">Abrir painel de indicações</a></p>',
  'Nova comissão de {{amount}} registrada. Carência de {{hold_days}} dias. Painel: {{panel_url}}',
  '["name","amount","hold_days","panel_url"]'::jsonb,
  true
),
(
  NULL,
  'referral_commissions_approved',
  'Indicações — comissões aprovadas',
  'Aviso quando comissões saem da carência e ficam disponíveis para saque.',
  'transactional',
  'Comissões de indicação aprovadas',
  '<p>Olá{{name}},</p><p>{{count}} comissão(ões) no total de <strong>{{amount}}</strong> foram aprovadas e já podem ser incluídas na sua próxima solicitação de saque.</p><p><a href="{{panel_url}}">Ver saldo no painel</a></p>',
  'Comissões aprovadas: {{amount}} ({{count}} itens). Painel: {{panel_url}}',
  '["name","amount","count","panel_url"]'::jsonb,
  true
),
(
  NULL,
  'referral_payout_paid',
  'Indicações — saque pago',
  'Confirmação quando o admin marca um saque como pago.',
  'transactional',
  'Saque do programa de indicações processado',
  '<p>Olá{{name}},</p><p>Seu saque de <strong>{{amount}}</strong> no programa de indicações Pubfy foi marcado como pago.</p><p>Confira sua conta PIX cadastrada no programa.</p><p><a href="{{panel_url}}">Abrir painel</a></p>',
  'Saque de {{amount}} processado. Painel: {{panel_url}}',
  '["name","amount","panel_url"]'::jsonb,
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
  is_system = EXCLUDED.is_system;
