# Integrações Pagar.me — visão técnica

Resumo para desenvolvedores e suporte.

- **Homologação / go-live:** `docs/ROTEIRO_PAGARME_HOMOLOGACAO_PRODUCAO.md`
- **Manutenção assinatura B2B (bugs/gaps):** `docs/PLANO_MANUTENCAO_ASSINATURA_PAGARME.md`
- **Onboarding recebedor / repasse PIX pedidos:** `docs/PLANO_ONBOARDING_RECEBEDOR_PAGARME.md`

## Dois produtos de cobrança no Pubfy

### 1. Assinatura da plataforma (B2B)

O restaurante paga o plano Pubfy (mensal/anual).

| Etapa | Implementação |
|-------|----------------|
| UI | `PaymentForm` em `/assinaturas` |
| API | `pagarme-create-subscription` (cartão), `pagarme-create-boleto-pix` (boleto) |
| Planos | `pagarme-sync-plan` + colunas `pagarme_plan_id_*` em `plans` |
| Estado | tabela `subscriptions` |
| Async | `pagarme-webhook` (`subscription.*`, `charge.*`, `invoice.*`) |
| Pós-venda | `pagarme-update-subscription`, `pagarme-get-receipt` |

**Métodos hoje:** cartão (`pagarme-create-subscription`), boleto e PIX (`pagarme-create-boleto-pix`). Cartão: primeira cobrança via `POST /orders` (tentativas recusadas não criam `sub_*`); após pagamento aprovado, uma assinatura recorrente `POST /subscriptions` com `start_at` na próxima renovação (evita cobrar o mesmo período duas vezes). PIX da assinatura usa pedido avulso; boleto usa `sub_*` direto. Webhook `charge.paid`/`order.paid` com `metadata.source = pubfy_platform_subscription` ativa o plano e promove `or_*` → `sub_*` quando necessário.

### 2. Pagamento online do pedido (B2C)

Cliente final paga pedido do cardápio digital.

| Etapa | Implementação |
|-------|----------------|
| UI | `CheckoutFlow` + `AcompanharPedido` |
| API | `pagarme-create-order-payment` (somente `pix` hoje) |
| Config loja | `restaurant_payment_settings` + telas `PagarmeConfig` / Admin |
| Estado | `order_payments` + `orders.payment_status` |
| Async | `pagarme-webhook` → `processOrderPaymentEvent` (`reconcileOrderPaymentFromPagarme`) |
| Marketplace | `PAGARME_PLATFORM_RECIPIENT_ID` + split por restaurante (`recipient_id`) |

### 3. Onboarding do recebedor + financeiro do lojista (B2C)

Fluxo que cria o **recebedor (`recipient`)** do restaurante e dá visibilidade do repasse.

| Etapa | Implementação |
|-------|----------------|
| UI onboarding | `PagarmeConfig` (form de titular + conta bancária) |
| API onboarding | `pagarme-create-recipient` (`action: submit` cria/atualiza, `sync_status` consulta KYC) |
| Sync automático | `pagarme-webhook` (`recipient.created`/`recipient.updated`/`recipient.deleted`) + poll na UI (30s × 10 após cadastro) |
| Notificações | E-mail ao lojista (`recipient_activated` / `recipient_refused`) + alertas no sino do dashboard |
| Estado recebedor | `restaurant_recipient_accounts` (PII, RLS) + espelho em `restaurant_payment_settings` (`recipient_status`, `recipient_synced_at`) |
| Admin | `AdminPagarme` mostra `recipient_status` e botão “Sincronizar status” |
| UI financeiro | `Recebimentos` (`/recebimentos`): saldo, liquidações e extrato |
| API financeiro | `pagarme-recipient-financials` (`GET /recipients/{id}/balance` + `/transfers`) |

**Modelo de repasse:** automático. A cobrança ocorre na conta da plataforma e o **split** envia a parte do
restaurante ao seu `recipient_id`; o Pagar.me liquida na conta bancária do recebedor (`transfer_settings` `Daily`).
O lojista **não informa chave de API nem chave PIX** — só dados bancários do recebedor.

