# Plano de correcoes para producao

Data da auditoria: 2026-05-09  
Objetivo: organizar as dividas tecnicas, operacionais, comerciais e de UI/UX que precisam ser corrigidas antes de uma abertura ampla em producao.

## Como usar este documento

- Marque cada item com `[x]` quando estiver concluido.
- Use o campo "Evidencia" para registrar PR, migration, comando, print, usuario testado ou observacao.
- Ao iniciar um bloco, mantenha o escopo fechado ate terminar validacao minima.
- Antes de marcar um bloco como concluido, rode pelo menos:
  - `npm run typecheck`
  - `npm run preflight:prod`
  - `npx eslint .`
  - `npm run build`

Legenda de prioridade:

- `P0`: corrigir antes de producao comercial aberta.
- `P1`: corrigir antes de escalar para varios clientes reais.
- `P2`: melhoria profissional/comercial importante, mas nao bloqueia piloto controlado.

## Estado base validado

- [x] `npm run typecheck` passando apos as correcoes.
- [x] `npm run preflight:prod` passando apos as correcoes.
- [x] `npx eslint .` passando apos as correcoes.
- [x] `npm run build` passando apos as correcoes.
- [x] `npm audit --omit=dev` revisado apos atualizacoes de dependencias.
- [ ] Banco remoto revisado apos migrations criticas.
- [ ] Fluxos principais testados com usuario dono, funcionario e super admin.

Evidencia:

- 2026-05-09: `npm run typecheck`, `npm run preflight:prod`, `npx eslint .` e `npm run build` passaram.
- 2026-05-09: `npm audit --omit=dev --json` retornou 0 vulnerabilidades em dependencias de producao.

---

## Bloco 1 - Dependencias vulneraveis e pacote de exportacao

Prioridade: `P0`

Problema: a auditoria encontrou vulnerabilidades em dependencias de producao. O pacote `xlsx` tambem aparece como risco sem correcao simples disponivel e aumenta bastante o bundle de relatorios.

Arquivos/areas afetadas:

- `package.json`
- `package-lock.json`
- `src/hooks/useExportacaoDados.ts`
- Fluxo de exportacao CSV/PDF em Relatorios

Checklist:

- [x] Atualizar `react-router-dom`/`react-router` para versao segura compativel.
- [x] Atualizar dependencias com fix disponivel apontadas por `npm audit`.
- [x] Remover ou substituir `xlsx`.
- [x] Escolher alternativa para exportacao:
  - CSV simples server/client-side seguro, ou
  - `exceljs`, se for realmente necessario XLSX, ou
  - exportacao server-side/assinc em Edge Function.
- [x] Garantir sanitizacao contra formula injection em qualquer exportacao planilhavel.
- [x] Remover imports/codigo morto de exportacao antiga.
- [x] Rodar `npm audit --omit=dev` e registrar resultado.
- [ ] Validar exportacao de relatorio com dados reais.

Criterio de aceite:

- Build passa.
- Relatorio exporta sem erro.
- Nenhuma dependencia `high` conhecida permanece sem decisao documentada.
- `xlsx` nao fica no bundle de producao, salvo decisao explicita e justificada.

Evidencia:

- 2026-05-09: `npm audit fix --omit=dev` atualizou dependencias com correcao disponivel.
- 2026-05-09: Ranges diretos alinhados no `package.json`: `@supabase/supabase-js@^2.105.4`, `react-router-dom@^6.30.3` e `postcss@^8.5.14`.
- 2026-05-09: `xlsx` removido de `package.json` e `package-lock.json`; `npm ls xlsx --omit=dev` retornou arvore vazia.
- 2026-05-09: Exportacao XLSX substituida por CSV com BOM UTF-8, delimitador `;`, escaping de aspas/quebras de linha e sanitizacao contra formula injection.
- 2026-05-09: `npm audit --omit=dev --json` retornou 0 vulnerabilidades em producao.
- 2026-05-09: `npm run typecheck`, `npm run preflight:prod`, `npx eslint .` e `npm run build` passaram.
- Pendente: validar download CSV/PDF no navegador com usuario logado e dados reais.

