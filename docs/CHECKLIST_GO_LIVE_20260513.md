# Checklist de go-live — Pubfy

Data da auditoria: 2026-05-13  
Objetivo: registrar o estado atual da aplicação, pontos de atenção e checklist final antes de liberar o serviço em produção.

## Veredito

A aplicação está em bom estado técnico para um **piloto controlado em produção**, com operação assistida e monitoramento próximo.

Ainda não é recomendável liberar para **produção comercial ampla** antes de concluir o QA manual completo, validar secrets/webhooks reais, revisar logs com dados pessoais e executar um ciclo de piloto com restaurante real.

## Evidências verificadas

- [x] `npm run preflight:prod` passou.
- [x] `npm run typecheck` passou.
- [x] `npm run lint` passou.
- [x] `npm run test` passou com 27 testes em 4 arquivos.
- [x] `npm audit --omit=dev --audit-level=high` retornou 0 vulnerabilidades.
- [x] Build de produção em diretório limpo alternativo passou.
- [x] Playwright smoke E2E passou com 5/5 testes.
- [x] Migrations Supabase locais e remotas estão alinhadas.
- [x] Auditoria RLS documentada com tabelas críticas em `ENABLE` + `FORCE ROW LEVEL SECURITY`.
- [x] CI de readiness existe e valida preflight, typecheck, lint, testes, audit, build e E2E.

## Pontos de atenção

### 1. Artefato local `dist` travado

O comando `npm run build` padrão falhou localmente porque `dist/assets` ficou travado com 2 arquivos antigos:

- `chevron-down-DLPnG407.js`
- `PubfyWordmark-Bl41ecpQ.js`

O build em diretório limpo alternativo passou, então o problema parece ser de artefato local/permissão, não de compilação da aplicação.

Orientação:

- Garantir que o deploy rode em ambiente limpo.
- Antes de validar localmente, remover ou recriar `dist` quando o sistema permitir.
- Confirmar `npm run build` em CI/deploy limpo antes do go-live.

### 2. Migrations com timestamp futuro

Foram encontradas migrations aplicadas no remoto com datas posteriores a 2026-05-13:

- `20260514120000_seed_demo_restaurant_rpc.sql`
- `20260515090000_ensure_rls_on_core_tables.sql`
- `20260515091500_dashboard_metrics_rpc.sql`
- `20260515091700_orders_summary_rpc.sql`
- `20260515100000_hide_paid_public_payment_artifacts.sql`
- `20260515101000_public_plan_summaries_rpc.sql`
- `20260518000000_public_rpc_rate_limit.sql`
- `20260518000100_create_public_menu_order_rate_limit.sql`
- `20260519103000_force_rls_remaining_and_email_settings_policies.sql`

Isso não bloqueia tecnicamente a aplicação, mas pode confundir auditoria, histórico e rollback.

Orientação:

- Documentar explicitamente que essas migrations já foram aplicadas antes da data nominal do arquivo.
- Evitar criar novas migrations com timestamps futuros.
- Em rollback, priorizar a ordem real aplicada no Supabase, não apenas a interpretação humana da data.

### 3. Cobertura E2E ainda é pequena

O Playwright cobre apenas smoke público:

- aplicação monta o root;
- landing carrega;
- termos carrega;
- login mostra formulário;
- banner de cookies funciona.

Ainda faltam E2E dos fluxos que mais impactam operação real.

Orientação:

- Antes de escalar, adicionar E2E para cadastro/trial, checkout público, cupom, PDV, cozinha, assinatura e permissões.
- Enquanto esses E2E não existem, executar integralmente `docs/QA_ROTEIROS_MANUAIS.md`.

### 4. Logs com possível PII em Edge Functions

Algumas Edge Functions ainda registram dados pessoais ou operacionais em logs. Exemplo: `send-contact-email` registra nome, e-mail, assunto, destinatários e status de envio.

Orientação:

- Reduzir logs para IDs, contadores, status e contexto técnico.
- Evitar nome, e-mail, telefone, mensagem livre, endereço, payload bruto de webhook ou chaves.
- Manter detalhes sensíveis apenas no banco, sob RLS, quando necessário.

### 5. Bundle com chunks pesados

O build limpo passou, mas há chunks grandes:

- `recharts`: aproximadamente 523 kB.
- bundle principal `index`: aproximadamente 504 kB.
- `jspdf-core`: aproximadamente 417 kB.
- `html2canvas`: aproximadamente 201 kB.

Não bloqueia piloto, mas pode afetar carregamento em conexões móveis, especialmente para restaurante e cliente final.

Orientação:

- Manter `recharts`, `jspdf` e `html2canvas` carregados sob demanda.
- Evitar importar bibliotecas pesadas em telas iniciais.
- Medir Lighthouse/Web Vitals no domínio final.

### 6. Browserslist desatualizado

O build indicou `caniuse-lite` desatualizado há 6 meses.

Orientação:

- Atualizar a base Browserslist em uma janela controlada.
- Rodar novamente typecheck, lint, testes, build e E2E após atualização.

### 7. Validação real de integrações ainda é operacional

O código tem bons guardrails para Pagar.me, Resend, WhatsApp, iFood e Sentry, mas produção depende de secrets, dashboards externos e webhooks reais.

Orientação:

- Validar cada integração com credenciais finais.
- Nunca considerar o fluxo pronto apenas porque o build passou.
- Registrar evidências: IDs de webhook, ID de pedido, prints, logs e status no provedor.

## Checklist técnico antes do go-live

### Build, CI e dependências

- [ ] Resolver ou limpar a pasta local `dist` travada.
- [ ] Confirmar `npm run build` padrão em ambiente limpo.
- [ ] Confirmar pipeline CI verde na branch que será publicada.
- [ ] Rodar `npm run preflight:prod`.
- [ ] Rodar `npm run typecheck`.
- [ ] Rodar `npm run lint`.
- [ ] Rodar `npm run test`.
- [ ] Rodar `npm audit --omit=dev --audit-level=high`.
- [ ] Rodar Playwright smoke no bundle final.
- [ ] Atualizar Browserslist/caniuse-lite ou registrar decisão de adiar.

### Supabase e banco

- [ ] Confirmar migrations locais/remotas alinhadas via `npx supabase migration list`.
- [ ] Confirmar RLS audit remoto verde via `node scripts/audit-rls.mjs`.
- [ ] Confirmar Auth Site URL no domínio final.
- [ ] Confirmar Redirect URLs do Supabase para produção e staging.
- [ ] Confirmar backups/PITR ativos no Supabase.
- [ ] Fazer snapshot manual antes de migration arriscada.
- [ ] Validar RPCs críticas: pedido público, PDV, métricas, assinatura e tracking.

### Secrets e segurança

- [ ] Rotacionar `SUPABASE_SERVICE_ROLE_KEY` antes do go-live.
- [ ] Configurar `PUBLIC_SITE_URL` e `SITE_URL` com domínio final.
- [ ] Configurar `OWNER_SIGNUP_CLEANUP_SECRET` com valor aleatório forte.
- [ ] Configurar `SENTRY_DSN`, `SENTRY_ENVIRONMENT` e `SENTRY_RELEASE` nas Edge Functions.
- [ ] Configurar `VITE_SENTRY_DSN`, `VITE_SENTRY_ENVIRONMENT` e `VITE_SENTRY_RELEASE` no frontend, se aplicável.
- [ ] Revisar logs de Edge Functions para remover PII.
- [ ] Confirmar que service role não aparece no frontend, n8n ou logs.

### Pagar.me

- [ ] Usar `PAGARME_SECRET_KEY` live.
- [ ] Configurar `PAGARME_WEBHOOK_SECRET`.
- [ ] Configurar `PAGARME_PLATFORM_RECIPIENT_ID`.
- [ ] Cadastrar webhook no painel Pagar.me.
- [ ] Testar payload sem assinatura e confirmar rejeição.
- [ ] Testar assinatura/plano pago real de baixo valor.
- [ ] Testar Pix/cartão no pedido público, quando aplicável.
- [ ] Testar reembolso/cancelamento em cenário controlado.

### Resend/e-mail

- [ ] Configurar `RESEND_API_KEY` de produção.
- [ ] Configurar `RESEND_WEBHOOK_SECRET`.
- [ ] Validar SPF/DKIM do domínio remetente.
- [ ] Testar envio de contato/demonstração.
- [ ] Testar e-mail transacional de pedido.
- [ ] Testar unsubscribe.
- [ ] Conferir bounce/complaint no painel Resend.

### WhatsApp, Evolution, n8n e IA

- [ ] Configurar `EVOLUTION_API_URL`.
- [ ] Configurar `EVOLUTION_API_KEY`.
- [ ] Configurar `N8N_WEBHOOK_URL`.
- [ ] Configurar `N8N_INTERNAL_API_KEY` forte e igual no n8n/Supabase.
- [ ] Configurar `GROQ_API_KEY` ou `OPENAI_API_KEY`, conforme fluxo ativo.
- [ ] Conectar uma instância real.
- [ ] Enviar pedido público e confirmar mensagem recebida pelo restaurante.
- [ ] Validar fallback quando WhatsApp falha sem bloquear pedido.

### Observabilidade

- [ ] Disparar erro controlado no frontend/staging e confirmar Sentry.
- [ ] Disparar erro controlado em Edge Function/staging e confirmar Sentry.
- [ ] Configurar alertas para erro de Edge Function.
- [ ] Configurar rotina de checagem Pagar.me webhooks.
- [ ] Configurar rotina de checagem Resend bounces/complaints.
- [ ] Definir canal interno para incidentes P0/P1.

## Checklist funcional por persona

### Dono do restaurante

