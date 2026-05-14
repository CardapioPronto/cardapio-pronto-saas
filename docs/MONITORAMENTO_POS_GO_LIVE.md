# Rotina de monitoramento pós-go-live

Ritmo de inspeção dos primeiros 30 dias depois que um restaurante entra
em produção. Após esse período, segue ritmo permanente (seção 5).

> Quando o Sentry estiver totalmente plugado, várias dessas tarefas
> ficam automáticas via regras de alerta. Enquanto isso, a operação faz
> inspeção manual com a frequência abaixo.

---

## 1. Primeiras 48 horas (modo crítico)

**Responsável:** suporte + implantação. Cadência: a cada 4-6 horas em
horário comercial; uma checagem rápida fora dele.

| Item | Onde | Critério de alerta |
| --- | --- | --- |
| Edge Functions error rate | Supabase Dashboard → Edge Functions → Logs | qualquer erro `5xx` em `pagarme-webhook`, `email-dispatch`, `ifood-integration` |
| Webhooks Pagar.me | Painel Pagar.me → Webhooks | falhas > 0 |
| Webhooks Resend | Painel Resend → Logs | bounce/complaint > 2% |
| Conexão Realtime | Aba **Pedidos** real no restaurante | toast "Erro na conexão em tempo real" não pode aparecer |
| Mensagens WhatsApp | Painel UltraMsg/Evolution | mensagens não entregues > 0 |
| Frontend errors | Browser DevTools / Sentry (quando ativo) | `console.error` (logger gateado mostra apenas em prod com `warn/error`) |

Ação ao identificar problema: abrir issue interna e seguir
`docs/SUPORTE_PROBLEMAS_COMUNS.md`.

---

## 2. Semanas 1-2 (modo intensivo)

Responsável: suporte. Cadência: 2x por dia.

- [ ] Conferir `pagarme_webhook_events` da última hora — `signature_valid = true` e `processed = true` para todos os eventos.
- [ ] Conferir `email_send_logs` — taxa de `delivered` > 95%, `bounced` < 3%.
- [ ] Tabela `orders` — pedidos com `status = aguardando_pagamento` há mais de 30 min:
  ```sql
  select id, payment_status, created_at
  from orders
  where status = 'aguardando_pagamento'
    and created_at < now() - interval '30 minutes';
  ```
- [ ] Tabela `subscriptions` — assinaturas `past_due` há mais de 24h: notificar o dono.
- [ ] Logs do Supabase Database → Query Performance: queries com `mean_exec_time > 500ms` agregando para a base recém-criada.

---

## 3. Semanas 3-4 (modo estabilizado)

Responsável: customer success. Cadência: 1x por dia (manhã).

- [ ] Dashboard de saúde semanal (planilha ou Notion) com:
  - Total de pedidos / dia
  - Receita por canal (PDV, cardápio, iFood)
  - Bounce rate de e-mail
  - % falha de webhook Pagar.me
- [ ] Acompanhar NPS pós-uso (semana 4).
- [ ] Recolher bugs/UX feedback no template do `docs/QA_ROTEIROS_MANUAIS.md`.

---

## 4. Modo permanente (após 30 dias)

Cadência semanal, segunda-feira pela manhã.

| Frente | Métrica | Limite saudável |
| --- | --- | --- |
| Disponibilidade | Frontend (status page Lovable) | ≥ 99,5% |
| Erros Edge | error rate por função | < 1% |
| Pagamentos | webhook Pagar.me failed | < 0,5% |
| E-mail | bounce + complaint | < 3% |
| Banco | Database CPU média | < 60% |
| Banco | Queries > 1s | nenhuma fora de janela conhecida |
| Storage | Crescimento mensal | dentro do plano |
| Auth | Usuários ativos / contratantes | proporção saudável (> 0.6) |

Onde olhar:

- Supabase Dashboard → Database / Edge Functions / Auth
- Pagar.me Dashboard → Webhooks
- Resend Dashboard → Logs
- Lovable Project → Status

---

## 5. Alertas automáticos a configurar (backlog)

Vão ser ligados quando o tópico Sentry voltar ao plano. Lista de alertas
esperados:

- [x] Sentry: Edge Function errors > 0 em janela de 5 min. Monitor criado em 2026-05-14 como `Edge Functions errors - production` (`runtime:supabase_edge level:error`, `Number of Errors`, ambiente `production`). Error rate percentual > 1% fica condicionado a instrumentar transações/métricas de requisições totais nas Edge Functions.
- [ ] Sentry: p95 de tempo de resposta da Edge `create-public-menu-order` > 1.5s.
- [ ] Sentry: novo issue React com `level = error` afetando 10+ usuários.
- [ ] Pagar.me Dashboard: webhook failed > 3% em 30 min (alerta nativo).
- [ ] Resend Dashboard: complaint rate > 0,5% (alerta nativo).
- [ ] Supabase Dashboard → Logs: Database CPU > 80% por 5 min.

---

## 6. Resposta a incidente (P0/P1)

Quando um item da seção 1-2 estoura em produção comercial:

1. **Comunicar status** internamente em ≤ 5 min (canal padrão).
2. **Isolar impacto:** identificar se afeta 1 restaurante ou todos.
3. **Mitigação rápida:**
   - Frontend ruim → reverter deploy (runbook seção 6).
   - Migration ruim → reverter (runbook seção 7).
   - Edge Function quebrada → desabilitar via `supabase functions delete` ou redeploy última versão estável.
4. **RCA** (root cause analysis) em até 24h após estabilizar, registrando no `docs/SUPORTE_PROBLEMAS_COMUNS.md`.
5. **Postmortem** (apenas P0): documento separado em `docs/postmortems/<data>.md` com timeline, impacto, causa, ações.
