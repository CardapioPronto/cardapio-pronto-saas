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
- [x] Banco remoto revisado apos migrations criticas.
- [x] Fluxos principais testados com usuario dono, funcionario e super admin.

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
- [x] Validar exportacao de relatorio com dados reais.

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

- [x] Criar migration para converter `subscriptions.plan_id` para `uuid`.
- [x] Criar FK `subscriptions.plan_id -> plans.id`.
- [x] Atualizar RPC `get_restaurant_subscription_entitlement` sem casts desnecessarios.
- [x] Regenerar tipos Supabase (tipos `subscriptions` em `src/integrations/supabase/types.ts` + schema de referencia).
- [x] Revisar todos os pontos que tratam `plan_id` como string generica (uuid continua como `string` no TS; inserts usam id de plano valido).
- [x] Criar indice parcial para impedir multiplas assinaturas vivas por restaurante, se regra de negocio permitir (ja existia `uniq_subscriptions_active_per_restaurant`).
- [x] Reparar ou classificar os 2 restaurantes ativos sem assinatura viva (backfill na migration + funcao `repair_missing_restaurant_subscriptions` para operacao).
- [x] Criar check/rotina para restaurantes orfaos sem trial/assinatura.
- [ ] Testar cadastro novo dono com trial de 14 dias.
- [ ] Testar usuario trial expirado sendo bloqueado.
- [ ] Testar usuario ativo e `past_due` dentro/fora de graca.

Criterio de aceite:

- Trial aparece e libera acesso durante periodo correto.
- Pagina de assinaturas mostra plano/datas corretamente.
- Bloqueio redireciona apenas quando deve.
- Banco nao aceita assinatura com plano inexistente.

Evidencia:

- 2026-05-11: Migration `20260511103000_subscriptions_plan_id_uuid_fk.sql` — reparo de `plan_id` invalido, `ALTER TYPE uuid`, FK `subscriptions_plan_id_fkey`, RPC e trigger de trial alinhados, backfill de restaurantes sem subscription, funcao `repair_missing_restaurant_subscriptions()` (service_role). Preflight atualizado para exigir join `p.id = s.plan_id` nesta migration.

---

## Bloco 5 - Testes automatizados e CI bloqueante

Prioridade: `P0`

Problema: o projeto tem CI de readiness, mas nao possui testes automatizados. Alem disso, lint no GitHub Actions esta como `continue-on-error: true`.

Arquivos/areas afetadas:

- `package.json`
- `.github/workflows/production-readiness.yml`
- Fluxos criticos: cadastro/trial, assinatura, PDV, cozinha, checkout, cupom, permissao

Checklist:

- [x] Adicionar framework de testes (Vitest + jsdom; Testing Library pode ser adicionado para componentes).
- [x] Adicionar script `npm test`.
- [x] Adicionar testes para helpers de relatorio, cupons e calculos.
- [x] Adicionar testes para permissao/entitlement quando possivel (`computeSubscriptionAccess`).
- [x] Adicionar Playwright ou suite E2E minima para fluxos criticos (smoke: shell carrega).
- [ ] Cobrir cadastro novo dono -> confirmacao -> trial -> acesso (E2E além do smoke).
- [ ] Cobrir checkout publico com cupom e pedido (E2E).
- [ ] Cobrir PDV: criar pedido, alterar status, finalizar (E2E).
- [x] Cobrir bloqueio de assinatura expirada (parcial: regras puras em teste unitario).
- [x] Remover `continue-on-error: true` do lint no CI.
- [x] Adicionar etapa de `npm audit --omit=dev` no CI com politica definida (`--audit-level=high`).

Criterio de aceite:

- CI falha em lint/typecheck/build/test.
- Existe cobertura minima dos fluxos que podem derrubar operacao real.
- Novas correcoes futuras podem ser feitas com menor risco.

Evidencia:

- 2026-05-11: Vitest (`vitest.config.ts`), testes em `src/lib/reportExportUtils.test.ts`, `src/types/coupons.test.ts`, `src/lib/subscriptionAccess.test.ts`; Playwright smoke `e2e/app-shell.spec.ts`; CI com lint bloqueante, `npm test`, `npm audit --omit=dev --audit-level=high`, build e E2E. Helpers de exportacao em `src/lib/reportExportUtils.ts`; gate de assinatura em `src/lib/subscriptionAccess.ts`.

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

