# Variaveis do Atendimento WhatsApp

## N8N

Crie estas variaveis no ambiente do N8N antes de ativar o workflow:

```env
SUPABASE_URL=https://seu-projeto.supabase.co
PUBLIC_SITE_URL=https://seu-dominio.com
N8N_INTERNAL_API_KEY=gere-uma-chave-forte-para-n8n-chamar-o-supabase
N8N_BLOCK_ENV_ACCESS_IN_NODE=false
```

Em n8n self-hosted, se aparecer `access to env vars denied` ao usar `{{ $env.NOME_DA_VARIAVEL }}`, o n8n esta bloqueando variaveis de ambiente dentro dos nodes. Deixe `N8N_BLOCK_ENV_ACCESS_IN_NODE=false` no ambiente do servico que executa os workflows.

Exemplo com Docker Compose:

```yaml
services:
  n8n:
    env_file:
      - .env
    environment:
      - N8N_BLOCK_ENV_ACCESS_IN_NODE=false
      # mantenha aqui as outras variaveis antigas, se preferir
```

Se voce usa modo fila com `worker` ou servico separado de `webhook`, aplique o mesmo `env_file`/`environment` em todos os servicos n8n que executam workflows.

Depois de alterar `.env` ou `docker-compose.yml`, recrie o container para ele reler o ambiente:

```bash
docker compose up -d --force-recreate n8n
```

O n8n nao precisa carregar `SUPABASE_SERVICE_ROLE_KEY`, `EVOLUTION_API_URL` nem `EVOLUTION_API_KEY` para este workflow. Essas chaves devem ficar somente nos Supabase secrets das Edge Functions.

No workflow importado, configure tambem as credenciais dos nodes:

- OpenAI: node `OpenAI Chat Model` e node `Transcribe Audio`.
- Groq: node `Groq Chat Model` no workflow `docs/Evolution_Whatsapp_Generic_N8N_Groq.json`.
- Redis: node `Redis Chat Memory`.

## Supabase Edge Function

As Edge Functions do Atendimento WhatsApp precisam destes secrets:

```env
EVOLUTION_API_URL=https://sua-evolution-api.com
EVOLUTION_API_KEY=sua-chave-da-evolution
N8N_WEBHOOK_URL=https://seu-n8n.com/webhook/whatsapp
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=sua-anon-key
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key
N8N_INTERNAL_API_KEY=mesma-chave-configurada-no-env-do-n8n
GROQ_API_KEY=sua-chave-groq-para-transcricao-de-audio
```

Com Supabase CLI, o comando fica neste formato:

```bash
supabase secrets set EVOLUTION_API_URL="https://sua-evolution-api.com"
supabase secrets set EVOLUTION_API_KEY="sua-chave-da-evolution"
supabase secrets set N8N_WEBHOOK_URL="https://seu-n8n.com/webhook/whatsapp"
supabase secrets set SUPABASE_URL="https://seu-projeto.supabase.co"
supabase secrets set SUPABASE_ANON_KEY="sua-anon-key"
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="sua-service-role-key"
supabase secrets set N8N_INTERNAL_API_KEY="mesma-chave-configurada-no-env-do-n8n"
supabase secrets set GROQ_API_KEY="sua-chave-groq-para-transcricao-de-audio"
```

Depois disso, redeploy da function:

```bash
supabase functions deploy evolution-api
supabase functions deploy whatsapp-n8n-context
supabase functions deploy whatsapp-n8n-persist-outgoing
supabase functions deploy whatsapp-n8n-evolution --no-verify-jwt
supabase functions deploy whatsapp-n8n-groq-transcribe --no-verify-jwt
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

## N8N 2.x e Code nodes

O workflow nao deve fazer chamadas REST ao Supabase dentro de Code nodes. No n8n 2.x, Code node nao deve ser usado para HTTP request. Por isso o workflow usa HTTP Request nodes chamando:

- `SUPABASE_URL/functions/v1/whatsapp-n8n-context`
- `SUPABASE_URL/functions/v1/whatsapp-n8n-persist-outgoing`
- `SUPABASE_URL/functions/v1/whatsapp-n8n-evolution`

Essas Edge Functions centralizam leitura/escrita no Supabase e chamadas para Evolution API usando secrets internos. O n8n recebe somente o contexto necessario para IA e envio da resposta.

## Observacoes de seguranca

- Nao coloque `SUPABASE_SERVICE_ROLE_KEY` no frontend.
- Nao coloque `SUPABASE_SERVICE_ROLE_KEY` nem `EVOLUTION_API_KEY` no n8n para este fluxo.
- Nao deixe chaves reais dentro do JSON do workflow.
- Rotacione qualquer chave que tenha sido exportada em JSON, print ou conversa.
- Use a Production URL do webhook no Evolution, nao a Test URL do n8n.
