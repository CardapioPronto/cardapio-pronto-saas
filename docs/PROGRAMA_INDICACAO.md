# Programa de indicações — Pubfy

Branch: `feature/programa-indicacoes-foundation`  
Status: fundação em desenvolvimento (`program_enabled = false` por padrão).

## Objetivo

Permitir que qualquer pessoa física cadastrada indique restaurantes ao Pubfy e receba comissão recorrente sobre assinaturas pagas, com painel, materiais de campanha e administração em super admin.

## Rotas (planejadas / iniciais)

| Rota | Público | Descrição |
|------|---------|-----------|
| `/indique` | Sim | Apresentação do programa |
| `/indique/cadastro` | Sim | Cadastro / ativação de afiliado |
| `/indique/painel` | Autenticado | Código, link, resumo |
| `/indique/materiais` | Afiliado ativo | Materiais de campanha |
| `/indique/termos` | Sim | Termos do programa (versão publicada) |
| `/cadastro?ref=CODE` | Sim | Cadastro de restaurante com atribuição |
| `/admin/indicacoes` | Super admin | Configuração e operação |

## Atribuição (first-touch + janela)

1. Clique em `/cadastro?ref=CODE` grava cookie/localStorage (`pubfy_ref`, `pubfy_ref_at`).
2. Janela padrão: **90 dias** (`attribution_window_days`), configurável no admin.
3. No signup do dono, `referral_code` e `referral_first_click_at` vão em `user_metadata`.
4. Em `finalize-owner-signup`, RPC `attribute_restaurant_referral` grava `restaurant_referrals`.
5. Indicação é **imutável** por restaurante.

## Comissão (próxima fase)

- Gerada no webhook Pagar.me quando assinatura plataforma é paga (`referral_commission_ledger`).
- Estados: `pending` → `approved` (após `hold_days_before_approval`) → `paid`.
- Estorno: `reversed`.

## Flags (super admin)

| Campo | Efeito |
|-------|--------|
| `program_enabled` | Liga/desliga programa |
| `accepting_new_referrals` | Novos afiliados e novas atribuições |
| `accrual_enabled` | Novas linhas no ledger (fase webhook) |
| `paused_message` / `paused_until` | Mensagem na landing quando pausado |

## Schema

Ver migration `20260603120000_referral_program_foundation.sql`.

## Entregue nesta fatia (branch)

- Migration `20260603120000_referral_program_foundation.sql`
- Rotas `/indique`, `/indique/cadastro`, `/indique/painel`, `/indique/materiais`, `/admin/indicacoes`
- Captura `?ref=` no `/cadastro` (cookie/localStorage + metadata)
- Atribuição em `finalize-owner-signup` via RPC `attribute_restaurant_referral`
- Programa **desligado por padrão** (`program_enabled = false`)

## Fase 2 (branch)

- Webhook Pagar.me → `accrue_referral_commission_for_payment` / estorno
- Painel afiliado: saldos, PIX, solicitar saque, indicações e comissões
- Admin: abas Saques/Comissões e Materiais (CRUD + bucket `affiliate-campaign-assets`)

## Fase 3 (branch)

- Edge `referral-notify`: comissões aprovadas (mature + e-mail), saque pago
- E-mail transacional ao registrar comissão (carência) via webhook
- QR Code do link no painel do afiliado
- Testes Vitest: `referralAttribution.test.ts`, `formatCents.test.ts`

### Deploy da edge

```bash
supabase functions deploy referral-notify
```

## Fase 4 (branch)

- Migration `20260603160000_referral_program_phase4.sql`: `terms_content`, templates Resend globais
- Admin `/admin/indicacoes`: aba **E-mails** (3 templates) + editor de termos na configuração
- Rota pública `/indique/termos` (Markdown simples)
- Edge `_shared/referral-notifications.ts` usa `templateKey` + `PUBLIC_SITE_URL`
- Testes: `src/lib/formatReferralTerms.test.ts`, `npm run test:referral-db` (SQL, requer `DATABASE_URL`)

```bash
supabase db push   # ou migration phase4
npm run test:referral-db
```

## Fase 5 (branch)

- Padronização UI/UX da área `/indique` para o visual principal do Pubfy (tema claro, contraste e hierarquia)
- Melhorias de navegação e estados vazios em landing, cadastro, painel, materiais e termos
- Admin `/admin/indicacoes` com cards de visão rápida operacional (saques pendentes e comissões por status)

## Fase 6 (branch)

- Migration `20260603170000_referral_program_phase6_admin_funnel.sql`
- RPC `list_referral_admin_snapshot` passa a retornar:
  - `funnel_summary` (atribuídos, com pagamento, conversão, comissão gerada/paga)
  - `top_affiliates` (ranking por comissão gerada)
- Admin `/admin/indicacoes` exibe funil e tabela de top afiliados

```bash
supabase db push
```

## Fase 7 (branch)

- Página pública `"/indique/criar-conta"` para cadastro de afiliado sem restaurante
- Fluxo separado do `"/cadastro"` de dono (não altera criação de restaurante nem funcionários)
- Migration `20260603173000_affiliate_signup_without_restaurant.sql` ajusta `handle_new_user`:
  - `signup_intent = 'affiliate_signup'` => usuário app com `role = 'affiliate'` e `user_type = NULL`
  - demais fluxos continuam com comportamento atual
- Login redireciona conta `role = 'affiliate'` para `"/indique/painel"`

## Fase 8 (branch)

- Compatibilidade de contas já existentes:
  - `create-employee` reforçado para localizar usuário existente por e-mail (inclusive base grande/paginada)
  - senha só é exigida quando o e-mail ainda não existe no Auth
- Novo RPC `complete_existing_user_owner_signup(...)` para permitir que conta já existente conclua cadastro de dono sem recriar usuário
- `"/cadastro"` passa a suportar usuário autenticado concluindo criação do restaurante
- Fluxo de dono novo (`owner_signup`) e fluxo de funcionários permanecem intactos

## Próxima fatia

- Piloto controlado com `program_enabled = true` em homolog
- Métricas/relatório admin (conversão clique → cadastro → assinatura paga)
- Revisão jurídica dos termos padrão

## QA manual (quando ativar)

- [ ] Programa desligado: landing informa indisponível
- [ ] Afiliado cria código e copia link
- [ ] Clique → abandono → retorno em 20d: atribuição mantida
- [ ] Clique expirado (> janela): sem atribuição
- [ ] Auto-indicação (mesmo owner): bloqueada
- [ ] Pagamento assinatura: ledger (fase 2)
