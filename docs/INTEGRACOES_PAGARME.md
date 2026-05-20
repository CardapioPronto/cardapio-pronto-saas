# Integrações Pagar.me — visão técnica

Resumo para desenvolvedores e suporte. O checklist operacional completo está em **`docs/ROTEIRO_PAGARME_HOMOLOGACAO_PRODUCAO.md`**.

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

**Métodos hoje:** cartão (`pagarme-create-subscription`), boleto e PIX (`pagarme-create-boleto-pix`). O PIX da assinatura usa **pedido avulso** (`POST /orders`) porque a API de assinaturas do Pagar.me v5 aceita só `credit_card`, `boleto` e `debit_card`; o webhook ativa o plano em `charge.paid`/`order.paid` com `metadata.source = pubfy_platform_subscription`.

### 2. Pagamento online do pedido (B2C)

Cliente final paga pedido do cardápio digital.

| Etapa | Implementação |
|-------|----------------|
| UI | `CheckoutFlow` + `AcompanharPedido` |
| API | `pagarme-create-order-payment` (somente `pix` hoje) |
| Config loja | `restaurant_payment_settings` + telas `PagarmeConfig` / Admin |
| Estado | `order_payments` + `orders.payment_status` |
| Async | `pagarme-webhook` → `processOrderPaymentEvent` |
| Marketplace | `PAGARME_PLATFORM_RECIPIENT_ID` + split opcional por restaurante |

## Webhook

- **URL:** `{SUPABASE_URL}/functions/v1/pagarme-webhook`
- **Auth:** HMAC SHA-256/SHA-1 em `x-hub-signature` ou `x-pagarme-signature`
- **Secrets:** `PAGARME_WEBHOOK_SECRET` (preferencial) e fallback `PAGARME_SECRET_KEY`
- **Auditoria:** `pagarme_webhook_events` (`signature_valid`, `processed`, `processing_error`)
- **JWT:** desligado na função (`verify_jwt = false`) — correto para chamadas da Pagar.me

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
