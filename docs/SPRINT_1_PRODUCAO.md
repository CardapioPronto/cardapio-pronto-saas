# Sprint 1 — Hardening de Segurança e Observabilidade

Este checklist concentra os passos de **infra/console** que complementam as mudanças de código entregues no Sprint 1. Execute-os antes de abrir a base para clientes em produção.

---

## 1. Aplicar migrations pendentes

As migrações abaixo precisam estar em produção:

- `20260515090000_ensure_rls_on_core_tables.sql`
- `20260515091500_dashboard_metrics_rpc.sql`
- `20260515091700_orders_summary_rpc.sql`
- `20260515100000_hide_paid_public_payment_artifacts.sql`
- `20260515101000_public_plan_summaries_rpc.sql`
- `20260518000000_public_rpc_rate_limit.sql` (novo — rate-limit base)
- `20260518000100_create_public_menu_order_rate_limit.sql` (novo — rate-limit no checkout público)
- `20260519103000_force_rls_remaining_and_email_settings_policies.sql` (FORCE RLS no restante do schema + políticas em `email_settings`)

Comando (com Supabase CLI configurado para o projeto remoto):

```bash
supabase db push
```

Confirme a lista após aplicar:

```bash
supabase migration list
```

---

## 2. Auditoria de RLS em produção

O script `scripts/audit-rls.mjs` consulta a view `public.rls_audit_report` (criada pela migration `ensure_rls_on_core_tables`) e falha se alguma tabela crítica estiver sem RLS ou sem políticas.

Usa apenas **HTTP** (`fetch` nativo em Node 18+), sem `@supabase/supabase-js`/Realtime — assim funciona em **Node 20** sem instalar `ws`.

### Variáveis obrigatórias

| Variável | Onde obter |
|---|---|
| `SUPABASE_URL` | Dashboard Supabase → Project Settings → API → Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Dashboard Supabase → Project Settings → API → `service_role` secret |

### Execução

PowerShell (Windows):

```powershell
$env:SUPABASE_URL = "https://<projeto>.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY = "<service-role-key>"
node scripts/audit-rls.mjs
```

Bash:

```bash
export SUPABASE_URL=https://<projeto>.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
node scripts/audit-rls.mjs
```

O script imprime um relatório por tabela e retorna **exit code 0** se tudo está OK. Evidência arquivada: `docs/_audit/rls_audit_20260512-success.txt` (atualizar data ao rerodar).

> A `service_role` key **nunca** deve ser commitada nem injetada no frontend. Use só para scripts de auditoria/migração rodados localmente ou em CI privado.

---

## 3. Sentry — configurar DSN em produção

Frontend já inicia o Sentry em `main.tsx` → `initObservability()` (inclui `browserTracingIntegration()`). Lista de secrets e re-deploy das Edge Functions: **`docs/SENTRY_ATIVADO.md`**.

### Frontend (Lovable)

`VITE_SENTRY_DSN` no Lovable é **opcional**. O projeto já usa o mesmo DSN padrão embutido que o painel (`src/lib/observability.ts`). Defina apenas se quiser outro projeto Sentry ou chave específica:

1. Lovable → **Settings** → **Environment** → **Add variable**
2. Nome: `VITE_SENTRY_DSN` (opcional), `VITE_SENTRY_ENVIRONMENT`, `VITE_SENTRY_TRACES_SAMPLE_RATE`

Republish após mudar variáveis.

### Edge Functions

O DSN é lido a partir do secret `SENTRY_DSN` do projeto Supabase. No dashboard:

1. Supabase → **Project Settings** → **Edge Functions** → **Secrets** → **Add new secret**
2. Adicionar:
   - `SENTRY_DSN` (mesmo DSN do frontend ou um DSN separado para edge — recomendado separado)
   - `SENTRY_ENVIRONMENT` = `production`
   - `SENTRY_SAMPLE_RATE` = `1` (ou `0.5` para reduzir custo se o volume crescer)

3. Re-deploy das funções para captarem o secret:

```bash
supabase functions deploy --no-verify-jwt pagarme-webhook
supabase functions deploy --no-verify-jwt resend-webhook
supabase functions deploy ifood-integration
supabase functions deploy email-dispatch
supabase functions deploy send-contact-email
```

### Alertas recomendados (Sentry)

- **Rule**: "Issue is unresolved AND occurs > 10 times in 5 minutes" → Slack/E-mail
- **Performance**: alertar quando p95 de qualquer transação > 3s
- **Release health**: monitorar regressões a cada deploy do frontend

---

## 4. Cloudflare Turnstile (captcha do Contato)

O site key fica embutido em `src/lib/turnstile.ts` (constante `PUBFY_TURNSTILE_SITE_KEY`), seguindo o mesmo padrão da DSN pública do Sentry e da anon key do Supabase. Só o **secret key** precisa estar nos secrets do Supabase.

Configuração já feita:

- `src/lib/turnstile.ts` → `PUBFY_TURNSTILE_SITE_KEY = "0x4AAAAAADOIDZPsdtgjL24I"`
- Supabase → **Project Settings** → **Edge Functions** → **Secrets** → `TURNSTILE_SECRET_KEY` (já configurado).

Falta apenas garantir o re-deploy da Edge Function que valida:

