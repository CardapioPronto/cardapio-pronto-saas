# Runbook de produção — Pubfy

Documento operacional. Procedimentos para colocar e manter a aplicação no ar
em ambiente comercial. Cada seção tem **objetivo**, **passos** e **como validar**.

> O frontend Pubfy roda na infraestrutura do Lovable e usa o Supabase
> (`jyrfjvyeikhqpuwcvdff`) como backend. Não há `.env` físico — variáveis do
> Vite ficam no painel do Lovable e variáveis das Edge Functions ficam no
> Supabase Dashboard / CLI.

---

## 1. Mapa de variáveis e onde configurar

| Categoria | Variáveis | Onde configurar |
| --- | --- | --- |
| Frontend (Vite) | `VITE_SENTRY_DSN`, `VITE_SENTRY_ENVIRONMENT`, `VITE_SENTRY_RELEASE`, `VITE_APP_VERSION` (opcionais; `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` só se for self-hosted fora do Lovable — caso contrário os defaults embutidos do projeto Pubfy já funcionam) | **Lovable** → Project Settings → Environment |
| Supabase Edge Functions | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `PUBLIC_SITE_URL`, `SITE_URL`, `OWNER_SIGNUP_CLEANUP_SECRET`, `SENTRY_DSN`, `SENTRY_ENVIRONMENT`, `SENTRY_RELEASE`, `ENVIRONMENT` | **Supabase Dashboard** → Project Settings → Edge Functions → Secrets (ou `supabase secrets set NOME=valor`) |
| Pagar.me | `PAGARME_SECRET_KEY`, `PAGARME_WEBHOOK_SECRET`, `PAGARME_PLATFORM_RECIPIENT_ID` | Supabase secrets |
| Resend | `RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET`, `RESEND_FROM_NAME`, `RESEND_FROM_EMAIL`, `RESEND_REPLY_TO` | Supabase secrets |
| WhatsApp/IA | `EVOLUTION_API_URL`, `EVOLUTION_API_KEY`, `N8N_WEBHOOK_URL`, `N8N_INTERNAL_API_KEY`, `GROQ_API_KEY`, `OPENAI_API_KEY`, `LOVABLE_API_KEY` | Supabase secrets |
| Auth (URLs) | Site URL, Redirect URLs | Supabase Dashboard → Authentication → URL Configuration |

**Validação rápida:**

```bash
npm run preflight:prod
```

O preflight checa documentação, JWT obrigatório nas Edge Functions, webhooks
exigindo assinatura, observabilidade encadeada e RPCs críticas.

---

## 2. Auth — Site URL e Redirect URLs em produção

**Objetivo:** garantir que e-mails de confirmação/recuperação de senha apontem
para o domínio público, não para `localhost`.

Passos:

1. Supabase Dashboard → Authentication → URL Configuration.
2. **Site URL**: `https://pubfy.com.br` (ou domínio definitivo).
3. **Redirect URLs**: adicionar pelo menos:
   - `https://pubfy.com.br/**`
   - URL do staging Lovable, se aplicável (ex.: `https://*.lovable.app/**`).
4. Salvar.
5. Spas configurados no Lovable devem usar o mesmo Site URL como `PUBLIC_SITE_URL`
   nos secrets das Edge Functions.

Validação:

- Criar usuário de teste em produção; conferir que o link do e-mail aponta
  para `pubfy.com.br/cadastro/confirmar?token=...` e não para localhost.

---

## 3. Secrets obrigatórios — checklist antes do go-live

### 3.1 Pagar.me

Homologação passo a passo (simuladores, blocos A–K, matriz de falhas e
cutover): **`docs/ROTEIRO_PAGARME_HOMOLOGACAO_PRODUCAO.md`**. Resumo técnico:
**`docs/INTEGRACOES_PAGARME.md`**.

- [ ] Homologação em **test** concluída no roteiro Pagar.me (Blocos A–H).
- [ ] `PAGARME_SECRET_KEY` em modo **live** (não usar `test_…` em produção).
- [ ] `PAGARME_WEBHOOK_SECRET` definido e o mesmo cadastrado no painel da
      Pagar.me em **Webhooks → URL → Sign with Secret** (conta **live**).
- [ ] `PAGARME_PLATFORM_RECIPIENT_ID` apontando para o recipient da empresa.
- [ ] Endpoint do webhook em Pagar.me: `https://<project>.supabase.co/functions/v1/pagarme-webhook`.
- [ ] Planos re-sincronizados no Super Admin **após** trocar para chave live.