---

## Bloco 2 - PDV e pedidos com operacoes transacionais

Prioridade: `P0`

Problema: o PDV cria pedido, itens, atualiza mesa e dispara notificacoes em etapas separadas no cliente. Alteracoes de status tambem atualizam pedido/mesa por etapas. Isso pode gerar inconsistencia em falhas parciais, concorrencia ou uso simultaneo em restaurante.

Arquivos/areas afetadas:

- `src/features/pdv/services/pedidoService.ts`
- `src/features/pdv/hooks/usePDVHook.tsx`
- `src/features/kitchen/kitchenService.ts`
- `src/pages/Pedidos.tsx`
- `src/pages/Cozinha.tsx`
- Tabelas `orders`, `order_items`, `mesas`, `delivery_orders`

Checklist:

- [x] Criar RPC ou Edge Function para criar pedido de PDV de forma atomica.
- [x] Recalcular total no servidor usando produtos do banco.
- [x] Validar disponibilidade de produtos no servidor.
- [x] Validar restaurante e permissao do usuario no servidor.
- [x] Inserir `orders` e `order_items` na mesma transacao.
- [x] Atualizar mesa na mesma transacao quando aplicavel.
- [x] Retornar pedido normalizado para o front.
- [x] Criar RPC para alterar status de pedido de forma atomica.
- [x] Sincronizar status de `delivery_orders` e mesa de forma consistente.
- [x] Bloquear transicoes invalidas ou documentar transicoes permitidas.
- [x] Revisar calculo de resumo do historico para considerar apenas status faturaveis.
- [x] Reduzir consultas duplicadas em `listarPedidos`.
- [x] Adicionar indices se necessario para historico por restaurante/data/status.

Criterio de aceite:

- Pedido de PDV nao fica parcialmente criado se item/mesa falhar.
- Total gravado nao depende do valor enviado pelo navegador.
- Cozinha e Pedidos refletem status corretamente.
- Mesa nao fica ocupada/liberada indevidamente em concorrencia basica.
- Fluxos mesa, balcao, cancelamento e finalizacao testados.

Evidencia:

- 2026-05-09: Criada migration `20260509120000_create_pos_order_transaction_rpcs.sql` com RPCs `create_pos_order(payload jsonb)` e `update_order_status(p_order_id uuid, p_status text)`.
- 2026-05-09: `create_pos_order` recalcula total no banco, valida restaurante, permissao `pdv_access`, produtos, disponibilidade, mesa ativa e grava pedido/itens/mesa na mesma transacao.
- 2026-05-09: `update_order_status` valida permissao `orders_manage`, bloqueia transicoes invalidas, atualiza mesa na mesma transacao e usa o trigger existente `sync_delivery_order_status_from_order` para sincronizar `delivery_orders`.
- 2026-05-09: RPCs aplicadas no banco remoto e confirmadas via `pg_proc`.
- 2026-05-09: `listarPedidos` deixou de buscar `order_items` duas vezes e o resumo financeiro passou a considerar apenas pedidos `finalizado`.
- 2026-05-09: Criados indices `idx_orders_restaurant_created_status` e `idx_orders_restaurant_table_status`.
- 2026-05-09: `npm run typecheck`, `npm run preflight:prod`, `npx eslint .` e `npm run build` passaram.
- Pendente: teste manual no navegador criando pedido mesa/balcao, cancelando/finalizando, validando mesa livre/ocupada, cozinha e historico.

---

## Bloco 3 - iFood: credenciais, RLS e configuracao segura

Prioridade: `P0`

Problema: a tela de iFood tenta ler/gravar diretamente na tabela `ifood_integration`, enquanto no banco remoto a politica atual permite acesso apenas a super admin. Alem disso, `client_secret` esta como `text` e nao deve ser exposto ao cliente.