```bash
supabase functions deploy send-contact-email
```

Se um dia for preciso trocar o site key (ex.: rotação de domínio ou novo projeto Cloudflare):

1. Atualizar a constante `PUBFY_TURNSTILE_SITE_KEY` em `src/lib/turnstile.ts` e republicar o frontend; ou
2. Em deploys self-hosted, definir `VITE_TURNSTILE_SITE_KEY` no ambiente — ele sobrescreve o hardcoded.

Sem `TURNSTILE_SECRET_KEY` definido nos secrets do Supabase, a Edge Function entra em modo "skip" (loga e libera) — comportamento intencional para preview/dev.

---

## 5. Rate-limit das RPCs públicas

A migration `20260518000000_public_rpc_rate_limit.sql` impõe:

| RPC | Limite | Janela |
|---|---|---|
| `validate_public_coupon` | 30 chamadas | 60s por IP |
| `get_public_order_tracking` | 120 chamadas | 60s por IP |
| `create_public_menu_order` | 10 pedidos | 60s por IP |

Os buckets ficam em `public.public_rate_limit_buckets` (RLS forçado, sem políticas — só funções `SECURITY DEFINER` acessam). Limpeza ocorre probabilisticamente (~1% das chamadas executam `_prune_rate_limit_buckets`).

Para inspecionar em incidentes:

```sql
-- top IPs em pico recente
SELECT bucket_key, window_start, hit_count
FROM public.public_rate_limit_buckets
WHERE window_start > now() - interval '15 minutes'
ORDER BY hit_count DESC
LIMIT 50;
```

Para liberar um IP travado:

```sql
DELETE FROM public.public_rate_limit_buckets
WHERE bucket_key LIKE 'menu_order_create|ip:<ip>%';
```

---

## 6. Deliverability — SPF, DKIM e DMARC (Resend)

Sem isso, e-mails transacionais e campanhas vão direto para spam.

1. Identifique o **domínio de envio** configurado no Resend (`Settings → Domains`).
2. Em cada provedor de DNS (Cloudflare, Registro.br, etc.), adicione exatamente os registros que o Resend exibe:

   - **TXT** `@` → `v=spf1 include:_spf.resend.com ~all`
   - **TXT** `resend._domainkey.<dominio>` → valor exato fornecido pelo Resend
   - **TXT** `_dmarc.<dominio>` → `v=DMARC1; p=quarantine; rua=mailto:dmarc@<dominio>; ruf=mailto:dmarc@<dominio>; fo=1`

3. Volte ao Resend → **Verify**. Status precisa ficar verde nos três.

4. Após verificado, envie um teste para o [https://www.mail-tester.com/](https://www.mail-tester.com/) e confirme score ≥ 9/10.

---

## 7. Uptime monitoring

Configure ao menos 4 monitores (BetterStack, UptimeRobot, Pingdom — qualquer um). Frequência: 1–3 min, alerta por e-mail/Slack/WhatsApp.

| Nome | URL | Critério de sucesso |
|---|---|---|
| Home | `https://pubfy.com.br/` | HTTP 200 |
| Login | `https://pubfy.com.br/login` | HTTP 200 |
| Menu público (restaurante seed) | `https://pubfy.com.br/menu/<id-seed>` | HTTP 200, contém texto do restaurante |
| Webhook Pagar.me (HEAD) | `https://<projeto>.supabase.co/functions/v1/pagarme-webhook` | HTTP 401 (rejeita sem assinatura — significa que está rodando) |

Crie também uma página de status simples (BetterStack Status Page ou Statuspage gratuito) — útil para clientes durante incidentes.

---

## 8. Rotação de secrets (preventiva)

Antes do go-live, gire/regere chaves potencialmente expostas em logs antigos:

- **Pagar.me**: gerar nova `api_key` e atualizar em `system_settings` (admin) e nos secrets de Edge Function se houver.
- **Resend**: gerar novo `RESEND_API_KEY` no Supabase Secrets.
- **Supabase**: se quiser zerar o histórico, é possível regerar a `anon` key (impacta clientes ativos — fazer em janela controlada). A `service_role` deve ser rotacionada se algum dump de log antigo a expôs.
- **SUPABASE_SERVICE_ROLE_KEY** local: trocar e nunca commitar.

---

## 9. Checklist final do Sprint 1

- [x] Migrações aplicadas em produção
- [x] `node scripts/audit-rls.mjs` rodou com exit 0 e saída arquivada
- [x] `VITE_SENTRY_DSN` configurado no Lovable (Configurado via código)
- [x] `SENTRY_DSN` configurado no Supabase Edge Functions
- [x] Re-deploy de todas as Edge Functions críticas
- [x] Pelo menos uma exceção forçada visível no Sentry (front + edge)
- [x] `TURNSTILE_SECRET_KEY` definido nos secrets do Supabase e `send-contact-email` re-deployada
- [x] Captcha visível em `/contato` e bloqueando submit sem token
- [ ] Rate limit testado (script que dispara 11 pedidos públicos seguidos retorna o 11º com erro 54000)
- [x] SPF/DKIM/DMARC verdes no Resend, mail-tester ≥ 9/10
- [ ] Monitores de uptime ativos com alerta entregue ao menos uma vez
- [ ] Secrets rotacionados