### 3.2 Resend

- [ ] `RESEND_API_KEY` de produção (chave separada da homologação).
- [ ] `RESEND_WEBHOOK_SECRET` definido e o mesmo cadastrado em Resend →
      Webhooks → Signing Secret.
- [ ] `RESEND_FROM_EMAIL` validado no DNS (SPF/DKIM verdes).
- [ ] Endpoint Resend: `https://<project>.supabase.co/functions/v1/resend-webhook`.

### 3.3 WhatsApp / IA

- [x] `EVOLUTION_API_URL` apontando para instância de produção.
- [ ] `EVOLUTION_API_KEY` rotacionada (não pode ser a mesma da homolog).
- [x] `N8N_WEBHOOK_URL` apontando para workflow de produção.
- [ ] `N8N_INTERNAL_API_KEY` aleatória ≥ 32 caracteres (mesma no n8n e no Supabase).
- [x] `GROQ_API_KEY` / `OPENAI_API_KEY` com cota suficiente.

### 3.4 Internos Pubfy

- [ ] `SUPABASE_SERVICE_ROLE_KEY` é o service role do projeto (rotacionar antes do go-live).
- [ ] `OWNER_SIGNUP_CLEANUP_SECRET` aleatório ≥ 32 caracteres.
- [ ] `PUBLIC_SITE_URL` / `SITE_URL` apontam para o domínio final.

### 3.5 Observabilidade

- [x] `SENTRY_DSN` (Edge) configurado — DSN do Sentry já criado pela operação.
- [x] `VITE_SENTRY_DSN` (frontend) — opcional; o código tem o DSN público
      embutido como fallback.
- [x] `SENTRY_ENVIRONMENT` = `production`, `SENTRY_RELEASE` = versão do app.

---

## 4. Validação de webhooks

Ambos os webhooks da Pubfy **rejeitam payload sem assinatura válida**
(retornam 401). Para validar manualmente:

### 4.1 Pagar.me

```bash
# Envio sem assinatura — deve responder 401
curl -i -X POST "https://<project>.supabase.co/functions/v1/pagarme-webhook" \
  -H "Content-Type: application/json" \
  -d '{"type":"charge.paid","data":{}}'
```

Esperado: `HTTP/1.1 401` e corpo `{"error":"Invalid signature"}`.

Para um teste real, use a aba **Webhooks → Test** no painel Pagar.me.
A Edge Function loga o evento em `pagarme_webhook_events` com
`signature_valid = true` quando aceito.

### 4.2 Resend

```bash
curl -i -X POST "https://<project>.supabase.co/functions/v1/resend-webhook" \
  -H "Content-Type: application/json" \
  -d '{"type":"email.delivered"}'
```

Esperado: `HTTP/1.1 400` com `Invalid webhook`. O endpoint só aceita
payloads assinados pelo svix (cabeçalhos `svix-id`, `svix-timestamp`,
`svix-signature`). Para teste real, use **Resend → Webhooks → Send test event**.

---

## 5. Backups e restore (Supabase Postgres)

**Objetivo:** garantir RPO ≤ 24h e RTO ≤ 1h.

### 5.1 Backups automatizados

O plano Pro do Supabase faz **PITR (Point-in-Time Recovery)** com janela
de 7 dias. Verificar em:

- Dashboard → Database → Backups.
- Confirmar que há um snapshot diário recente.

### 5.2 Snapshot manual antes de migração arriscada

```bash
# Requer Supabase CLI logada no projeto
supabase db dump --linked --data-only --schema public > backups/$(date +%Y%m%d_%H%M)_data.sql
supabase db dump --linked --schema public > backups/$(date +%Y%m%d_%H%M)_schema.sql
```

Guardar em storage controlado (não comitar no repo).

### 5.3 Restore (cenário crítico)

1. Avisar usuários em status page sobre janela de manutenção.
2. Dashboard → Database → Backups → escolher PITR no horário desejado.
3. Após restore, **rotacionar `SUPABASE_SERVICE_ROLE_KEY`** caso o
   incidente exija (o JWT é regenerado em restores parciais).
4. Reexecutar `npm run preflight:prod` localmente para verificar schema.
5. Validar manualmente: login owner, pedido público, webhook Pagar.me.

---

## 6. Rollback de deploy do frontend

Em Lovable cada deploy gera uma versão. Para reverter:

