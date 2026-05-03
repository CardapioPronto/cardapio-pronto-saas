# Variaveis do Atendimento WhatsApp

## N8N

Crie estas variaveis no ambiente do N8N antes de ativar o workflow:

```env
EVOLUTION_API_URL=https://sua-evolution-api.com
EVOLUTION_API_KEY=sua-chave-da-evolution
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key
PUBLIC_SITE_URL=https://seu-dominio.com
```

No workflow importado, configure tambem as credenciais dos nodes:

- OpenAI: node `OpenAI Chat Model` e node `Transcribe Audio`.
- Redis: node `Redis Chat Memory`.

## Supabase Edge Function

A Edge Function `evolution-api` precisa destes secrets:

```env
EVOLUTION_API_URL=https://sua-evolution-api.com
EVOLUTION_API_KEY=sua-chave-da-evolution
N8N_WEBHOOK_URL=https://seu-n8n.com/webhook/whatsapp
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=sua-anon-key
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key
```

Com Supabase CLI, o comando fica neste formato:

```bash
supabase secrets set EVOLUTION_API_URL="https://sua-evolution-api.com"
supabase secrets set EVOLUTION_API_KEY="sua-chave-da-evolution"
supabase secrets set N8N_WEBHOOK_URL="https://seu-n8n.com/webhook/whatsapp"
supabase secrets set SUPABASE_URL="https://seu-projeto.supabase.co"
supabase secrets set SUPABASE_ANON_KEY="sua-anon-key"
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="sua-service-role-key"
```

Depois disso, redeploy da function:

```bash
supabase functions deploy evolution-api
```

## Ordem recomendada

1. Importe `docs/Evolution_Whatsapp_Generic_N8N.json` no n8n.
2. Configure as variaveis do ambiente do n8n.
3. Configure as credenciais OpenAI e Redis nos nodes.
4. Ative o workflow e copie a Production URL do webhook `/webhook/whatsapp`.
5. Configure `N8N_WEBHOOK_URL` na Edge Function com essa URL.
6. Rode/redeploy `evolution-api`.
7. No sistema, abra Atendimento WhatsApp > Instancias.
8. Clique no botao de webhook em cada instancia para reaplicar o webhook.
9. Conecte a instancia por QR Code.
10. Envie uma mensagem de teste de outro WhatsApp.

## Observacoes de seguranca

- Nao coloque `SUPABASE_SERVICE_ROLE_KEY` no frontend.
- Nao deixe chaves reais dentro do JSON do workflow.
- Rotacione qualquer chave que tenha sido exportada em JSON, print ou conversa.
- Use a Production URL do webhook no Evolution, nao a Test URL do n8n.
