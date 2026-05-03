# Atendimento WhatsApp: Evolution API + N8N

## Configuracao segura

O workflow deve ser generico por instancia. Evite chaves, URLs e nomes de instancia fixos dentro dos nodes.

Configure no ambiente do n8n:

- `SUPABASE_URL`: URL do projeto Supabase.
- `N8N_INTERNAL_API_KEY`: segredo compartilhado entre n8n e Edge Functions para autorizar chamadas internas.
- `OPENAI_API_KEY`: credencial do node OpenAI.
- `GROQ_API_KEY`: credencial do node Groq Chat Model quando usar o workflow Groq.
- `REDIS_*`: credenciais da memoria do agente.

Nao coloque `SUPABASE_SERVICE_ROLE_KEY` nem `EVOLUTION_API_KEY` no ambiente do n8n para este workflow. Elas devem ficar somente nos secrets das Edge Functions.

No Supabase Edge Function `evolution-api`, configure:

- `EVOLUTION_API_URL`
- `EVOLUTION_API_KEY`
- `N8N_WEBHOOK_URL`: URL publica do webhook de producao do N8N, por exemplo `https://n8n.seudominio.com/webhook/whatsapp`.
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `N8N_INTERNAL_API_KEY`
- `EVOLUTION_API_URL`
- `EVOLUTION_API_KEY`
- `GROQ_API_KEY`: usado pela Edge Function `whatsapp-n8n-groq-transcribe` para audio.

Importante: o JSON anexado contem chave da Evolution API em texto puro. Rotacione essa chave antes de usar em producao.

## Como diferenciar cada loja

A Evolution envia no webhook o nome da instancia em `body.instance`. Esse campo deve ser a chave de roteamento do workflow.

Fluxo recomendado:

1. Receber webhook da Evolution.
2. Ignorar eventos que nao sejam `messages.upsert` e mensagens `fromMe`.
3. Extrair:
   - `instanceName = body.instance`
   - `remoteJid = body.data.key.remoteJid`
   - `messageId = body.data.key.id`
   - `messageType = body.data.messageType`
   - `userMessage`
4. Buscar no Supabase:
   - `whatsapp_instances` por `instance_name = instanceName` e `is_active = true`
   - `automation_settings` por `instance_id`
   - `restaurants` por `restaurant_id`
   - produtos/categorias ativos quando `use_menu_knowledge = true`
   - ultimos pedidos do cliente pelo telefone quando o cliente perguntar sobre pedido
5. Criar/atualizar `conversation_threads`.
6. Inserir mensagem recebida em `conversation_messages`.
7. Se a conversa estiver `bot_active` e `ai_enabled = true`, chamar a IA.
8. Enviar a resposta pela Evolution e gravar a resposta como `sender_type = bot`.
9. Se detectar handoff, mudar a conversa para `waiting_human` e nao responder automaticamente.

No workflow atual, os passos 4, 5, 6 e parte do 9 ficam centralizados na Edge Function `whatsapp-n8n-context`. A gravacao da resposta enviada fica na Edge Function `whatsapp-n8n-persist-outgoing`. Isso evita chamadas HTTP dentro de Code nodes, que nao sao suportadas de forma confiavel no n8n 2.x.

As chamadas para Evolution API feitas pelo n8n passam pela Edge Function `whatsapp-n8n-evolution`. Assim o workflow nao precisa transportar `EVOLUTION_API_KEY` em headers ou no payload da execucao.

## Correcoes no workflow anexado

No node `Workflow Configuration`:

- Mantenha apenas variaveis nao sensiveis no payload, como `SUPABASE_URL` e `PUBLIC_SITE_URL`.
- Nao transporte `EVOLUTION_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY` ou `N8N_INTERNAL_API_KEY` dentro do JSON entre nodes.
- Mantenha `instanceName = {{ $json.body.instance }}`.

No node de memoria Redis:

- Use uma chave por loja e cliente:
  `{{ $('Workflow Configuration').item.json.instanceName + ':' + ($json.body?.data?.key?.remoteJid || 'unknown') }}`

No node de texto da mensagem:

- Use caminhos consistentes:
  `body.data.message.conversation`
  `body.data.message.extendedTextMessage.text`
  transcricao do audio quando `messageType = audioMessage`

No fluxo de audio:

- Remova nomes fixos como `whatsapp_instance`.
- Use a instancia do webhook:
  `{{ $('Workflow Configuration').item.json.instanceName }}`
- Use a chave da Evolution via credencial, nao no header fixo.

## Prompt base do agente

Use um system prompt montado dinamicamente com os dados da loja:

```text
Voce e o atendente virtual de {{ restaurant.name }}.
Responda em portugues brasileiro, com tom {{ automation_settings.ai_persona }}.
Use o nome do bot: {{ automation_settings.bot_name }}.

Regras:
- Responda apenas sobre esta loja e esta instancia.
- Use o cardapio recebido no contexto para informar produtos, precos, disponibilidade e adicionais.
- Quando o cliente quiser montar pedido, colete itens, quantidades, observacoes, forma de entrega/retirada, endereco e pagamento.
- Se faltar informacao essencial, pergunte objetivamente.
- Se o cliente pedir humano, reclamar, cancelar, falar de pagamento com problema, baixa confianca ou palavra-chave de handoff, responda a mensagem de fallback e sinalize handoff.
- Para pedidos ja feitos pelo menu delivery, use o contexto de ultimos pedidos para informar status e link de acompanhamento quando existir.
- Nunca invente produto, preco, prazo, status ou politica.
- Nao fale de outras lojas.
```

## Acoes esperadas da IA

O melhor formato e a IA devolver JSON estruturado para o N8N decidir:

```json
{
  "action": "reply | handoff | create_order_draft | order_status",
  "message": "texto para enviar ao cliente",
  "confidence": 0.92,
  "handoff_reason": null,
  "order_draft": null
}
```

Assim o N8N nao precisa interpretar texto livre para saber se envia mensagem, transfere para humano ou inicia gestao de pedido.