Arquivos/areas afetadas:

- `src/pages/IfoodIntegracao.tsx`
- `src/services/ifood/config.ts`
- `src/services/ifood/api.ts`
- `supabase/functions/ifood-integration/index.ts`
- Tabela `ifood_integration`

Checklist:

- [x] Criar acoes na Edge Function `ifood-integration` para `get_config`, `save_config`, `toggle`, `update_polling`.
- [x] Remover leitura direta `select('*')` da tela.
- [x] Remover gravacao direta de `client_secret` pelo cliente.
- [x] Nao devolver `client_secret` para o frontend; retornar apenas `hasStoredCredentials`.
- [x] Avaliar criptografia/Vault para `client_secret`.
- [x] Ajustar RLS para impedir leitura direta de segredo por usuarios comuns.
- [x] Remover persistencia local desnecessaria em `localStorage` ou limitar a dados nao sensiveis.
- [x] Garantir que dono e funcionario com permissao de integracoes consigam configurar.
- [ ] Testar conexao iFood com usuario dono.
- [ ] Testar usuario sem permissao tentando acessar/configurar.

Criterio de aceite:

- Configuracao iFood funciona para dono autorizado.
- `client_secret` nao aparece em payload de resposta para navegador.
- Usuario sem permissao nao consegue ler/gravar configuracao.
- Poll/test continuam via Edge Function.

Evidencia:

- 2026-05-09: `IfoodIntegracao` deixou de ler/gravar `ifood_integration` diretamente e passou a usar `get_config`, `save_config`, `toggle` e `update_polling` via Edge Function.
- 2026-05-09: `client_secret` permanece somente no backend; respostas ao navegador retornam apenas `hasStoredCredentials` e demais dados nao sensiveis.
- 2026-05-09: Criada e aplicada a migration `20260509130000_harden_ifood_integration_access.sql`, mantendo acesso direto a `ifood_integration` apenas para super admin autenticado.
- 2026-05-09: `ifood-integration` foi adicionada ao `supabase/config.toml` com `verify_jwt = true` e ao `preflight:prod`.
- 2026-05-09: Edge Function `ifood-integration` redeployada no Supabase remoto.
- 2026-05-09: Decisao de seguranca registrada: segredo continua em coluna `text`, mas sem exposicao direta a usuarios comuns; Vault/criptografia em repouso fica como endurecimento futuro se o plano Supabase/operacao permitir.
- 2026-05-09: `npm run typecheck`, `npm run preflight:prod`, `npx eslint .` e `npm run build` passaram.
- Pendente: teste manual com credenciais reais iFood para validar conexao/poll e teste manual com usuario sem permissao.

---

## Bloco 4 - Assinaturas, trial e integridade de schema

Prioridade: `P0`

Problema: `subscriptions.plan_id` ainda esta como `text`, sem FK real para `plans.id`. Isso ja causou bugs de join/entitlement. Tambem existem restaurantes ativos sem assinatura viva no banco remoto.

Arquivos/areas afetadas:

- `src/hooks/useSubscriptionStatus.ts`
- `src/hooks/useMySubscriptions.ts`
- `src/pages/Assinaturas.tsx`
- `supabase/migrations/*subscriptions*`
- Tabelas `subscriptions`, `plans`, `restaurants`, `users`

Checklist:

- [ ] Criar migration para converter `subscriptions.plan_id` para `uuid`.
- [ ] Criar FK `subscriptions.plan_id -> plans.id`.
- [ ] Atualizar RPC `get_restaurant_subscription_entitlement` sem casts desnecessarios.
- [ ] Regenerar tipos Supabase.
- [ ] Revisar todos os pontos que tratam `plan_id` como string generica.
- [ ] Criar indice parcial para impedir multiplas assinaturas vivas por restaurante, se regra de negocio permitir.
- [ ] Reparar ou classificar os 2 restaurantes ativos sem assinatura viva.
- [ ] Criar check/rotina para restaurantes orfaos sem trial/assinatura.
- [ ] Testar cadastro novo dono com trial de 14 dias.
- [ ] Testar usuario trial expirado sendo bloqueado.
- [ ] Testar usuario ativo e `past_due` dentro/fora de graca.