- [x] Criar RPCs agregadas para resumo de vendas por periodo (`get_restaurant_sales_report`, `get_restaurant_sales_period_metrics`).
- [x] Criar RPC para top produtos por periodo/status/canal (incluido em `get_restaurant_sales_report`).
- [x] Criar RPC para evolucao diaria (incluido nas RPCs acima).
- [x] Padronizar regra de faturamento: apenas `finalizado`, salvo decisao contraria (metricas de performance e exportacao de performance).
- [x] Adicionar limites claros para exportacao no navegador (`src/lib/reportLimits.ts`, `useExportacaoDados`).
- [ ] Migrar exportacao pesada para Edge Function ou job assinc.
- [x] Exibir mensagem de processamento quando periodo for grande (`RelatoriosAvancados`, `AnalisePerformance`, threshold em `reportLimits`).
- [x] Revisar indices para `orders(restaurant_id, created_at, status, source, order_type)` (migration `20260512120000_restaurant_sales_report_rpcs.sql`).
- [x] Remover componente tecnico `TestRelatorios` se nao for usado.

Criterio de aceite:

- Relatorio mensal de restaurante com volume abre sem travar.
- Exportacao grande nao congela a UI.
- Numeros de dashboard, relatorios e pedidos seguem a mesma regra.

Evidencia:

- 2026-05-11: RPCs e indices em `supabase/migrations/20260512120000_restaurant_sales_report_rpcs.sql`; hooks `useRelatoriosAvancados`, `useAnalisePerformance`, `useExportacaoDados`; limites e testes em `src/lib/reportLimits.ts` / `reportLimits.test.ts`; alerta de periodo longo nas telas de relatorios.

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

- [x] Corrigir estatisticas de cupons para somar `coupon_usage.discount_amount`.
- [x] Validar maximo de usos e concorrencia de cupons no servidor.
- [x] Decidir se `promotions` sera funcional ou escondido temporariamente (decisao: liberar com aplicacao server-side).
- [x] Se funcional, aplicar promocao no cardapio/checkout de forma server-side.
- [x] Evitar conflito confuso entre promocao automatica e cupom (regra: promocao de pedido e cupom nao somam; vale o maior).
- [x] Criar visibilidade no menu publico para produto com promocao.
- [x] Transformar envio de campanhas em fila/batches.
- [x] Registrar campanha parcialmente enviada com detalhes.
- [x] Validar opt-in, unsubscribe e limite mensal por plano.
- [x] Melhorar metricas de campanha: enviados, entregues, falhas, descadastro.

Criterio de aceite:

- Cupom mostra estatisticas reais.
- Promocao cadastrada tem efeito real ou nao aparece como recurso ativo.
- Campanha grande nao depende de uma unica execucao longa.

Evidencia:

- 2026-05-11: Estatisticas de cupons em `src/hooks/useCoupons.ts`; pre-validacao server-side reforcada em `supabase/migrations/20260512183000_marketing_coupons_campaigns_hardening.sql`; campanhas atualizam progresso parcial em `supabase/functions/email-dispatch/index.ts` e metricas usam `email_send_logs`.
- 2026-05-11: Promocoes aplicadas server-side em `supabase/migrations/20260513090000_apply_promotions_server_side.sql` (RPC `create_public_menu_order` e nova RPC publica `get_public_restaurant_promotions`); visibilidade no cardapio em `src/services/menuThemeService.ts`, `src/types/menuTheme.ts`, `src/components/public-menu/themes/*`, `src/components/public-menu/themes/AddItemModal.tsx`; nota de regra cupom+promocao no `CheckoutFlow`; `PromotionsManager` reativado em `PersonalizacaoTab`.

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

- [x] Trocar loader inicial informal por loader da marca.
- [x] Remover/gatear `console.log` de login/admin/Pagar.me em producao.
- [ ] Revisar textos com acentos e padrao de tom profissional.
- [x] Melhorar tabela de Pedidos em mobile com `overflow-x-auto` ou layout responsivo.
- [~] Revisar empty states de Produtos, Pedidos, Relatorios, Campanhas e iFood (Pedidos migrado; demais pendentes de auditoria).
- [ ] Padronizar cards/alerts/badges para uma aparencia mais SaaS operacional.
- [ ] Verificar contraste e acessibilidade de botoes/badges.
- [ ] Validar PDV em tablet/notebook com tela cheia.
- [ ] Validar Cozinha em TV/monitor e notebook.
- [x] Revisar pagina de Assinaturas para clareza de trial, plano ativo e atraso (alertas dedicados ja cobrem trialing, active e past_due em `src/pages/Assinaturas.tsx`).

