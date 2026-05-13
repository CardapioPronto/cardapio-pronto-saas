# Suporte — Problemas comuns e soluções

Catálogo vivo de incidentes recorrentes e como resolver. Atualize sempre
que aparecer um caso novo no piloto / produção. Categorias:

1. [Login / Autenticação](#1-login--autenticação)
2. [Assinatura e cobrança](#2-assinatura-e-cobrança)
3. [Cardápio público / pedidos](#3-cardápio-público--pedidos)
4. [PDV / pedidos internos](#4-pdv--pedidos-internos)
5. [Cozinha / KDS](#5-cozinha--kds)
6. [E-mail (transacional + campanhas)](#6-e-mail-transacional--campanhas)
7. [WhatsApp / Atendimento](#7-whatsapp--atendimento)
8. [iFood](#8-ifood)
9. [Performance / lentidão](#9-performance--lentidão)
10. [Erros do Supabase / banco](#10-erros-do-supabase--banco)

---

## 1. Login / Autenticação

### 1.1 "Não recebi o e-mail de confirmação"

**Diagnóstico:**

- Conferir em **Resend Dashboard → Logs** se o e-mail saiu.
- Se saiu mas bouncou: o domínio pode estar bloqueado (corporativo). Pedir
  para o cliente liberar `mail.pubfy.com.br`.
- Se não saiu: provavelmente Auth URLs estão erradas no Supabase
  Dashboard.

**Correção:**

1. Supabase Dashboard → Authentication → URL Configuration.
2. Site URL e Redirect URLs apontando para o domínio de produção (ver
   `docs/RUNBOOK_PRODUCAO.md` seção 2).
3. Reenviar confirmação pelo Admin → Usuários → "Resend invite".

### 1.2 Link do e-mail abre em localhost

Mesma causa do 1.1 (Site URL aponta para localhost). Aplicar correção 2
acima.

### 1.3 "Senha incorreta" depois de redefinir

Verificar se o cliente clicou no link mais recente. Links de reset
expiram em 24h. Reenviar via **Esqueci a senha**.

---

## 2. Assinatura e cobrança

### 2.1 Cliente preso em "Plano expirado" mesmo após pagar

**Diagnóstico:**

- Admin → Restaurantes → ver coluna `subscription_status`. Se está
  `past_due` ou `trialing` expirado, o webhook do Pagar.me não chegou.
- Verificar tabela `pagarme_webhook_events`:
  ```sql
  select id, event_type, signature_valid, processed, processing_error, created_at
  from pagarme_webhook_events
  order by created_at desc limit 10;
  ```

**Correção:**

- Se `signature_valid = false`: secret divergente. Rotacionar
  `PAGARME_WEBHOOK_SECRET` (runbook seção 8) e reconfigurar no painel
  Pagar.me.
- Se `processed = false` mas `processing_error` tem mensagem: investigar
  no Edge Function log; reprocessar manualmente via
  ```sql
  update subscriptions
     set status = 'active', last_payment_at = now()
   where pagarme_subscription_id = '<id>';
  ```
- Caso ainda não resolva, recriar trial via
  `select public.ensure_trial_subscription(restaurant_id, …);` (RPC do
  Bloco 4).

### 2.2 Cartão recusado em produção (sandbox funciona)

Conferir `PAGARME_SECRET_KEY` — provavelmente está em modo `test_…` na
produção. Rotacionar para `live_…` no Supabase secrets.

---

## 3. Cardápio público / pedidos

### 3.1 Cardápio público mostra "Restaurante não encontrado"

- Slug digitado errado na URL.
- `restaurants.active = false` (verificar em Configurações →
  Estabelecimento).
- RLS bloqueando `get_public_menu_data`. Conferir log do PostgREST:
  ```bash
  supabase functions logs --limit 50 | grep get_public_menu
  ```

### 3.2 Cliente reporta "Promoção não aplicou"

- Conferir status da promoção em **Cardápio → Promoções** (se está
  `is_active = true` e dentro de `valid_from`/`valid_until`).
- Se for promoção de pedido + cupom no mesmo pedido: lembrar que **só o
  maior desconto vale** (Bloco 7). É comportamento esperado.

### 3.3 Pedido sumiu / não aparece no PDV

- Pedido pode ter ficado preso em `aguardando_pagamento`. Conferir
  filtros de status na tela Pedidos.
- Se cliente usou pagamento online e não recebeu retorno, verificar
  `order_payments` para esse pedido:
  ```sql
  select id, status, provider_charge_id, raw_response->>'message' as error
  from order_payments
  where order_id = '<id>'
  order by created_at desc;
  ```

### 3.4 Frete cobrado errado

- Verificar **`restaurant_settings`** com `setting_key = 'delivery_config'`
  (JSON com `delivery_fee`, `delivery_enabled`, `min_order_value` etc.).
- Lembrar que o **frete é calculado server-side** (Bloco 2); cliente
  não consegue manipular. Se está errado, é configuração no painel.

---

## 4. PDV / pedidos internos

### 4.1 Funcionário não consegue gerenciar pedidos

Conferir permissões na tabela `user_permissions`. Precisa de
`orders_manage`. Reatribuir em **Equipe → Editar funcionário**.

### 4.2 Mesa não volta para "livre" depois de finalizar pedido

- Pedido pode ter sido criado sem `table_id`. Conferir:
  ```sql
  select id, table_id, status from orders where id = '<id>';
  ```
- Se `table_id` está null, é bug de criação (reportar). Correção
  manual:
  ```sql
  update mesas set status = 'livre' where id = '<table_id>';
  ```

---

## 5. Cozinha / KDS

### 5.1 "Notificação sonora não toca"

- Browser bloqueando autoplay (precisa de interação do usuário). Pedir
  para clicar em qualquer botão da tela uma vez por sessão.
- Arquivo `/notification.mp3` ausente no deploy. Validar via DevTools
  → Network.

### 5.2 Cozinha em TV trava após 1 hora

- Provavelmente conexão Realtime caiu. A tela tem fallback de polling
  a cada 30s, mas vale recarregar a aba.
- A médio prazo, considerar adicionar reconnect automático no
  `kitchen-orders` channel.

---

## 6. E-mail (transacional + campanhas)

### 6.1 Campanha presa em `sending`

- Verificar tabela `email_campaigns` o `failed_count`/`sent_count`.
- Edge function `email-dispatch` faz batches de 25 e atualiza progresso
  (Bloco 7). Se travou, verificar log da Edge:
  ```bash
  supabase functions logs email-dispatch --limit 100
  ```

### 6.2 Bounce rate alto

- Verificar `email_send_logs` para identificar destinatários com
  bounce permanente:
  ```sql
  select email_to, status, count(*)
  from email_send_logs
  where bounced_at is not null
  group by 1, 2 order by 3 desc limit 20;
  ```
- Remover esses contatos da audiência (`restaurant_email_contacts.unsubscribed_at = now()`).

### 6.3 Cliente reporta que tracking_url do pedido está vazio

- `PUBLIC_SITE_URL` não está configurado nos secrets do Supabase
  (Bloco 9). Definir e reenviar o e-mail.

---

## 7. WhatsApp / Atendimento

### 7.1 "Mensagem do bot não chega"

- Conferir `EVOLUTION_API_URL` e `EVOLUTION_API_KEY` nos secrets do
  Supabase.
- Conferir status da instância no painel UltraMsg/Evolution
  (`connected` vs `disconnected`).
- Logs da Edge Function `whatsapp-n8n-evolution`:
  ```bash
  supabase functions logs whatsapp-n8n-evolution --limit 50
  ```

### 7.2 IA não responde

- Verificar saldo / cota do `GROQ_API_KEY` (ou `OPENAI_API_KEY`).
- Logs da Edge `generate-ai-response`.

---

## 8. iFood

### 8.1 Pedido iFood não aparece

- Verificar última sincronização em **Integrações → iFood**.
- Logs da Edge `ifood-integration`.
- Tokens iFood expiram; rotacionar via UI (Bloco 3).

---

## 9. Performance / lentidão

### 9.1 Dashboard lento

- Período acima de 62 dias → alerta "período longo" deve aparecer
  (Bloco 6/8). Diminuir o intervalo.
- Conferir Query Performance no Supabase Dashboard. Queries com
  `mean_exec_time > 500ms` precisam revisão (índice faltando, query
  N+1).

### 9.2 PDV trava ao abrir um pedido grande

- Pedido com > 50 itens pode estresse o frontend. Caso recorrente,
  paginar a lista de itens no dialog de detalhes.

---

## 10. Erros do Supabase / banco

### 10.1 "401 Unauthorized" em endpoint privado

- Token JWT expirou. Refresh é automático; se persiste, fazer logout
  e login novamente.
- Se generalizado, conferir se `SUPABASE_ANON_KEY` foi rotacionada
  sem atualizar o frontend.

### 10.2 "permission denied for table X"

- RLS bloqueando. Verificar `user.role` e políticas da tabela.
- Conferir helpers `get_user_restaurant_id()` / `is_super_admin()`
  retornando valores corretos:
  ```sql
  select auth.uid(), get_user_restaurant_id(), is_super_admin(auth.uid());
  ```

### 10.3 Migration falhou em produção

Seguir runbook seção 7 (rollback de migration). Nunca tentar `DROP`
direto sem snapshot.

---

## Como adicionar um caso novo

1. Identifique a categoria.
2. Crie subseção `### N.X título resumido`.
3. Descreva **diagnóstico** primeiro, depois **correção**, com queries
   SQL/comandos quando aplicável.
4. Se foi resolvido com mudança de código, linkar para o commit/PR.
5. Update na data correspondente no
   `docs/PLANO_CORRECOES_PRODUCAO.md` se mudou comportamento.