**Status do recebedor (`recipient_status`):** `not_created → registration → affiliation → active`
(`refused`/`suspended`/`blocked`/`inactive`). PIX online só é liberado com recebedor `active`
(reflete em `restaurant_payment_settings.onboarding_status = approved`).

## Webhook

- **URL:** `{SUPABASE_URL}/functions/v1/pagarme-webhook`
- **Auth:** HMAC SHA-256/SHA-1 em `x-hub-signature` ou `x-pagarme-signature`
- **Secrets:** `PAGARME_WEBHOOK_SECRET` (preferencial) e fallback `PAGARME_SECRET_KEY`
- **Auditoria:** `pagarme_webhook_events` (`signature_valid`, `processed`, `processing_error`)
- **JWT:** desligado na função (`verify_jwt = false`) — correto para chamadas da Pagar.me
- **Recebedor:** habilitar no painel Pagar.me os eventos `recipient.created`, `recipient.updated` e `recipient.deleted` no mesmo endpoint

## Homologação vs produção

| Item | Teste | Produção |
|------|-------|----------|
| Secret | `sk_test_…` | `sk_live_…` |
| Painel | Loja de teste + simuladores | Conta live |
| Planos | IDs após sync em test | **Novos** IDs após sync em live |
| Webhook | Endpoint pode ser o mesmo projeto; secret de teste | Secret de produção no painel live |

## Simuladores (atalho)

- **Cartão sucesso:** `4000000000000010`
- **Cartão falha:** `4000000000000028`
- **PIX pedido sucesso:** valor ≤ R$ 500
- **PIX pedido falha:** valor > R$ 500

Detalhes e matriz completa: `docs/ROTEIRO_PAGARME_HOMOLOGACAO_PRODUCAO.md`.

## Limitações conhecidas (maio/2026)

1. `src/services/payment/*` é legado; usar `pagarmeSubscriptionService` + Edge Functions.
2. Simulador PIX não funciona com Split (doc Pagar.me) — vale para pedidos marketplace.
3. Status `pending` (boleto/PIX) não libera acesso ao produto até webhook `charge.paid` — intencional.
4. Planos com PIX precisam ser **re-sincronizados** no Admin após habilitar o método no plano.
5. **KYC do recebedor incompleto (CRÍTICO):** `pagarme-create-recipient` ainda não envia o `register_information`
   completo (endereço, renda, ocupação, nascimento, nome da mãe; PJ: sócios/faturamento) exigido pela API v5
   desde fev/2024. Em `sk_live` a criação pode ser recusada. Backlog Bloco A em
   `docs/PLANO_ONBOARDING_RECEBEDOR_PAGARME.md`.
6. **Extrato em valor bruto:** a página `Recebimentos` soma `order_payments.amount` (total do pedido), não o
   líquido repassado (sem descontar comissão/taxas). Backlog Bloco B.
7. **Status do recebedor sem webhook:** atualiza só via botão “Sincronizar” (`sync_status`). Backlog Bloco C.

## Onboarding de recebedor — referência rápida

```sql
-- Estado do recebedor de um restaurante
SELECT recipient_id, recipient_status, kyc_status, synced_at
FROM restaurant_recipient_accounts WHERE restaurant_id = '<uuid>';

-- Espelho em settings (usado no checkout/admin)
SELECT recipient_id, recipient_status, onboarding_status, is_enabled
FROM restaurant_payment_settings WHERE restaurant_id = '<uuid>';
```

## Onde olhar em incidente

```sql
-- Últimos webhooks
SELECT event_type, signature_valid, processed, processing_error, created_at
FROM pagarme_webhook_events ORDER BY created_at DESC LIMIT 10;

-- Assinatura do restaurante
SELECT status, pagarme_subscription_id, last_payment_status, next_billing_at
FROM subscriptions WHERE restaurant_id = '<uuid>' ORDER BY created_at DESC LIMIT 1;

-- PIX de pedido
SELECT status, provider_charge_id, amount FROM order_payments
WHERE order_id = '<uuid>' ORDER BY created_at DESC LIMIT 1;
```

Mais cenários: `docs/SUPORTE_PROBLEMAS_COMUNS.md`.