Criterio de aceite:

- Trial aparece e libera acesso durante periodo correto.
- Pagina de assinaturas mostra plano/datas corretamente.
- Bloqueio redireciona apenas quando deve.
- Banco nao aceita assinatura com plano inexistente.

Evidencia:

-

---

## Bloco 5 - Testes automatizados e CI bloqueante

Prioridade: `P0`

Problema: o projeto tem CI de readiness, mas nao possui testes automatizados. Alem disso, lint no GitHub Actions esta como `continue-on-error: true`.

Arquivos/areas afetadas:

- `package.json`
- `.github/workflows/production-readiness.yml`
- Fluxos criticos: cadastro/trial, assinatura, PDV, cozinha, checkout, cupom, permissao

Checklist:

- [ ] Adicionar framework de testes unitarios/integracao, preferencialmente Vitest + Testing Library.
- [ ] Adicionar script `npm test`.
- [ ] Adicionar testes para helpers de relatorio, cupons e calculos.
- [ ] Adicionar testes para permissao/entitlement quando possivel.
- [ ] Adicionar Playwright ou suite E2E minima para fluxos criticos.
- [ ] Cobrir cadastro novo dono -> confirmacao -> trial -> acesso.
- [ ] Cobrir checkout publico com cupom e pedido.
- [ ] Cobrir PDV: criar pedido, alterar status, finalizar.
- [ ] Cobrir bloqueio de assinatura expirada.
- [ ] Remover `continue-on-error: true` do lint no CI.
- [ ] Adicionar etapa de `npm audit --omit=dev` no CI com politica definida.

Criterio de aceite:

- CI falha em lint/typecheck/build/test.
- Existe cobertura minima dos fluxos que podem derrubar operacao real.
- Novas correcoes futuras podem ser feitas com menor risco.

Evidencia:

-

---

## Bloco 6 - Relatorios e exportacao escalaveis

Prioridade: `P1`

Problema: relatorios buscam pedidos e itens completos para o navegador e agregam no front. Para restaurantes com volume, isso pode ficar lento, travar exportacao ou gerar timeouts.

Arquivos/areas afetadas:

- `src/hooks/useExportacaoDados.ts`
- `src/hooks/useRelatoriosAvancados.ts`
- `src/hooks/useAnalisePerformance.ts`
- `src/components/relatorios/*`
- Tabelas `orders`, `order_items`, `products`, `categories`

Checklist:

- [ ] Criar RPCs agregadas para resumo de vendas por periodo.
- [ ] Criar RPC para top produtos por periodo/status/canal.
- [ ] Criar RPC para evolucao diaria.
- [ ] Padronizar regra de faturamento: apenas `finalizado`, salvo decisao contraria.
- [ ] Adicionar limites claros para exportacao no navegador.
- [ ] Migrar exportacao pesada para Edge Function ou job assinc.
- [ ] Exibir mensagem de processamento quando periodo for grande.
- [ ] Revisar indices para `orders(restaurant_id, created_at, status, source, order_type)`.
- [ ] Remover componente tecnico `TestRelatorios` se nao for usado.

Criterio de aceite:

- Relatorio mensal de restaurante com volume abre sem travar.
- Exportacao grande nao congela a UI.
- Numeros de dashboard, relatorios e pedidos seguem a mesma regra.

Evidencia:

-

---

## Bloco 7 - Marketing: cupons, promocoes e campanhas

Prioridade: `P1`

Problema: cupons estao integrados ao checkout, mas estatisticas de desconto estao incompletas. Promocoes podem ser cadastradas, mas nao aparecem aplicadas no cardapio/checkout. Campanhas de e-mail enviam em loop sincrono.

