# Plano — Onboarding do recebedor (repasse PIX para o restaurante)

**Branch:** `feature/pagarme-recipient-onboarding`
**Status geral:** em implementação
**Última atualização:** 2026-06-04

---

## 1. Contexto e problema

Hoje o PIX do cliente final (pedido do cardápio) é cobrado na conta Pagar.me **da plataforma (Pubfy)** e repassado ao restaurante via **split** para um `recipient_id` (recebedor do Pagar.me). O modelo de repasse escolhido é **automático** (a liquidação na conta bancária do restaurante é feita pelo Pagar.me, conforme as `transfer_settings` do recebedor).

**Gaps identificados na análise:**

1. **Criação do recebedor é 100% manual e externa.** O super-admin digita um `rp_...` na mão em `AdminPagarme.tsx`. Não existe fluxo que colete os dados bancários/KYC do restaurante e crie o recebedor no Pagar.me. Não escala e é a principal causa de confusão sobre "como o dinheiro chega no lojista".
2. **O lojista não informa a conta bancária dentro do produto.** `PagarmeConfig.tsx` só tem um botão "Solicitar ativação".
3. (Fora do escopo desta entrega) Não há painel financeiro (saldo/extrato/saque) para o lojista — tratado em plano futuro.

**Decisões fechadas com o produto:**

- Modelo de liquidação: **repasse automático** via split → recebedor (Pagar.me liquida direto na conta do restaurante).
- Prioridade desta entrega: **onboarding do recebedor** (coletar dados bancários + KYC e criar o `recipient` no Pagar.me automaticamente).

---

## 2. Objetivo desta entrega

Permitir que o **dono do restaurante** preencha, dentro do Pubfy, os dados necessários (titular + conta bancária + documento) e que o sistema **crie/atualize automaticamente o recebedor no Pagar.me**, gravando o `recipient_id` e o status de KYC. O super-admin passa a **acompanhar e aprovar** com base nesses dados, em vez de digitar o `rp_...` manualmente.

### Fora de escopo (próximas entregas)
- ~~Painel financeiro do lojista (saldo, extrato, liquidações).~~ → **Entregue** (ver seção 7).
- Saque manual / antecipação configurável pelo lojista.
- Cartão de crédito online no cardápio.
- Webhook de `recipient`/KYC do Pagar.me para atualizar status automaticamente (faremos sincronização sob demanda nesta entrega; webhook fica como melhoria).

---

## 3. Arquitetura proposta

```mermaid
flowchart TB
  Owner[Dono do restaurante] -->|preenche dados banc.+KYC| Cfg[PagarmeConfig.tsx]
  Cfg -->|invoke| EF[pagarme-create-recipient]
  EF -->|POST/PUT /recipients| PM[Pagar.me Core v5]
  EF -->|grava recipient_id + status| DB[(restaurant_recipient_accounts<br/>+ restaurant_payment_settings)]
  Admin[Super Admin] -->|aprova / sincroniza status| AdminPg[AdminPagarme.tsx]
  AdminPg -->|invoke sync| EF
```

- **PII isolada:** dados bancários e documentos ficam numa tabela dedicada (`restaurant_recipient_accounts`) com RLS estrita; nunca trafegam para o público.
- **Secret única:** a edge function usa `PAGARME_SECRET_KEY` (plataforma). O lojista nunca informa chave de API.
- **Idempotência:** se já existe `recipient_id`, a function atualiza o recebedor/conta em vez de criar duplicado.

---

## 4. Checklist de tarefas

### Banco de dados
- [x] **DB-1** Migration: tabela `restaurant_recipient_accounts` (dados do titular, documento, conta bancária, `recipient_id`, `recipient_status`, `kyc_status`, `last_response`, timestamps) com RLS. → `supabase/migrations/20260604190000_pagarme_recipient_onboarding.sql`
- [x] **DB-2** Migration: colunas auxiliares em `restaurant_payment_settings` (`recipient_status`, `recipient_synced_at`) para refletir o estado sem expor PII.
- [x] **DB-3** Atualizar `src/integrations/supabase/types.ts` com as novas estruturas.

### Backend (Edge Function)
- [x] **EF-1** Criar `supabase/functions/pagarme-create-recipient/index.ts`: autentica dono/super-admin, valida payload, cria/atualiza recipient no Pagar.me, persiste no banco.
- [x] **EF-2** Suportar ação `sync_status` (consulta `GET /recipients/{id}` e atualiza status local).
- [x] **EF-3** Registrar a function em `supabase/config.toml` (`verify_jwt = true`).
- [x] **EF-4** Reaproveitar helpers de erro (`_shared/pagarme-errors.ts`) e observabilidade.

