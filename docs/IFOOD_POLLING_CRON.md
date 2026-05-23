# iFood — polling automático (server-side)

## O que roda

| Componente | Função |
|------------|--------|
| `ifood-poll-cron` | Edge Function chamada pelo cron; faz poll de todos os restaurantes elegíveis |
| `ifood-integration` (`action: poll`) | Poll manual pela tela (JWT do usuário) |
| `_shared/ifood-poll-core.ts` | Lógica compartilhada de consulta/ACK/importação |

Restaurante entra no poll automático quando:

- `ifood_integration.is_enabled = true`
- `ifood_integration.polling_enabled = true`
- credenciais (`client_id`, `client_secret`, `merchant_id`) preenchidas

O intervalo da UI (`polling_interval`, 30–300 s) é respeitado via `last_polled_at`.

## Secrets (Supabase Edge)

Configure **o mesmo valor** em:

1. **Edge secret:** `CRON_SECRET` (ou `IFOOD_POLL_CRON_SECRET`)
2. **Vault** (para o `pg_cron` enviar o header): `cron_secret`

```bash
npx supabase secrets set CRON_SECRET="seu-secret-longo-aleatorio"
```

No SQL Editor (Vault), se ainda não existir:

```sql
SELECT vault.create_secret('seu-secret-longo-aleatorio', 'cron_secret');
```

## Deploy

```bash
npx supabase login
npx supabase link --project-ref jyrfjvyeikhqpuwcvdff

npx supabase functions deploy ifood-poll-cron
npx supabase functions deploy ifood-integration
```

Aplique a migration `20260523190000_ifood_poll_cron_foundation.sql` (colunas + job `* * * * *`).

## Teste manual

```bash
curl -i -X POST "https://jyrfjvyeikhqpuwcvdff.supabase.co/functions/v1/ifood-poll-cron" \
  -H "Content-Type: application/json" \
  -H "x-cron-secret: SEU_CRON_SECRET"
```

Resposta esperada: JSON com `restaurants_eligible`, `polled`, `skipped_interval`, `results`.

## Verificar no banco

```sql
SELECT restaurant_id, is_enabled, polling_enabled, polling_interval,
       last_polled_at, last_poll_error
FROM ifood_integration
ORDER BY last_polled_at DESC NULLS LAST;
```

```sql
SELECT jobname, schedule, active FROM cron.job WHERE jobname = 'ifood-poll-cron-every-minute';
```

## Desativar temporariamente

```sql
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'ifood-poll-cron-every-minute';
```

Ou desligue `polling_enabled` na tela de integração do restaurante.