1. Lovable → Project → Deployments → escolher a build estável anterior →
   **Promote to production**.
2. Limpar cache CDN se aplicável (Lovable faz automático).
3. Comunicar no canal de status.

**Janela típica:** 2-5 minutos. Sem perda de dados — frontend é stateless.

---

## 7. Rollback de migration (Supabase)

Migrations vivem em `supabase/migrations/`. Estratégia:

### 7.1 Rollback simples (migration ainda não usada por usuário real)

1. Criar nova migration **inversa** com timestamp atual:
   ```sql
   -- supabase/migrations/<timestamp>_revert_<nome_original>.sql
   DROP FUNCTION IF EXISTS public.<nova_funcao>(...);
   ALTER TABLE ... DROP COLUMN IF EXISTS <coluna>;
   ```
2. Commitar e aplicar via `supabase db push`.
3. Atualizar `docs/PLANO_CORRECOES_PRODUCAO.md` registrando o rollback.

### 7.2 Rollback após uso em produção

1. **Não dropar dados** antes de exportar:
   ```bash
   supabase db dump --linked --data-only --schema public \
     --table <tabela_afetada> > backups/<data>_<tabela>.sql
   ```
2. Reverter via migration inversa idempotente.
3. Validar que RPCs antigas voltaram a funcionar (testar `create_public_menu_order`
   se a migration tocou em pedidos, etc.).
4. Se houve perda de dados, restaurar do PITR (seção 5.3) **antes** de
   liberar usuários.

---

## 8. Rotação de secrets

**Frequência mínima:** trimestral. **Obrigatório:** antes do go-live e
após qualquer incidente de segurança.

Procedimento padrão:

1. Gerar novo secret no provedor (Pagar.me, Resend, Evolution, Supabase).
2. Atualizar no Supabase: `supabase secrets set NOME=novo-valor`.
3. Para chaves que o frontend usa (`VITE_*`), atualizar no Lovable e fazer
   redeploy.
4. Confirmar que o provedor revogou o secret antigo.
5. Rodar `npm run preflight:prod` localmente para revalidar a configuração.

Service role do Supabase: rotacionar via Dashboard → Project Settings → API
→ **Generate new service role key**. Após rotacionar, atualizar em todos
os secrets das Edge Functions imediatamente — chamadas começam a falhar
em segundos.

---

## 9. Monitoramento contínuo

Mesmo sem Sentry totalmente configurado, observar:

- **Supabase Dashboard → Edge Functions → Logs**: filtrar por
  `level:error` nas Edge Functions críticas (`pagarme-webhook`,
  `email-dispatch`, `create-public-menu-order` via PostgREST).
- **Supabase Dashboard → Database → Query Performance**: queries com
  `mean_exec_time > 500ms` em horário comercial merecem investigação.
- **Pagar.me Dashboard → Webhooks**: verificar % de eventos com falha.
- **Resend Dashboard → Logs**: monitorar bounce/complaint rate.

Quando o Sentry estiver totalmente plugado, esta seção será reforçada
com regras de alerta (Edge Function error rate, p95 de tempo de resposta,
React errors).

---

## 10. Checklist de go-live

Um por restaurante novo:

- [ ] Plano Pubfy ativo (não trial).
- [ ] Cardápio configurado: categorias, produtos com preço/foto, horários.
- [ ] Se o restaurante usa estoque: ativar **Controle de estoque**, configurar
      produtos rastreados, saldo inicial e mínimo; validar produto esgotado no
      cardápio público e bloqueio/override no PDV.
- [ ] Frete configurado (zonas/raio) ou desabilitado conscientemente.
- [ ] Pagamento online testado (1 pedido real ≤ R$ 1, depois reembolsado).
- [ ] Mesas/balcão cadastrados se for uso PDV.
- [ ] Funcionários criados com permissões corretas.
- [ ] Logo, cor e segmento do tema validados no cardápio público em mobile.
- [ ] WhatsApp/n8n testado: pedido pelo cardápio gera mensagem ao restaurante.
- [ ] Se usa iFood: confirmar que pedidos entram com `source = ifood` e que a
      política de estoque foi explicada (MVP não baixa itens sem `product_id`;
      reconciliação por ajuste manual).
- [ ] Cliente de teste consegue acompanhar pedido pelo link em `PUBLIC_SITE_URL`.

Após go-live, monitorar pelas primeiras 48h via Supabase Logs +
Pagar.me Dashboard.