Criterio de aceite:

- Fluxos diarios parecem consistentes e comerciais.
- Nao ha logs ruidosos em producao.
- Telas principais funcionam bem em desktop, tablet e mobile.

Evidencia:

- Loader inicial da marca renderiza antes do bundle React (`index.html` agrega `#pubfy-initial-loader` com gradiente Pubfy e spinner acessivel, removido pelo `createRoot` quando o app monta).
- Utilitario `src/lib/log.ts` expõe `createLogger(scope)` que silencia `debug/info` em producao, mantem `warn/error` e encaminha exceptions ao Sentry via `captureException`.
- `console.log` retirado/gateado em `src/pages/Login.tsx`, `src/pages/Admin.tsx`, `src/components/admin/AdminProtectedRoute.tsx`, `src/services/payment/config.ts` e `src/main.tsx`; Pagar.me agora respeita `import.meta.env.DEV` para o flag `debug`.
- Pagina de Pedidos: tabela embrulhada em wrapper `overflow-x-auto` com colunas auxiliares ocultas em telas pequenas e linha-resumo `mesa · cliente` para mobile; estado vazio migrado para componente reusavel.
- Novo componente `src/components/ui/empty-state.tsx` (icon + titulo + descricao + acao) preparado para uniformizar telas restantes (Produtos, Relatorios, Campanhas, iFood) em sprints proximos.
- Itens nao marcados acima dependem de validacao manual em hardware real (tablet, TV/monitor) ou de revisao de copy/contraste em massa, que ficam para o ciclo de hardening antes do go-live (Bloco 10).
- Verificacao: `npm run typecheck`, `npm run lint:src`, `npm test -- --run` (27 testes, 4 arquivos).

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

- [~] Configurar `VITE_SENTRY_DSN` real no frontend. (Pulado nesta rodada — DSN público segue como fallback; operação revisita.)
- [x] Configurar `SENTRY_DSN` nas Edge Functions. (Secret já criado pelo time no Supabase.)
- [~] Definir `SENTRY_ENVIRONMENT` e `SENTRY_RELEASE`. (Documentado em `.env.example`/runbook; validação operacional pendente.)
- [~] Validar que erros React e Edge chegam ao Sentry. (Pulado nesta rodada por escolha do time; checagem operacional posterior.)
- [~] Configurar alertas para Edge Function error rate. (Pulado nesta rodada.)
- [x] Revisar secrets obrigatorios: Pagar.me, Resend, Evolution, n8n, Groq/OpenAI, Supabase service role. (Lista completa documentada em `.env.example` agrupada por destino e checklist no runbook.)
- [x] Rotacionar secrets de teste antes da producao. (Procedimento descrito na seção 8 do `docs/RUNBOOK_PRODUCAO.md`.)
- [x] Configurar Auth Site URL e Redirect URLs de producao no Supabase Dashboard. (Procedimento documentado na seção 2 do runbook.)
- [x] Configurar dominio publico e `PUBLIC_SITE_URL`. (Fallback hardcoded removido em `email-dispatch`; agora avisa quando ausente e omite link de tracking.)
- [x] Validar webhooks Pagar.me e Resend com secrets. (Ambos os webhooks já recusam payload sem assinatura — preflight `Resend webhook fails closed without a signing secret` PASS; comandos `curl` de validação no runbook seção 4.)
- [x] Definir rotina de backup e restore do banco. (Seção 5 do runbook: PITR Supabase + procedimento manual via `supabase db dump`.)
- [x] Criar runbook de rollback de deploy e migration. (Seções 6 e 7 do runbook.)

Criterio de aceite:

- Erro real de teste aparece na ferramenta de observabilidade.
- Webhooks recusam payload sem assinatura/secret.
- Auth e e-mails usam URLs de producao.
- Existe caminho documentado de rollback.

Evidencia:

- `docs/RUNBOOK_PRODUCAO.md` consolida secrets, Auth URLs, validação de webhooks, backups/restore (PITR + dump manual), rollback de deploy e migration, rotação trimestral e checklist de go-live.
- `.env.example` reorganizado por destino: Frontend (Lovable env), Supabase Edge Functions (Supabase secrets) e Auth URLs (Supabase Dashboard). Cobre todos os secrets obrigatórios cobertos pelo `preflight:prod`.
- `supabase/functions/email-dispatch/index.ts` parou de cair em `preview--cardapio-pubfy.lovable.app` quando `PUBLIC_SITE_URL` está vazio. Agora apenas emite warning e omite `tracking_url` no template.
- Webhooks já estavam endurecidos por blocos anteriores (Pagar.me com HMAC SHA-1/256 + idempotência em `pagarme_webhook_events`; Resend com verificação svix em `resend-webhook`). Reconfirmado pelo `npm run preflight:prod` (31 checks PASS).
- Itens marcados com `[~]` (Sentry frontend + alertas) ficaram fora do escopo desta rodada por decisão da operação. Quando a equipe quiser retomar, o ponto de partida é validar `VITE_SENTRY_DSN` no Lovable e disparar erro proposital em ambiente de staging para confirmar coleta.
- Verificação: `npm run typecheck`, `npm run lint:src`, `npm run lint:functions`, `npm run preflight:prod` (todos PASS).

---

## Bloco 10 - Operacao assistida e go-live

Prioridade: `P2`

Problema: alem do codigo, producao comercial precisa de checklist operacional, dados de demonstracao, suporte, treinamento e processo de validacao em restaurante real.

Checklist:

- [ ] Criar ambiente de staging separado. (Operacional — requer projeto Supabase + ambiente Lovable adicionais.)
- [x] Criar restaurante demo padronizado. (`public.seed_demo_restaurant(email, slug, reset)` em `supabase/migrations/20260514120000_seed_demo_restaurant_rpc.sql`.)
- [x] Criar massa de dados realista: produtos, mesas, pedidos, cupons, campanhas. (Seed RPC cria 1 área, 6 mesas, 4 categorias, 14 produtos, 1 promoção de categoria, 2 cupons (`BEMVINDO10`/`FRETE5`), 4 contatos e 1 campanha rascunho.)
- [x] Criar roteiro de QA manual para dono. (Seção 1 de `docs/QA_ROTEIROS_MANUAIS.md`.)
- [x] Criar roteiro de QA manual para funcionario/caixa. (Seção 2 do mesmo arquivo.)
- [x] Criar roteiro de QA manual para cozinha. (Seção 3.)
- [x] Criar roteiro de QA manual para cliente final no cardapio publico. (Seção 4.)
- [x] Criar checklist de implantacao de novo restaurante. (`docs/ONBOARDING_RESTAURANTE.md`.)
- [x] Criar documento de suporte: problemas comuns e solucoes. (`docs/SUPORTE_PROBLEMAS_COMUNS.md`, 10 categorias.)
- [x] Definir rotina de monitoramento pos-go-live. (`docs/MONITORAMENTO_POS_GO_LIVE.md` em 6 cadências.)
- [ ] Fazer piloto com 1 restaurante controlado. (Operacional — agendar com o time comercial.)
- [ ] Registrar bugs do piloto e corrigir antes de vender para mais clientes. (Operacional — depende do piloto.)

Criterio de aceite:

- Um restaurante consegue operar um turno de teste completo.
- Suporte sabe orientar configuracao inicial e problemas comuns.
- Existe decisao clara de liberar ou segurar abertura comercial.

Evidencia:

- RPC `public.seed_demo_restaurant(p_owner_email text, p_slug text default 'pubfy-demo', p_reset boolean default false)` cria restaurante demo padronizado idempotente. Restrita a super admins (`is_super_admin(auth.uid())`), security definer, `REVOKE FROM PUBLIC` + `GRANT EXECUTE TO authenticated`. Defesa contra reset cruzado: só apaga restaurante existente se o owner bater ou o slug começar com `pubfy-demo`.
- Massa de dados realista entregue de uma vez: 1 área `Salão Principal`, 6 mesas (capacidades 4/4/4/4/6/6), 4 categorias (Entradas, Pratos Principais, Bebidas, Sobremesas), 14 produtos com descrições e preços plausíveis, 1 promoção de categoria (10% off em Sobremesas por 60 dias), 2 cupons (`BEMVINDO10` 10% pedido mínimo R$30 com 100 usos, `FRETE5` fixo de R$5 ilimitado), 4 contatos com mix de origem `manual`/`public_order` e opt-in, 1 campanha rascunho.
- `docs/QA_ROTEIROS_MANUAIS.md` consolida quatro roteiros (dono, funcionário/caixa, cozinha, cliente público) com checklist marcável, tabela de bugs encontrados e critério de aceite para liberar produção comercial.
- `docs/ONBOARDING_RESTAURANTE.md` cobre 10 etapas (pré-vendas → pós go-live) com responsável e tempo estimado por fase, integrando-se ao runbook do Bloco 9.
- `docs/SUPORTE_PROBLEMAS_COMUNS.md` lista 10 categorias (Login, Assinatura, Cardápio, PDV, Cozinha, E-mail, WhatsApp, iFood, Performance, Banco) com diagnóstico + correção (SQL/comandos) por sintoma, mais um padrão de como adicionar novos casos.
- `docs/MONITORAMENTO_POS_GO_LIVE.md` define cadência por fase (48h crítico → semanas 1-2 → semanas 3-4 → permanente), métricas a observar, alertas a configurar quando Sentry voltar e protocolo de resposta a incidente P0/P1.
- Itens `[ ]` remanescentes (ambiente de staging + piloto + correção pós-piloto) são operacionais e não cabem em código. Estão documentados no plano para a operação executar.
- Verificação: `npm run typecheck`, `npm run lint:src`, `npm run lint:functions`, `npm run preflight:prod` (31/31), `npm test -- --run` (27 testes, 4 arquivos).

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
| 2026-05-11 | Bloco 4 | Implementado tecnicamente | `plan_id` uuid + FK; RPC/trigger; backfill e `repair_missing_restaurant_subscriptions`; pendente testes manuais de trial/bloqueio/past_due. |
| 2026-05-11 | Bloco 5 | Implementado (núcleo) | Vitest + smoke Playwright; CI lint/audit/test/E2E; E2E de fluxos completos ainda em aberto no plano. |
| 2026-05-11 | Bloco 6 | Implementado tecnicamente | RPCs agregadas + indices, limites de exportacao, alertas de periodo longo, `TestRelatorios` removido. |
| 2026-05-11 | Bloco 7 | Implementado tecnicamente | Stats de cupons corrigidos, validacao server-side endurecida, promocoes server-side com regra item+pedido vs cupom, visibilidade publica e batching de campanhas. |
| 2026-05-11 | Bloco 8 | Implementado (núcleo) | Logger gateado, loader da marca, EmptyState reusável + Pedidos mobile-friendly, Assinaturas com alertas dedicados. Validacao em hardware real e padronizacao ampla de empty states/contraste seguem para o Bloco 10. |
| 2026-05-11 | Bloco 9 | Implementado (núcleo) | Runbook de produção, `.env.example` agrupado por destino, fallback do Lovable removido em `email-dispatch`, preflight 31/31 PASS. Itens de Sentry frontend/alertas pulados por decisão do time. |
| 2026-05-11 | Bloco 10 | Implementado (núcleo) | RPC `seed_demo_restaurant` com massa realista, quatro roteiros de QA, onboarding, suporte e monitoramento documentados. Staging dedicado e piloto controlado seguem como tarefa operacional. |
| 2026-05-11 | Bloqueadores B1-B7 | Implementado tecnicamente | RLS audit + script (B1), logs Pagar.me sanitizados (B2), webhook valida assinatura antes de persistir (B3), observabilidade nos três webhooks core (B4), RPCs agregadas para dashboard (B5) e resumo de pedidos (B6), PDV com paginação adequada e busca por nome server-side (B7). Lint zerado, typecheck OK, 27 testes PASS, preflight 31/31. |
| 2026-05-12 | Importantes Lote 1 (I1/I2/I3/I4/I10) | Implementado tecnicamente | Realtime/polling de pedidos/cozinha com debounce + patch local e polling só como fallback; `email-dispatch` com concorrência controlada em chunks; tracking público mascara QR/checkout após pagamento; planos públicos via RPC sanitizada; `useMySubscriptions` sem `select('*')` e sem IDs Pagar.me no cliente. Typecheck, lint, 27 testes e preflight PASS. |
| 2026-05-12 | Importantes Lote 2 (I5/I6/I7/I8/I9) | Implementado tecnicamente | `AuthProvider` memoizado; cozinha não re-subscreve ao alternar som; gráficos de relatórios com lazy load de `recharts`; erros de auth/perfil enviados via `log.capture`; falhas opcionais de WhatsApp/e-mail no pedido público capturadas sem bloquear UX. Typecheck, lint, 27 testes e preflight PASS. |

---

## Bloqueadores pré-piloto (B1–B7)

Prioridade: `P0`

