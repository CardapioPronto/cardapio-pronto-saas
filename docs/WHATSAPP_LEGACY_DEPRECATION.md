# WhatsApp: legado vs operacional (piloto e remoção segura)

Este documento separa o que **não pode quebrar** no restaurante piloto do que é **legado UltraMsg** e pode ser removido em fases, sem afetar Atendimento (Evolution + n8n) nem notificações de delivery.

## Módulo operacional (manter)

| Área | Caminho / função | Uso |
|------|------------------|-----|
| Atendimento (UI) | `/atendimento`, `src/pages/Atendimento.tsx`, `src/components/atendimento/*` | Instâncias, conversas, automação, métricas |
| Instâncias | `whatsapp_instances`, `instancesService`, `evolution-api` | QR, conexão, envio pelo Evolution |
| n8n | `whatsapp-n8n-context`, `whatsapp-n8n-evolution`, `whatsapp-n8n-groq-transcribe`, `whatsapp-n8n-persist-outgoing` | Fluxo de atendimento automático |
| Delivery (cardápio + loja) | `send-delivery-whatsapp`, `deliveryOrderService` (`event: created`) | Pedido novo → WhatsApp da **loja** |
| Admin | `/admin/whatsapp`, `AdminWhatsApp.tsx` | Checklist super admin |
| IA (prompt legado na tabela) | `generate-ai-response` lê `whatsapp_integration.ai_system_prompt` | Ainda em uso; migrar antes de dropar a tabela |

**Deploy obrigatório no piloto:** `evolution-api`, `send-delivery-whatsapp`, funções `whatsapp-n8n-*`, secrets `EVOLUTION_API_URL` / `EVOLUTION_API_KEY`.

## Legado (descartar com cuidado)

| Área | Caminho | Situação atual |
|------|---------|----------------|
| UltraMsg UI | ~~`src/components/whatsapp/*`~~ | **Removido na Fase 1** |
| Envio direto UltraMsg | ~~`messageService`~~ | **Removido na Fase 1** |
| Confirmação PDV via legado | ~~`pedidoService.sendOrderConfirmation`~~ | **Removido na Fase 1** |
| Histórico legado | tabela `whatsapp_messages` | UI removida; tabela permanece |
| Templates legado | tabela `whatsapp_message_templates` | UI removida; tabela permanece |
| Credenciais | `whatsapp_integration.ultramsg_*`, `provider: ultramsg` | Colunas no banco; não usar em produção nova |

**Não remover na Fase 1:** tabela `whatsapp_integration` inteira — `generate-ai-response` ainda usa `ai_system_prompt`.

## O que validar no restaurante piloto

Checklist alinhado ao que está na branch `cursor/audit-fixes-50a9` (após deploy):

1. **Atendimento:** conectar instância em `/atendimento` → Instâncias; receber/responder conversa; automação (horário, handoff).
2. **Delivery — pedido novo:** cardápio público delivery → loja recebe WhatsApp (`send-delivery-whatsapp`, `created`).
3. **Delivery — mudança de status:** edge suporta `status_changed`, mas o PDV **ainda não chama** a função em `alterarStatusPedido` — se o piloto esperar aviso ao cliente ao mudar preparo/pronto, registrar como gap ou implementar na branch.
4. **PDV balcão:** finalizar pedido com telefone — **não dispara** WhatsApp (Fase 1; delivery usa `send-delivery-whatsapp` no cardápio).
5. **iFood + Pagar.me:** fora do escopo WhatsApp, mas no mesmo deploy do piloto.

Ao achar bug: anotar **fluxo** (atendimento / delivery criado / status PDV / iFood), **restaurant_id**, horário e se a instância Evolution está `connected`.

## Fases de remoção (sem regressão)

### Fase 0 — Agora (piloto)

- Não deletar edge functions nem migrations de `whatsapp_instances`.
- Não dropar `whatsapp_integration` nem `whatsapp_messages`.
- Opcional: esconder qualquer link antigo para UltraMsg (já não há rota para `WhatsAppConfigTab`).

### Fase 1 — Código morto ✅

- Removidos: `src/components/whatsapp/*`, hooks `useWhatsAppIntegration` / `useWhatsAppTemplates`, services legado em `src/services/whatsapp/` (exceto `evolutionService.ts`), `src/types/whatsappTemplate.ts`.
- Removida chamada em `pedidoService` a `sendOrderConfirmation`.
- `.env.example` atualizado (sem variáveis UltraMsg).

### Fase 2 — Dados ✅ (branch `cursor/whatsapp-phase2-50a9`)

- Migration `20260524120000_whatsapp_integration_phase2.sql` copia `ai_system_prompt` → `automation_settings.ai_persona`.
- `generate-ai-response` lê `automation_settings` (instância ativa); `whatsapp_integration` só fallback.
- Colunas legadas marcadas com `COMMENT` (sem DROP).

- ~~Migrar `ai_system_prompt` (e demais campos ainda úteis) para tabela de automação por instância (`whatsapp_automation_settings` ou equivalente já usada em Atendimento).
- Deprecar colunas `ultramsg_*`, `twilio_*`, `provider` em migration com comentário; não dropar até `generate-ai-response` e n8n não lerem mais `whatsapp_integration`.

### Fase 3 — Limpeza DB

- Dropar colunas/tabela legado só com auditoria de produção (restaurantes ainda com linhas UltraMsg).

## Matriz “quem chama o quê”

```
Cardápio delivery (create)
  → deliveryOrderService
  → send-delivery-whatsapp (created) → whatsapp_instances → Evolution

PDV alterar status
  → alterarStatusPedido (RPC apenas)
  → [gap] send-delivery-whatsapp (status_changed) não ligado

PDV finalizar pedido (telefone)
  → (sem notificação WhatsApp — delivery no cardápio ou atendimento manual)

Atendimento conversa
  → conversationsService / instancesService
  → evolution-api (+ n8n webhooks)

Automação IA (painel antigo)
  → generate-ai-response → whatsapp_integration.ai_system_prompt
```

## Referências

- `docs/ATENDIMENTO_WHATSAPP_ENV.md`
- `docs/ATENDIMENTO_WHATSAPP_N8N.md`
- `scripts/production-preflight.mjs` (lista de functions a publicar)
