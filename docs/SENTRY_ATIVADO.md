# Sentry ligado na Pubfy — checklist rápido

## Frontend (Lovable / Vite)

O Sentry inicializa **assim que o bundle carrega** em `main.tsx` via `initObservability()` em `src/lib/observability.ts`:

- **DSN** embutido (mesmo critério do Supabase público): override opcional por `VITE_SENTRY_DSN`.
- **Performance**: `browserTracingIntegration()` está ativo (`tracesSampleRate` ~0,15 ou `VITE_SENTRY_TRACES_SAMPLE_RATE`).
- **Erros**: `captureException()` usado pelo `createLogger(...).capture`, React Query (`onError`), `ErrorBoundary` e código que já chamava observabilidade.
- **Usuário**: `setObservabilityUser()` já é atualizado em `useUserSession` quando há sessão.

Para validar no browser (produção ou preview):

1. Abra o app, confira no **Network** pedidos para `ingest.*.sentry.io` ao navegar.
2. Force um erro de teste em dev (ex.: `throw new Error("sentry-smoke")` temporário) ou use a consola: após build, confira o evento no painel Sentry.

## Edge Functions (Supabase)

O envio usa `captureEdgeException` em `supabase/functions/_shared/observability.ts`, que lê o secret:

| Secret | Valor |
|--------|--------|
| `SENTRY_DSN` | Mesmo DSN do frontend (é seguro colar no painel da Supabase como secret). |
| `SENTRY_ENVIRONMENT` (opcional) | `production` |
| `SENTRY_SAMPLE_RATE` (opcional) | `1` ou `0.5` para reduzir volume |

Exemplo de DSN (já presente no código do frontend):

`https://0a4145edff0c18f81723f0feca265622@o4511357542203392.ingest.us.sentry.io/4511357548822528`

Após criar/alterar secrets, **re-deploy** das funções que vocês usam em produção, por exemplo:

```bash
npx supabase functions deploy send-contact-email
npx supabase functions deploy pagarme-webhook
npx supabase functions deploy resend-webhook
npx supabase functions deploy ifood-integration
npx supabase functions deploy email-dispatch
```

## Evidência RLS

Relatório de auditoria RLS com exit 0: `docs/_audit/rls_audit_20260512-success.txt`.