Arquivos/areas afetadas:

- `src/hooks/useCoupons.ts`
- `src/components/menu-digital/CouponsManager.tsx`
- `src/hooks/usePromotions.ts`
- `src/components/menu-digital/PromotionsManager.tsx`
- `supabase/functions/email-dispatch/index.ts`
- Tabelas `coupons`, `coupon_usage`, `promotions`, `email_campaigns`, `email_send_logs`

Checklist:

- [ ] Corrigir estatisticas de cupons para somar `coupon_usage.discount_amount`.
- [ ] Validar maximo de usos e concorrencia de cupons no servidor.
- [ ] Decidir se `promotions` sera funcional ou escondido temporariamente.
- [ ] Se funcional, aplicar promocao no cardapio/checkout de forma server-side.
- [ ] Evitar conflito confuso entre promocao automatica e cupom.
- [ ] Criar visibilidade no menu publico para produto com promocao.
- [ ] Transformar envio de campanhas em fila/batches.
- [ ] Registrar campanha parcialmente enviada com detalhes.
- [ ] Validar opt-in, unsubscribe e limite mensal por plano.
- [ ] Melhorar metricas de campanha: enviados, entregues, falhas, descadastro.

Criterio de aceite:

- Cupom mostra estatisticas reais.
- Promocao cadastrada tem efeito real ou nao aparece como recurso ativo.
- Campanha grande nao depende de uma unica execucao longa.

Evidencia:

-

---

## Bloco 8 - UI/UX profissional e usabilidade diaria

Prioridade: `P1`

Problema: a base visual esta funcional, mas ainda ha pontos que deixam o produto com cara menos comercial: logs visiveis, loader informal, algumas telas densas em mobile e inconsistencias de acabamento.

Arquivos/areas afetadas:

- `src/App.tsx`
- `src/main.tsx`
- `src/pages/Login.tsx`
- `src/pages/Admin.tsx`
- `src/components/admin/AdminProtectedRoute.tsx`
- `src/pages/Pedidos.tsx`
- `src/components/dashboard/*`
- `src/index.css`

Checklist:

- [ ] Trocar loader inicial informal por loader da marca.
- [ ] Remover/gatear `console.log` de login/admin/Pagar.me em producao.
- [ ] Revisar textos com acentos e padrao de tom profissional.
- [ ] Melhorar tabela de Pedidos em mobile com `overflow-x-auto` ou layout responsivo.
- [ ] Revisar empty states de Produtos, Pedidos, Relatorios, Campanhas e iFood.
- [ ] Padronizar cards/alerts/badges para uma aparencia mais SaaS operacional.
- [ ] Verificar contraste e acessibilidade de botoes/badges.
- [ ] Validar PDV em tablet/notebook com tela cheia.
- [ ] Validar Cozinha em TV/monitor e notebook.
- [ ] Revisar pagina de Assinaturas para clareza de trial, plano ativo e atraso.

Criterio de aceite:

- Fluxos diarios parecem consistentes e comerciais.
- Nao ha logs ruidosos em producao.
- Telas principais funcionam bem em desktop, tablet e mobile.

Evidencia:

-

---

## Bloco 9 - Observabilidade, secrets e deploy

Prioridade: `P1`

Problema: observabilidade esta encaminhada, mas producao precisa de configuracao operacional real: DSNs, alertas, secrets, URLs de Auth, dominios, backups e rollback.

Arquivos/areas afetadas:

- `.env.example`
- `src/lib/observability.ts`
- `supabase/functions/_shared/observability.ts`
- `supabase/config.toml`
- Supabase Dashboard
- Vercel/hosting

Checklist:

- [ ] Configurar `VITE_SENTRY_DSN` real no frontend.
- [ ] Configurar `SENTRY_DSN` nas Edge Functions.
- [ ] Definir `SENTRY_ENVIRONMENT` e `SENTRY_RELEASE`.
- [ ] Validar que erros React e Edge chegam ao Sentry.
- [ ] Configurar alertas para Edge Function error rate.
- [ ] Revisar secrets obrigatorios: Pagar.me, Resend, Evolution, n8n, Groq/OpenAI, Supabase service role.
- [ ] Rotacionar secrets de teste antes da producao.
- [ ] Configurar Auth Site URL e Redirect URLs de producao no Supabase Dashboard.
- [ ] Configurar dominio publico e `PUBLIC_SITE_URL`.
- [ ] Validar webhooks Pagar.me e Resend com secrets.
- [ ] Definir rotina de backup e restore do banco.
- [ ] Criar runbook de rollback de deploy e migration.

Criterio de aceite:

- Erro real de teste aparece na ferramenta de observabilidade.
- Webhooks recusam payload sem assinatura/secret.
- Auth e e-mails usam URLs de producao.
- Existe caminho documentado de rollback.

Evidencia:

-

---

## Bloco 10 - Operacao assistida e go-live

Prioridade: `P2`

Problema: alem do codigo, producao comercial precisa de checklist operacional, dados de demonstracao, suporte, treinamento e processo de validacao em restaurante real.

Checklist:

- [ ] Criar ambiente de staging separado.
- [ ] Criar restaurante demo padronizado.
- [ ] Criar massa de dados realista: produtos, mesas, pedidos, cupons, campanhas.
- [ ] Criar roteiro de QA manual para dono.
- [ ] Criar roteiro de QA manual para funcionario/caixa.
- [ ] Criar roteiro de QA manual para cozinha.
- [ ] Criar roteiro de QA manual para cliente final no cardapio publico.
- [ ] Criar checklist de implantacao de novo restaurante.
- [ ] Criar documento de suporte: problemas comuns e solucoes.
- [ ] Definir rotina de monitoramento pos-go-live.
- [ ] Fazer piloto com 1 restaurante controlado.
- [ ] Registrar bugs do piloto e corrigir antes de vender para mais clientes.

Criterio de aceite:

- Um restaurante consegue operar um turno de teste completo.
- Suporte sabe orientar configuracao inicial e problemas comuns.
- Existe decisao clara de liberar ou segurar abertura comercial.

Evidencia:

-

---

## Ordem sugerida de execucao

1. Bloco 1 - Dependencias vulneraveis e pacote de exportacao.
2. Bloco 2 - PDV e pedidos com operacoes transacionais.
3. Bloco 3 - iFood: credenciais, RLS e configuracao segura.
4. Bloco 4 - Assinaturas, trial e integridade de schema.
5. Bloco 5 - Testes automatizados e CI bloqueante.
6. Bloco 6 - Relatorios e exportacao escalaveis.
7. Bloco 7 - Marketing: cupons, promocoes e campanhas.
8. Bloco 8 - UI/UX profissional e usabilidade diaria.
9. Bloco 9 - Observabilidade, secrets e deploy.
10. Bloco 10 - Operacao assistida e go-live.

## Registro de progresso

| Data | Bloco | Status | Observacao |
| --- | --- | --- | --- |
| 2026-05-09 | Auditoria inicial | Concluida | Base compila, mas ainda nao recomendada para producao comercial ampla. |
| 2026-05-09 | Bloco 1 | Implementado tecnicamente | Dependencias de producao sem vulnerabilidades conhecidas; `xlsx` removido; pendente teste manual de exportacao com dados reais. |
| 2026-05-09 | Bloco 2 | Implementado tecnicamente | PDV e status de pedidos migrados para RPCs transacionais; pendente teste manual completo em mesa/balcao/cozinha. |
| 2026-05-09 | Bloco 3 | Implementado tecnicamente | Configuracao iFood movida para Edge Function protegida; segredo nao retorna ao front; RLS endurecida; pendente teste manual com credenciais/permissoes. |