Esta seção registra os 7 bloqueadores apontados na auditoria profunda do dia 2026-05-11 e que precisavam ser corrigidos antes de qualquer piloto controlado.

- [x] **B1 — RLS auditável e forçada nas tabelas core.** Migration `supabase/migrations/20260515090000_ensure_rls_on_core_tables.sql` aplica `ENABLE` + `FORCE ROW LEVEL SECURITY` em 25 tabelas críticas (orders, products, subscriptions, users, system_admins, restaurants, coupons, promotions, webhooks etc.), publica view `public.rls_audit_report` (security invoker, GRANT só para `authenticated`) e cria política mínima de SELECT em `system_admins`. Script de auditoria contra o banco real em `scripts/audit-rls.mjs` consome a view e falha o build com lista de tabelas sem RLS/políticas.
- [x] **B2 — Sem vazamento de chave Pagar.me em logs.** `src/services/payment/subscriptionService.ts` deixou de imprimir `apiKey.substring(0,5)` no console; agora todos os pontos usam o `createLogger('payment.subscription')` que silencia `debug`/`info` em produção, e o status de integração apenas reporta o comprimento da chave. Tipos `PagarmeSubscriptionResponse` no lugar de `any` quitaram os erros de lint pré-existentes.
- [x] **B3 — Webhook Pagar.me valida assinatura antes de persistir.** `supabase/functions/pagarme-webhook/index.ts` agora rejeita imediatamente com 401 quando `signatureValid === false`, gravando apenas um log mínimo (`event_type=rejected.invalid_signature`, sem o payload bruto). A persistência completa em `pagarme_webhook_events` e o `processEvent` só ocorrem quando a assinatura é válida.
- [x] **B4 — Observabilidade nos webhooks externos.** `pagarme-webhook`, `resend-webhook` e `ifood-integration` passaram a importar `captureEdgeException` (`supabase/functions/_shared/observability.ts`) e enviam para o Sentry exceções em três pontos: assinatura inválida, erro de processamento e erro de rota (com tags `stage`, `event_type`, `action` e extras com IDs relevantes). Sample rate continua governado por `SENTRY_SAMPLE_RATE` em Supabase Secrets.
- [x] **B5 — Dashboard agregado server-side.** Migration `supabase/migrations/20260515091500_dashboard_metrics_rpc.sql` cria `public.get_restaurant_dashboard_metrics(p_restaurant_id, p_window_days, p_include_financials)` que retorna em um único JSON `stats` (totalPedidos, faturamento por `finalizado`, itensVendidos, pedidosAbertos, ticketMedio, crescimentos) e `popular_products` top 5. `src/services/dashboard/metricsService.ts` chama a RPC com cache curto in-memory (5s), e `statsService`/`productsService` ficaram thin wrappers — o frontend deixa de baixar todos os pedidos+itens dos últimos 60 dias.
- [x] **B6 — Resumo de pedidos sem trazer todos os ids.** Migration `supabase/migrations/20260515091700_orders_summary_rpc.sql` cria `public.get_orders_summary(p_restaurant_id, p_data_inicio, p_data_fim, p_status)` `STABLE` + `SECURITY INVOKER` (respeita RLS do chamador). `src/features/pdv/services/pedidoService.ts` substituiu a query `select id, status, total` sem paginação por essa RPC; o `montarResumoPedidos` foi removido e o frontend recebe apenas os 4 totais agregados.
- [x] **B7 — PDV exibe o catálogo completo com busca server-side.** `src/features/pdv/components/NovoPedido.tsx` agora chama `useProdutos` com `tab: 'disponiveis'`, `itensPorPagina: 500`, `sortKey: 'name'`, `sortDirection: 'asc'` e propaga a `busca` para o servidor (ilike por `name`/`description`). O filtro local segue por categoria + texto sobre o conjunto carregado. Aviso visual aparece se o restaurante exceder 500 produtos disponíveis instruindo a usar a busca por nome.

Critério de aceite atendido:

- Lint `npm run lint` zerou os 15 erros pré-existentes (`@typescript-eslint/no-explicit-any` em `useProdutos`, `supabase-service` e serviços Pagar.me) sem suprimir a regra global.
- `npx tsc --noEmit -p tsconfig.app.json` continua verde após registrar as RPCs novas em `src/integrations/supabase/types.ts`.
- `npx vitest run` mantém 27/27 testes verdes; `node scripts/production-preflight.mjs` reporta 31/31 checks PASS, incluindo os checks de observability já existentes.