- [ ] Cadastro em `/cadastro` com e-mail real.
- [ ] Confirmação de e-mail abre no domínio final.
- [ ] Restaurante e trial são criados automaticamente.
- [ ] Login redireciona para `/dashboard`.
- [ ] Configurações de estabelecimento salvam nome, endereço, telefone, horários e logo.
- [ ] Cardápio Digital permite tema, cor, banner e pré-visualização.
- [ ] Categorias podem ser criadas, editadas e excluídas.
- [ ] Produtos podem ser criados com foto, descrição, preço e disponibilidade.
- [ ] Promoções aparecem corretamente no cardápio público.
- [ ] Cupons aplicam desconto no checkout público.
- [ ] Campanhas de e-mail registram progresso e métricas.
- [ ] Assinaturas mostram trial, plano ativo e atraso corretamente.
- [ ] Relatórios batem com pedidos finalizados.
- [ ] Exportação CSV/PDF abre corretamente.

### Funcionário/caixa

- [ ] Login de funcionário mostra apenas áreas permitidas.
- [ ] Usuário sem permissão não vê valores financeiros restritos.
- [ ] PDV cria pedido de mesa.
- [ ] PDV cria pedido de balcão.
- [ ] Cupom no PDV funciona conforme regra definida.
- [ ] Cancelamento libera mesa.
- [ ] Finalização move pedido para histórico correto.
- [ ] Impressão/comprovante mostra itens, mesa, cliente e total.
- [ ] Busca de pedidos por número/nome responde em tempo aceitável.

### Cozinha

- [ ] Tela `/cozinha` funciona em notebook/tablet.
- [ ] Tela `/cozinha` funciona em monitor/TV 1080p.
- [ ] Pedido novo aparece sem recarregar a página.
- [ ] Notificação sonora dispara.
- [ ] Status muda de pendente para em preparo.
- [ ] Status muda de em preparo para pronto.
- [ ] Observações do cliente aparecem destacadas.
- [ ] Pedidos iFood aparecem com identificação correta, se integração ativa.

### Cliente final

- [ ] Cardápio público abre no celular em menos de 3 segundos no domínio final.
- [ ] Tema, logo, banner e cores do restaurante aparecem corretamente.
- [ ] Categorias seguem a ordem configurada.
- [ ] Produto indisponível não aparece.
- [ ] Produto promocional mostra badge/preço correto.
- [ ] Carrinho recalcula quantidade e total.
- [ ] Cupom válido aplica desconto.
- [ ] Cupom inválido mostra mensagem clara.
- [ ] Checkout valida nome, telefone e endereço.
- [ ] Pedido com pagamento na entrega é criado.
- [ ] Pedido com pagamento online segue fluxo Pagar.me.
- [ ] Link de acompanhamento abre status correto.
- [ ] Mensagens de erro são claras e não técnicas.

## Checklist UI/UX e usabilidade

- [ ] Revisar contraste de botões, badges e alertas em telas principais.
- [ ] Validar mobile real para cardápio público, checkout, login e pedidos.
- [ ] Validar tablet/notebook para PDV.
- [ ] Validar monitor/TV para cozinha.
- [ ] Validar estados vazios em Produtos, Pedidos, Relatórios, Campanhas e iFood.
- [ ] Revisar textos com acentos, tom profissional e consistência.
- [ ] Garantir que tabelas densas tenham scroll ou layout responsivo.
- [ ] Garantir que botões críticos tenham feedback de loading/erro.
- [ ] Validar navegação por teclado nos fluxos públicos.
- [ ] Validar que erros de formulário ficam próximos aos campos.

## Critério de liberação

### Liberar piloto controlado

Pode liberar piloto quando:

- todos os checks técnicos essenciais estiverem verdes;
- Pagar.me, Resend e WhatsApp estiverem validados com secrets finais ou explicitamente desativados;
- QA manual de dono e cliente final estiver verde;
- QA de funcionário e cozinha estiver verde em pelo menos um dispositivo operacional;
- houver responsável monitorando as primeiras 48 horas.

### Liberar produção comercial ampla

Só liberar venda ampla quando:

- piloto com 1 restaurante real completar ao menos um turno sem bug crítico;
- bugs severidade alta do piloto estiverem corrigidos;
- logs sensíveis estiverem sanitizados;
- alertas de observabilidade estiverem ativos;
- rotinas de backup, rollback e suporte estiverem praticadas;
- E2E dos fluxos críticos tiverem sido adicionados ou compensados por roteiro manual formal assinado pela operação.

## Ordem recomendada

1. Resolver artefato `dist` e confirmar build limpo.
2. Validar secrets e URLs finais.
3. Validar Pagar.me, Resend e WhatsApp em produção controlada.
4. Executar `docs/QA_ROTEIROS_MANUAIS.md`.
5. Fazer piloto assistido com 1 restaurante.
6. Corrigir bugs do piloto.
7. Ativar alertas e rotina de monitoramento.
8. Liberar produção comercial ampla.