### Frontend
- [x] **FE-1** `src/services/restaurantRecipientService.ts`: tipos + invoke das ações (`submit`, `sync`).
- [x] **FE-2** `PagarmeConfig.tsx`: formulário de onboarding (titular, documento, conta bancária) com validação; substitui o botão genérico "Solicitar ativação".
- [x] **FE-3** `AdminPagarme.tsx`: exibir status do recebedor/KYC, dados resumidos, botão "Sincronizar status"; `recipient_id` preenchido automaticamente (com override manual mantido).

### Qualidade / entrega
- [x] **QA-1** `npm run typecheck` verde; sem erros de lint nos arquivos alterados.
- [ ] **QA-2** Revisão de RLS e de não-exposição de PII no fluxo público.
- [ ] **QA-3** Atualizar `docs/INTEGRACOES_PAGARME.md` e o roteiro de homologação com o novo fluxo.
- [ ] **QA-4** Itens de homologação (criar recebedor de teste, validar split com recebedor real).
- [ ] **DEPLOY** Aplicar migration e fazer deploy da function `pagarme-create-recipient` no projeto Supabase.

---

## 5. Notas / riscos

- **KYC do Pagar.me é assíncrono:** após criar o recebedor, o status pode ficar `registration`/`affiliation`/`active`. O split só funciona com recebedor apto. Por isso `onboarding_status` local começa em `pending` e só vai a `approved` quando o recebedor estiver `active` (sincronização manual nesta entrega; webhook depois).
- **Simulador PIX + Split:** conforme doc Pagar.me, o simulador de PIX pode não funcionar com split — validar em homologação com recebedor real de teste.
- **Bug pré-existente — CORRIGIDO:** imports faltantes adicionados em
  `pagarme-create-order-payment/index.ts` (`buildPagarmeOrderLineItems`, `toCents`) e em
  `pagarme-webhook/index.ts` (`reconcileOrderPaymentFromPagarme`, `PagarmeOrderPaymentData`).
  Sem isso, o webhook de `order.*` e a criação de PIX de pedido lançavam `ReferenceError` em runtime.

---

## 7. Entrega 2 — Painel financeiro do lojista

**Objetivo:** dar visibilidade do dinheiro recebido e do saldo, dentro do produto.

### Checklist
- [x] **FIN-DB/EF** Edge function `pagarme-recipient-financials`: consulta `GET /recipients/{id}/balance`
  (saldo disponível, a liberar, transferido) e `GET /recipients/{id}/transfers` (liquidações). Registrada em `config.toml`.
- [x] **FIN-SVC** `src/services/recipientFinancialsService.ts`: saldo via edge function + extrato a partir de `order_payments` (com número/cliente do pedido) e resumo (total recebido, pedidos pagos, ticket médio).
- [x] **FIN-UI** Página `src/pages/Recebimentos.tsx`: cards de resumo, saldo Pagar.me, transferências e extrato com filtro de período (7/30/90 dias).
- [x] **FIN-NAV** Rota `/recebimentos` (`AppRoutes.tsx`) + item "Recebimentos" no menu (`DashboardSidebar.tsx`).
- [x] **FIN-QA** `npm run typecheck` verde; sem lints.
- [ ] **FIN-DEPLOY** Deploy da function `pagarme-recipient-financials` e teste com recebedor real.

### Observações
- O extrato usa dados locais (`order_payments`) — sempre disponível mesmo sem recebedor ativo.
- O saldo/transferências dependem do recebedor já criado no Pagar.me; sem recebedor, a UI mostra aviso e só o extrato.
- Saque/antecipação não estão expostos (liquidação é automática `Daily`); ficam como evolução futura.

---

## 6. Registro de execução

| Data | Item | Observação |
|------|------|------------|
| 2026-06-04 | Branch + plano | Branch `feature/pagarme-recipient-onboarding` criada e plano aprovado |
| 2026-06-04 | DB + EF + FE | Migration, edge function, serviço e UIs (lojista + admin) implementados; `npm run typecheck` verde |
| 2026-06-04 | Bugfix imports | Corrigidos imports faltantes em `pagarme-create-order-payment` e `pagarme-webhook` |
| 2026-06-04 | Painel financeiro | Edge `pagarme-recipient-financials`, serviço, página `/recebimentos` e item de menu; typecheck verde |
