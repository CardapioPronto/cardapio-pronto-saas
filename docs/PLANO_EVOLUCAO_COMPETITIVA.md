# Plano de evolucao competitiva — Pubfy

Criado em: 2026-05-28  
Objetivo: organizar a evolucao do Pubfy para competir no mercado brasileiro de sistemas para restaurantes, sem interromper o piloto operacional do que ja existe.

---

## Decisao de trabalho

Sim, podemos seguir com duas trilhas em paralelo:

1. **Piloto operacional assistido**
   - Validar tudo que ja existe hoje: cardapio, pedido publico, PDV, cozinha, mesas, estoque, cupons, promocoes, pagamentos, WhatsApp, iFood, relatorios, assinaturas e permissoes.
   - Registrar bugs, gargalos e pedidos reais dos usuarios.
   - Nao vender como producao comercial ampla antes de pelo menos um piloto real completar um turno sem bug critico.

2. **Evolucao competitiva**
   - Construir funcionalidades novas uma a uma, com escopo MVP e criterio de aceite.
   - Liberar cada bloco atras de controle de plano, feature flag ou ativacao manual quando houver risco operacional.
   - Atualizar este documento a cada entrega com evidencia: PR, migration, teste, print, restaurante piloto ou observacao.

Essa abordagem e melhor do que pausar tudo para "terminar o produto", porque o piloto vai revelar quais diferenciais realmente importam na operacao. A regra e: **piloto estabiliza o presente; evolucao construi o futuro**.

---

## Como usar este documento

- Marque `[x]` quando o item estiver implementado e validado.
- Use `[~]` para trabalho parcial ou piloto limitado.
- Use `[ ]` para pendente.
- Cada bloco deve ter:
  - escopo MVP fechado;
  - migrations/RLS quando houver dados novos;
  - UI operacional;
  - testes ou roteiro manual;
  - criterio de aceite;
  - evidencia registrada.

Antes de iniciar um bloco novo, revisar:

- O piloto pediu isso repetidamente?
- Isso melhora venda direta, recorrencia, margem ou operacao?
- Existe risco de quebrar checkout, PDV, cozinha ou pagamento?
- Podemos entregar uma primeira versao simples em poucos dias?

---

## Norte competitivo

O Pubfy deve evoluir para ser visto como:

> A plataforma de canal proprio para restaurantes venderem direto, operarem pedidos sem bagunca e criarem relacionamento com clientes fora dos marketplaces.

Nao competir apenas como "cardapio digital". O diferencial deve estar em:

- canal proprio;
- relacionamento e recorrencia;
- automacao via WhatsApp;
- operacao integrada;
- dados de decisao para o dono;
- implantacao guiada para pequenos e medios restaurantes.

---

## Ordem recomendada

| Ordem | Bloco | Prioridade | Motivo |
| --- | --- | --- | --- |
| 1 | CRM de clientes | P0 | Base para relacionamento, campanhas, fidelidade e IA |
| 2 | Fidelidade e cashback | P0 | Diferencial comercial visivel para restaurante e consumidor |
| 3 | Campanhas automaticas | P0 | Transforma base propria em recompra |
| 4 | PWA instalavel | P0 | Melhora experiencia mobile e prepara offline/app |
| 5 | Impressao operacional robusta | P0 | Essencial para operacao real de PDV/cozinha |
| 6 | iFood 2.0 | P0 | Aproxima marketplace da gestao central |
| 7 | Fiscal/NFC-e ou parceiro fiscal | P0 | Necessario para competir com PDV completo |
| 8 | Copiloto de IA para o dono | P1 | Diferencial inovador e defensavel |
| 9 | Offline inicial do PDV | P1 | Reduz risco operacional em restaurantes reais |
| 10 | Dashboard financeiro/margem | P1 | Ajuda decisao e prova economia do canal proprio |
| 11 | Avaliacoes e NPS | P1 | Fecha ciclo pos-pedido e melhora qualidade |
| 12 | Abandono de carrinho | P1 | Recupera receita no cardapio publico |
| 13 | Cardapio inteligente/upsell | P1 | Aumenta ticket medio |
| 14 | Ficha tecnica e insumos | P2 | Evolucao de margem e estoque avancado |
| 15 | Multiunidade/franquias | P2 | Expande mercado para redes |
| 16 | Funil e analytics de conversao | P2 | Mostra performance do canal proprio |
| 17 | Integracoes Google/Instagram | P2 | Aumenta aquisicao organica |
| 18 | Central de suporte/onboarding | P2 | Reduz custo de implantacao e suporte |

---

## Trilha do piloto operacional

Objetivo: validar o produto atual antes de escalar venda.

### P1. Preparacao do piloto

- [ ] Escolher 1 restaurante piloto real.
- [ ] Definir responsavel interno pelo acompanhamento diario.
- [ ] Confirmar plano, canais usados e escopo do piloto: salao, delivery, ambos.
- [ ] Rodar `docs/ONBOARDING_RESTAURANTE.md`.
- [ ] Rodar `docs/QA_ROTEIROS_MANUAIS.md` antes do primeiro turno.
- [ ] Validar secrets e webhooks reais: Pagar.me, Resend, WhatsApp/Evolution, iFood se aplicavel.

### P2. Metricas do piloto

- [ ] Tempo ate cardapio publicado.
- [ ] Tempo ate primeiro pedido real.
- [ ] Pedidos criados com sucesso por canal.
- [ ] Pedidos com erro no checkout.
- [ ] Tempo medio entre pedido e preparo.
- [ ] Falhas de WhatsApp/e-mail/pagamento.
- [ ] Bugs por severidade.
- [ ] Pedidos de funcionalidade feitos pelo restaurante.
- [ ] NPS do dono e dos operadores.

### P3. Criterio para venda ampla

- [ ] Pelo menos 1 turno real sem bug critico.
- [ ] Bugs de severidade alta corrigidos.
- [ ] Checkout publico e PDV validados em operacao real.
- [ ] Cozinha validada em tablet/notebook ou monitor.
- [ ] WhatsApp e pagamentos validados ou explicitamente desativados no piloto.
- [ ] Suporte sabe resolver os problemas comuns documentados.
- [ ] Primeiro case ou depoimento coletado.

Evidencia:

- Pendente.

---

## Bloco 1 — CRM de clientes

Prioridade: P0  
Objetivo: transformar pedidos em base propria de clientes.

### Escopo MVP

- [x] Criar tabela/visao de clientes por restaurante.
- [x] Consolidar cliente por telefone normalizado.
- [x] Registrar nome, telefone, e-mail, aniversario opcional, origem e opt-in.
- [x] Mostrar historico de pedidos por cliente.
- [x] Calcular ultima compra, total gasto, ticket medio e quantidade de pedidos.
- [x] Permitir tags manuais.
- [x] Permitir filtros: novos, recorrentes, inativos, alto ticket.

### Mini bloco 1.1 — Captura de leads e ponte para campanhas

- [x] Capturar/enriquecer lead do CRM a partir de pedidos reais do cardapio publico.
- [x] Capturar/enriquecer lead do CRM a partir de pedidos do PDV.
- [x] Registrar opt-in de campanhas no checkout publico.
- [x] Permitir opt-in simples no PDV quando o cliente autorizar campanhas.
- [x] Mostrar origem amigavel na base de clientes: PDV, Cardapio, iFood, WhatsApp, mesa/balcao.
- [x] Adicionar atalho da base de clientes para criacao de campanha segmentada.

### Criterio de aceite

- Dono consegue abrir uma tela de clientes e identificar quem comprou, quando comprou e quanto vale.
- Pedidos publicos alimentam o CRM automaticamente.
- Dados respeitam RLS por restaurante.
- Exportacao ou uso em campanha nao inclui clientes sem opt-in quando o canal exigir consentimento.

Evidencia:

- 2026-05-28: MVP implementado tecnicamente em `supabase/migrations/20260528130000_create_crm_customer_mvp.sql`, `src/pages/Clientes.tsx`, `src/services/crmService.ts` e `src/types/crm.ts`.
- 2026-05-28: Rota `/clientes` adicionada ao app e ao menu lateral, protegida por `orders_view`, `reports_view` ou `orders_metrics_view`.
- 2026-05-28: Mini bloco 1.1 implementado com `supabase/migrations/20260528152000_capture_crm_leads_from_orders.sql`, captura no checkout/PDV, origem amigavel e atalho para campanhas.
- 2026-05-28: `npm run typecheck` e lint focado nos arquivos tocados passaram.
- Pendente: aplicar migration no banco remoto/local de teste e executar QA com dados reais do piloto.

---

## Bloco 2 — Fidelidade e cashback

Prioridade: P0  
Objetivo: aumentar recompra no canal proprio.

### Escopo MVP

- [x] Configuracao por restaurante: pontos ou cashback.
- [x] Regra simples: percentual do pedido finalizado vira credito.
- [x] Saldo por cliente.
- [x] Resgate no checkout publico.
- [x] Historico de creditos e debitos.
- [x] Limites: validade, pedido minimo e maximo por resgate.
- [x] Tela para o dono acompanhar clientes com saldo.

### Criterio de aceite

- Cliente faz pedido, recebe beneficio e consegue usar em compra futura.
- Cancelamento de pedido estorna beneficio quando necessario.
- O dono consegue explicar a regra em menos de 30 segundos.

Evidencia:

- 2026-05-28: Branch `bloco-2-fidelidade-cashback` criada a partir de `main`.
- 2026-05-28: Motor MVP iniciado com `supabase/migrations/20260528170000_create_loyalty_cashback_mvp.sql`, servico `src/services/loyaltyService.ts`, tipos `src/types/loyalty.ts`, tela `/fidelidade` e link no menu lateral.
- 2026-05-28: Cashback automatico em pedidos `finalizado` e estorno em reabertura/cancelamento implementados via trigger.
- 2026-06-01: Resgate no checkout publico implementado com RPC segura/idempotente `apply_public_loyalty_redemption`, consulta de saldo no resumo do pedido e desconto aplicado antes do PIX online.

---

## Bloco 3 — Campanhas automaticas

Prioridade: P0  
Objetivo: gerar recompra sem depender de acao manual diaria.

### Escopo MVP

- [x] Segmentar clientes por comportamento.
- [x] Criar automacoes basicas:
  - [x] cliente inativo ha 30 dias;
  - [x] aniversariante;
  - [x] primeiro pedido sem recompra;
  - [x] cliente alto ticket;
  - [x] comprou categoria especifica.
- [x] Gerar cupom automatico vinculado a campanha.
- [x] Enviar teste da campanha antes do disparo real.
- [x] Enviar por e-mail no MVP.
- [x] Mostrar metricas: enviados, abertos/clicados quando disponivel, pedidos gerados, receita atribuida.
- [ ] Enviar por WhatsApp quando a base operacional estiver validada.

### Criterio de aceite

- Dono ativa uma automacao sem precisar montar segmentacao complexa.
- Campanha gera cupom rastreavel.
- Receita por campanha aparece no painel.

Evidencia:

- 2026-06-01: Bloco 3 iniciado com gatilhos guiados em `/automacoes` para criar campanhas por e-mail pre-preenchidas. O publico `inactive_customers` foi adicionado ao envio por e-mail para campanha real de cliente inativo.
- 2026-06-01: Segmentacao comportamental evoluida com RPC `get_email_campaign_recipients`: primeira compra sem recompra, alto ticket e saldo de fidelidade agora selecionam destinatarios reais no envio, respeitando opt-in, descadastro e limite do plano.
- 2026-06-01: Cupom rastreavel por campanha iniciado com `generate_email_campaign_coupon`, relacionamento `email_campaigns.coupon_id`, exibicao no editor e renderizacao da variavel `{{coupon}}` no envio.
- 2026-06-01: Metricas de atribuicao iniciadas com `get_email_campaign_attribution_metrics`, exibindo pedidos, pedidos finalizados, receita atribuida e descontos a partir do cupom vinculado.
- 2026-06-01: Configuracao operacional do cupom da campanha adicionada ao painel: tipo de desconto, valor, validade e pedido minimo podem ser definidos antes do envio; campanhas em rascunho atualizam o mesmo cupom vinculado para manter a atribuicao limpa.
- 2026-06-01: Segmentacao por categoria comprada iniciada com o publico `purchased_category`: automacao guiada em `/automacoes`, seletor de categoria no editor de campanhas e RPC filtrando clientes que compraram produtos daquela categoria em pedidos finalizados dentro da janela configurada.
- 2026-06-01: Previa operacional de publico adicionada ao editor de campanhas via `preview_campaign_audience`, retornando quantidade alcançada, limites do plano e amostra de contatos antes do envio.
- 2026-06-02: Segmentacao de aniversariantes iniciada com o publico `birthday`, card guiado em `/automacoes` e filtro de clientes com `birth_date` no CRM dentro da janela configurada.
- 2026-06-02: Campanhas automaticas reorganizadas para dentro do modulo Email - Resend, com aba propria de automacoes, cards de gatilho guiado e navegacao voltar/avancar na pagina de integracao.
- 2026-06-02: Reaproveitamento operacional adicionado ao editor: campanhas podem ser duplicadas como novo rascunho, status aparecem em portugues e o envio bloqueia conteudo com `{{coupon}}` sem cupom vinculado.
- 2026-06-02: Envio de teste da campanha adicionado ao editor antes do disparo real, usando o Resend configurado do restaurante e registrando log separado como `test`, sem consumir metricas de campanha marketing.
- 2026-06-02: Logs de e-mail ganharam filtros por tipo e status, destacando testes, campanhas, transacionais e contexto de origem para facilitar a conferencia operacional no piloto.
- 2026-06-02: Checklist pre-disparo adicionado ao editor de campanhas, exigindo previa de publico com contatos antes do envio real e exibindo cupom, saldo mensal e ultimo teste registrado.

---

## Bloco 4 — PWA instalavel

Prioridade: P0  
Objetivo: melhorar experiencia mobile e preparar app/offline.

### Escopo MVP

- [x] Adicionar manifesto web.
- [x] Adicionar service worker.
- [x] Cachear assets da aplicacao.
- [x] Exibir indicador online/offline.
- [x] Permitir instalar no celular/tablet.
- [x] Bloquear acoes que exigem internet com mensagem clara.

### Criterio de aceite

- Operador consegue instalar o Pubfy no Android como app pelo navegador.
- App abre a interface mesmo com conexao instavel.
- Nenhuma venda offline e prometida ainda.

Evidencia:

- 2026-06-02: Bloco 4 iniciado com `manifest.webmanifest`, metadados mobile/Apple e icones PWA 192x192/512x512 gerados a partir da marca Pubfy para instalacao em celular/tablet. Offline e cache ainda nao foram prometidos nesta fatia.
- 2026-06-02: Service worker conservador registrado em producao, com cache do shell minimo e assets estaticos de mesma origem. APIs, Supabase e acoes operacionais continuam dependentes de internet.
- 2026-06-02: Indicador online/offline adicionado ao cabecalho operacional, exibindo estado de conexao nas telas protegidas sem prometer operacao offline.
- 2026-06-02: Aviso global de perda de conexao adicionado e validado com Playwright em build de producao/preview: app shell permanece carregado offline apos primeiro acesso, e o estado volta ao normal quando a conexao retorna.
- 2026-06-02: Acoes criticas que dependem de internet agora exibem bloqueio claro quando offline: finalizar pedido no PDV, alterar status, atualizar historico, aplicar cupom, buscar CEP e confirmar pedido no checkout publico.

---

## Bloco 5 — Impressao operacional robusta

Prioridade: P0  
Objetivo: atender rotina real de cozinha, caixa e salao.

### Escopo MVP

- [x] Configurar modelo de comanda.
- [x] Configurar vias: cozinha, caixa, cliente.
- [x] Imprimir pedido por setor.
- [x] Botao de reimpressao.
- [x] Comprovante com itens, observacoes, mesa, cliente, total e forma de pagamento.
- [x] Documentar impressoras/formatos suportados.

### Criterio de aceite

- Restaurante piloto consegue operar um turno com comandas impressas ou comprovantes consistentes.
- Impressao nao bloqueia criacao do pedido se falhar.
- Falha de impressao gera mensagem acionavel.

Evidencia:

- 2026-06-02: Bloco 5 iniciado com modelos separados no motor de impressao: comanda da cozinha sem valores, via do caixa com pagamento/total e comprovante do cliente. Historico do PDV ganhou reimpressao por via.
- 2026-06-02: Guia operacional criado em `docs/IMPRESSAO_OPERACIONAL.md`, documentando fluxo de teste, impressao via navegador e limites do MVP.
- 2026-06-02: Preferencias de impressao por restaurante adicionadas em Configuracoes > Sistema: tamanho de papel 58mm/80mm/A4 e vias padrao cozinha/caixa/cliente. Teste de impressao e reimpressoes do PDV passam a respeitar o tamanho configurado.
- 2026-06-02: Impressao pos-finalizacao conectada ao PDV: quando a impressao automatica esta ativa, o pedido recem-criado abre um dialogo para imprimir as vias padrao sem depender de reabrir o historico.
- 2026-06-02: Via de cozinha passou a organizar itens por setor operacional usando a categoria do produto; pedidos antigos ou produtos sem categoria caem no setor Geral.

---

## Bloco 6 — iFood 2.0

Prioridade: P0  
Objetivo: transformar iFood em canal integrado, nao apenas pedido importado.

### Escopo MVP

- [x] Criar mapeamento SKU/item iFood para `products.id`.
- [x] Mostrar itens iFood nao mapeados.
- [x] Permitir vinculo manual item externo -> produto interno.
- [x] Baixar estoque quando item estiver mapeado.
- [x] Estornar estoque em cancelamento quando status externo permitir.
- [x] Relatorio separado: vendas iFood x vendas canal proprio.

### Criterio de aceite

- Pedido iFood mapeado baixa estoque como PDV/cardapio publico.
- Pedido nao mapeado nao quebra operacao e aparece para correcao.
- Dono entende quanto vendeu em marketplace versus canal proprio.

Evidencia:

- 2026-06-02: Bloco 6 iniciado com tabela `ifood_item_mappings`, registro automatico de itens observados no polling iFood, tentativa de vinculo durante importacao de pedidos e aba "Mapeamento" em `/ifood-integracao` para associar item externo a produto interno.
- 2026-06-02: Credenciais do app iFood foram centralizadas no Super Admin em `ifood_saas_app`; restaurantes configuram apenas a loja/Merchant ID.
- 2026-06-02: Baixa automatica de estoque conectada ao polling iFood para itens mapeados, reaproveitando `apply_stock_for_order`; cancelamentos/status externos cancelados estornam via `revert_stock_for_order`. Se faltar saldo, o pedido importado nao e perdido e o erro fica registrado no evento/log para correcao operacional.
- 2026-06-02: Relatorio iFood x canal proprio adicionado aos Relatorios Avancados, com faturamento, pedidos, ticket medio, participacao e detalhamento dos canais proprios. Requer aplicar a migration `20260602172000_add_channel_breakdown_to_sales_report.sql`.

---

## Bloco 7 — Fiscal/NFC-e ou parceiro fiscal

Prioridade: P0  
Objetivo: remover uma barreira de adocao para quem usa PDV completo.

### Escopo MVP

- [ ] Decidir construir ou integrar com parceiro fiscal.
- [ ] Mapear requisitos por estado e regime.
- [ ] Definir fluxo: emitir NFC-e a partir de pedido finalizado.
- [ ] Armazenar status fiscal e chave/documento.
- [ ] Permitir cancelamento/inutilizacao conforme parceiro suportar.
- [ ] Documentar limites do MVP.

### Criterio de aceite

- Existe caminho claro para emissao fiscal em restaurante piloto, mesmo que via parceiro.
- Comercial sabe dizer exatamente o que e suportado e o que nao e.

Evidencia:

- Pendente.

---

## Bloco 8 — Copiloto de IA para o dono

Prioridade: P1  
Objetivo: transformar dados operacionais em recomendacoes simples.

### Escopo MVP

- [x] Gerar resumo diario automatico.
- [x] Sugerir produto parado, produto campeao e queda de vendas.
- [x] Sugerir campanha com base em clientes inativos.
- [x] Sugerir ajuste de cardapio/promocao.
- [x] Mostrar "por que estou vendo isso" com dados usados.
- [x] Nunca executar mudanca automaticamente sem confirmacao do dono.

### Criterio de aceite

- Dono recebe 3 a 5 recomendacoes praticas por semana.
- Cada recomendacao tem acao clara: criar cupom, ajustar produto, divulgar link, revisar estoque.

Evidencia:

- 2026-06-04: Bloco 8 iniciado com Copiloto em `/copiloto`, RPC `get_owner_copilot_insights` e recomendações explicáveis usando vendas de hoje, comparação semanal, produto campeão, produto parado e clientes inativos com opt-in. O modo atual é sob demanda; agendamento/envio automático fica para próxima fatia.
- 2026-06-04: Resumo diário persistido adicionado com `owner_copilot_daily_summaries`, histórico recente no painel e marcação de recomendações como revisadas. O resumo já fica salvo por dia quando o dono abre/atualiza o Copiloto; cron/notificação automática ainda pendente.
- 2026-06-04: Alertas internos adicionados ao sino do dashboard via RPC `get_owner_copilot_alerts`. O sistema cria o resumo do dia caso ainda nao exista, mostra recomendações de prioridade alta/media pendentes e permite marcar como revisada ou descartada no `/copiloto`.

---

## Bloco 9 — Offline inicial do PDV

Prioridade: P1  
Objetivo: reduzir risco quando a internet oscila.

### Escopo MVP

- [x] Cache local de produtos, categorias e mesas.
- [x] Mostrar ultima sincronizacao.
- [x] Criar fila local de pedidos de balcao.
- [x] Sincronizar quando internet voltar.
- [x] Adicionar `client_order_id` para evitar duplicidade.
- [x] Mostrar painel de pedidos pendentes de sincronizacao.

### Fora do MVP

- Pagamento online offline.
- iFood offline.
- Edicao de cardapio offline.
- Relatorios offline.

### Criterio de aceite

- Operador consegue registrar pedido de balcao sem internet e sincronizar depois sem duplicar.
- Conflitos aparecem para revisao, nao sao silenciosos.

Evidencia:

- 2026-06-04: Bloco 9 iniciado com snapshot local versionado por restaurante para produtos disponíveis, categorias, mesas e áreas do PDV. O Novo Pedido usa a última sincronização salva quando a rede cai, mostra origem/horário dos dados e permite atualização manual online. A finalização de pedidos offline permanece bloqueada até a implementação da fila local e de `client_order_id`.
- 2026-06-04: Detecção de conectividade reforçada com probe real do endpoint de saúde do Supabase, pois `navigator.onLine` pode permanecer verdadeiro sem acesso à internet. Badge, banner, cache do PDV, polls operacionais e Realtime agora aguardam a conectividade real e pausam chamadas repetitivas enquanto o backend estiver indisponível.
- 2026-06-04: Fila local de pedidos de balcão adicionada ao PDV, com sincronização automática ao reconectar, painel de pendências/erros e remoção com confirmação. A migration `20260604130000_pos_order_client_order_id.sql` adiciona idempotência por restaurante + `client_order_id` na RPC `create_pos_order`, impedindo duplicidade em retries concorrentes. Pedidos de mesa continuam exigindo conexão.

---

## Bloco 10 — Dashboard financeiro e margem

Prioridade: P1  
Objetivo: provar valor economico do Pubfy.

### Escopo MVP

- [x] Receita por canal: PDV, cardapio proprio, WhatsApp, iFood.
- [x] Taxas estimadas de marketplace/gateway.
- [x] Ticket medio por canal.
- [x] Produtos com maior receita.
- [x] Margem estimada quando houver custo/ficha tecnica.
- [x] Calculadora de economia do canal proprio.
- [x] Diagnostico executivo de margem, taxas e dependencia de canais.

### Criterio de aceite

- Dono consegue ver se o canal proprio esta crescendo.
- Comercial consegue usar dados reais para provar economia.

### Backlog futuro

- [ ] Comparativo periodo atual x periodo anterior para receita, margem, taxas e canal proprio.
- [ ] Metas financeiras por periodo: faturamento, margem, ticket medio e participacao do canal proprio.
- [ ] CMV real integrado a ficha tecnica, compras, perdas e inventario.
- [ ] Fluxo de caixa operacional com recebiveis, repasses, antecipacoes e taxas reais.
- [ ] DRE simplificada por restaurante e por unidade.
- [ ] Analise de margem por canal, categoria, produto e horario.
- [ ] Alertas de queda de margem, alta dependencia de marketplace e custo sem cadastro.
- [ ] Exportacao PDF/CSV do dashboard financeiro para reuniao gerencial.

Evidencia:

- 2026-06-04: Bloco 10 iniciado com a nova aba Financeiro em Relatorios. A migration `20260604140000_create_financial_dashboard_foundation.sql` cria configuracao de taxas estimadas por restaurante e a RPC agregada `get_restaurant_financial_dashboard`, com receita, pedidos, ticket medio, taxas, receita liquida estimada e participacao para PDV, cardapio proprio, WhatsApp e iFood.
- 2026-06-04: A tela financeira adiciona configuracao das taxas medias de iFood e gateway, calculadora de economia do canal proprio e comparacao de custo estimado sem prometer percentuais padrao. Produtos com maior receita permanecem disponiveis no relatorio avancado, e o filtro de origem passou a incluir WhatsApp.
- 2026-06-04: A migration `20260604150000_add_product_cost_and_financial_margin.sql` adiciona custo unitario opcional em tabela financeira protegida por RLS e amplia o dashboard com margem bruta estimada, cobertura da receita por custos cadastrados e ranking de margem por produto. Itens sem custo ou sem vinculo com o catalogo ficam fora do calculo, evitando tratar ausencia de dados como custo zero.
- 2026-06-10: Aba `Financeiro` ganhou diagnostico executivo com status de saude, percentual de taxas sobre receita, dependencia de iFood, cobertura de custos, margem coberta e alertas para taxas nao configuradas, baixo canal proprio, dependencia de marketplace, baixa cobertura de custo e margem baixa.

---

## Bloco 11 — Avaliacoes e NPS

Prioridade: P1  
Objetivo: medir qualidade e recuperar experiencias ruins.

### Escopo MVP

- [x] Enviar pesquisa pos-pedido.
- [x] Coletar nota e comentario.
- [x] Alertar dono em nota baixa.
- [x] Mostrar media por periodo.
- [x] Associar avaliacao ao pedido e ao cliente.
- [x] Diagnostico operacional de qualidade e risco de recompra.

### Criterio de aceite

- Restaurante identifica clientes insatisfeitos antes de perder recompra.
- Avaliacao nao atrapalha o fluxo principal de pedido.

### Backlog futuro

- [ ] Taxa de resposta da pesquisa considerando pedidos elegiveis no periodo.
- [ ] Motivos estruturados de insatisfacao: atraso, atendimento, produto, embalagem, preco e entrega.
- [ ] Fluxo de tratativa com status, responsavel, prazo e historico de contato.
- [ ] Automacao de recuperacao para detratores com cupom, mensagem ou tarefa interna.
- [ ] Pedido de depoimento publico para promotores, respeitando consentimento.
- [ ] Analise por canal, horario, produto, categoria e unidade.
- [ ] Relatorio de recompra apos avaliacao positiva, neutra ou negativa.
- [ ] Alertas de tendencia quando NPS ou nota media cairem por varios periodos.

Evidencia:

- 2026-06-05: Criada base `order_feedback` com RPC publica de avaliacao no acompanhamento do pedido finalizado, vinculo com pedido/cliente e aba "Avaliacoes" em Relatorios com NPS, media, detratores e comentarios recentes.
- 2026-06-05: Alerta em nota baixa — notificacao no sino do painel, e-mail `order_feedback_low_rating` via edge `order-feedback-notify` + trigger pg_net, botao "Resolver" no relatorio e deep link `/relatorios?tab=avaliacoes`.
- 2026-06-10: Aba `Avaliacoes` em Relatorios ganhou diagnostico de qualidade com status de saude, percentual de detratores, pedidos de contato, pendencias criticas e alertas para NPS negativo, baixa nota media, alto volume de detratores ou ausencia de dados.

---

## Bloco 12 — Abandono de carrinho

Prioridade: P1  
Objetivo: recuperar pedidos iniciados e nao concluidos.

### Escopo MVP

- [x] Registrar carrinho iniciado com telefone quando informado.
- [x] Detectar abandono apos janela configuravel.
- [x] Criar lembrete por e-mail ou WhatsApp quando houver opt-in.
- [x] Cupom opcional de recuperacao.
- [x] Relatorio: abandonos, recuperados, receita recuperada.
- [x] Diagnostico operacional da recuperacao de carrinho.

### Criterio de aceite

- Restaurante consegue recuperar pelo menos parte dos pedidos iniciados.
- Mensagens respeitam consentimento e limite de frequencia.

### Backlog futuro

- [ ] Tracking de eventos do funil: carrinho iniciado, checkout iniciado, opt-in, lembrete enviado, clique e recuperacao.
- [ ] Deep link de recuperacao restaurando carrinho ou cupom automaticamente no cardapio publico.
- [ ] Atribuicao por canal: e-mail, WhatsApp, organic retorno e cupom.
- [ ] Teste A/B de assunto, mensagem, cupom e tempo de disparo.
- [ ] Segmentacao por valor do carrinho, cliente recorrente, primeira compra e canal de atendimento.
- [ ] Regras de frequencia por cliente com historico unificado de campanhas e automacoes.
- [ ] Alertas para automacao sem disparo, baixa taxa de recuperacao ou falha recorrente no canal.
- [ ] Relatorio de ROI com custo de cupom, receita incremental e margem estimada.

Evidencia:

- 2026-06-05: Tabelas `cart_abandonment_settings` / `cart_abandonment_sessions`, RPC `upsert_public_cart_abandonment_session`, trigger de recuperação em `orders`, edge `cart-abandonment-cron` (pg_cron 5 min), template `cart_abandonment_recovery`, página `/recuperacao-carrinho`, tracking no `CheckoutFlow` com opt-in e-mail/WhatsApp.
- 2026-06-10: Pagina `/recuperacao-carrinho` ganhou diagnostico operacional com status da automacao, canais ativos, janela de disparo, cupom configurado e alertas para recuperacao pausada, falta de canal, ausencia de lembretes, janelas inadequadas e baixa conversao.

---

## Bloco 13 — Cardapio inteligente e upsell

Prioridade: P1  
Objetivo: aumentar ticket medio.

### Escopo MVP

- [x] Produtos em destaque por horario.
- [x] Sugestao de adicionais no modal do produto.
- [x] Combos sugeridos no carrinho.
- [x] "Clientes tambem pedem" com base em dados reais quando houver volume.
- [x] Regra manual como fallback.
- [x] Diagnostico de cobertura e qualidade das regras de upsell.

### Criterio de aceite

- Dono consegue configurar upsell sem conhecimento tecnico.
- Cliente recebe sugestoes uteis sem poluir o checkout.

### Backlog futuro

- [ ] Atribuicao por regra: impressoes, cliques, adicoes ao carrinho, conversao e receita incremental.
- [ ] Teste A/B de sugestoes, titulos e posicoes de exibicao.
- [ ] Sugestao automatica baseada em margem, estoque disponivel e historico de venda.
- [ ] Regras por canal: mesa, balcao, delivery e retirada.
- [ ] Personalizacao por perfil do cliente: recorrente, alto ticket, inativo e primeira compra.
- [ ] Biblioteca de modelos de upsell por tipo de restaurante.
- [ ] Agenda sazonal de combos e campanhas por data comemorativa.
- [ ] Protecao automatica para nao sugerir item indisponivel, com baixo estoque ou baixa margem.

Evidencia:

- 2026-06-08: Tabela `menu_upsell_rules`, RPC publica `get_public_menu_upsell`, aba `Upsell` em Cardapio Digital, destaques por horario, sugestoes no modal do produto, combos no carrinho e fallback manual para "clientes tambem pedem". O RPC tambem gera pares reais por coocorrencia de itens em pedidos finalizados dos ultimos 120 dias quando houver pelo menos 3 pedidos em comum.
- 2026-06-10: Aba `Upsell` ganhou diagnostico de configuracao com regras ativas, cobertura direta de produtos, posicoes usadas, alertas para lacunas de configuracao e regras que apontam para produto ausente, indisponivel ou sem gatilho valido.

---

## Bloco 14 — Ficha tecnica e insumos

Prioridade: P2  
Objetivo: evoluir estoque para controle de custo real.

### Escopo MVP

- [x] Cadastro de insumos.
- [x] Unidade de medida.
- [x] Receita/ficha tecnica por produto.
- [x] Baixa de insumo por pedido finalizado.
- [x] Custo estimado do produto.
- [x] Margem bruta por produto.
- [x] Lista de reposicao sugerida por baixo saldo.
- [x] Inventario fisico com ajuste auditavel de divergencia.

### Criterio de aceite

- Restaurante consegue responder quanto custa vender cada produto principal.
- Baixa de insumo e auditavel e reversivel em cancelamento.

### Backlog futuro

- [ ] Alertas automaticos de baixo estoque no painel e por canal configurado.
- [ ] Previsao de consumo e compra sugerida com base no historico de vendas.
- [ ] Cadastro de fornecedores, ultimo preco pago e comparativo de cotacoes.
- [ ] Registro de perdas, validade e descartes por motivo.
- [ ] Inventario por contagem cega e fechamento por responsavel.
- [ ] Relatorio de CMV, margem real e variacao de custo por periodo.
- [ ] Ficha tecnica com rendimento, preparos intermediarios e custo por porcao.
- [ ] Exportacao da lista de compras em PDF/CSV.

Evidencia:

- 2026-06-08: Tabelas `inventory_ingredients`, `product_recipe_items` e `ingredient_stock_movements`; funcoes `adjust_ingredient_stock`, `apply_ingredients_for_order`, `revert_ingredients_for_order`, trigger `trg_sync_ingredient_stock_from_order_status` em `orders` e RPC `get_recipe_costs`. Tela `/insumos` com cadastro de insumos, ajuste auditavel de saldo, ficha tecnica por produto, custo estimado e margem bruta.
- 2026-06-10: Aba `Reposicao` em `/insumos`, com valor estimado em estoque, compra sugerida para itens abaixo do minimo e lista operacional calculada para levar cada insumo em alerta ate 2x o saldo minimo configurado.
- 2026-06-10: Aba `Inventario` em `/insumos`, permitindo informar saldo contado, calcular divergencia e impacto estimado, e registrar a diferenca como movimento `inventory_count` auditavel via `adjust_ingredient_stock`.

---

## Bloco 15 — Multiunidade/franquias

Prioridade: P2  
Objetivo: vender para redes pequenas e franquias.

### Escopo MVP

- [x] Usuario com acesso a multiplos restaurantes.
- [x] Troca de unidade no painel.
- [x] Relatorio consolidado.
- [x] Cardapio matriz opcional.
- [x] Permissoes por unidade.
- [x] Cadastro de novas unidades dentro da rede.
- [x] Sincronizacao controlada do cardapio matriz para filiais.
- [x] Replicacao de acesso da equipe entre unidades.
- [x] Diagnostico de prontidao operacional por unidade.
- [x] Checklist acionavel de implantacao por filial.
- [x] Comparativo executivo de performance entre unidades.

### Criterio de aceite

- Gestor de rede enxerga consolidado sem misturar dados indevidamente.
- RLS continua impedindo vazamento entre unidades.

### Backlog futuro

- [ ] Metas por unidade.
- [ ] Comparativo de performance entre mes atual e mes anterior.
- [ ] Exportacao PDF/CSV do consolidado multiunidade.
- [ ] Alertas automaticos para filial sem venda ou com baixa prontidao.
- [ ] Auditoria detalhada de sincronizacoes de cardapio e equipe.

Evidencia:

- 2026-06-08: Fundacao multiunidade em `restaurant_groups`, `restaurant_group_units` e `restaurant_user_access`; RPCs `get_my_restaurant_access`, `set_active_restaurant`, `get_multiunit_consolidated_report` e `set_restaurant_group_menu_matrix`; `get_user_restaurant_id` e `user_has_restaurant_permission` passam a respeitar acesso multiunidade. App ganhou provider de unidade ativa, seletor no header/sidebar e tela `/multiunidade` com consolidado por rede, filtro de unidades e definicao de cardapio matriz. Implementado sobre a branch `feature/programa-indicacoes-foundation` para manter compatibilidade com o programa de indicacoes.
- 2026-06-08: Cadastro de nova unidade via `/multiunidade` com RPC `create_multiunit_restaurant`, mantendo a unidade no grupo existente, acesso do dono/gestor e sem gerar atribuicao automatica no programa de indicacoes.
- 2026-06-08: Sincronizacao do cardapio matriz com RPC `sync_restaurant_group_menu` e acao em `/multiunidade`; cria/atualiza categorias e produtos nas filiais selecionadas, preservando itens locais e saldos de estoque por unidade.
- 2026-06-09: Gestao de equipe da rede em `/multiunidade` com RPCs `get_restaurant_group_staff` e `apply_restaurant_group_staff_access`; permite aplicar cargo/permissoes de um colaborador para filiais selecionadas sem remover acessos existentes.
- 2026-06-09: Diagnostico de prontidao operacional com RPC `get_restaurant_group_readiness` e card em `/multiunidade`; calcula score por filial considerando dados cadastrais, cardapio, equipe, canais, operacao, assinatura e repasse, destacando pendencias antes da unidade entrar em operacao.
- 2026-06-09: Checklist acionavel de implantacao em `/multiunidade`, com drill-down por filial, checks detalhados e atalhos que trocam a unidade ativa antes de abrir cadastro, produtos, equipe, mesas, canais, assinatura ou repasse.
- 2026-06-09: Comparativo executivo no consolidado multiunidade, destacando maior faturamento, maior volume de pedidos, maior ticket medio e filiais sem movimento no periodo selecionado.

---

## Bloco 16 — Funil e analytics de conversao

Prioridade: P2  
Objetivo: medir performance do canal proprio.

### Escopo MVP

- [x] Visualizacoes do cardapio.
- [x] Cliques em produto.
- [x] Produto adicionado ao carrinho.
- [x] Checkout iniciado.
- [x] Pedido concluido.
- [x] Conversao por campanha/origem.
- [x] Diagnostico por produto com clique, sacola, pedido e receita.
- [x] Termos de busca e buscas sem resultado.
- [x] Comparativo de funil entre periodos.
- [x] Diagnostico por categoria e por faixa de horario.

### Criterio de aceite

- Dono consegue ver onde perde clientes no cardapio.
- Campanhas mostram origem e conversao.

### Backlog futuro

- [ ] Metas de conversao por origem/campanha.
- [ ] Link builder com UTM e QR rastreavel para Instagram, WhatsApp e Google.
- [ ] Recomendacoes automaticas do copilot a partir dos gargalos do funil.

Evidencia:

- 2026-06-10: Fundacao do funil de conversao do cardapio publico com tabela `public_menu_analytics_events`, RPC anonima `track_public_menu_event` com rate limit e RPC autenticada `get_public_menu_conversion_funnel`. O cardapio publico passou a registrar visualizacao, clique em produto, adicao ao carrinho, checkout iniciado e pedido concluido com origem/UTM. A tela `/relatorios?tab=conversao` exibe cards de conversao, etapas do funil, diagnostico e agrupamento por origem/campanha.
- 2026-06-10: Fatia 2 adicionou eventos `search_performed` e `search_no_results`, diagnostico por produto no funil e tabela de buscas do cardapio. A aba de conversao agora aponta produtos com clique sem sacola, baixa conversao para carrinho, baixa conclusao de pedido e termos pesquisados que nao retornaram itens.
- 2026-06-10: Fatia 3 adicionou comparativo automatico com periodo anterior equivalente na aba `/relatorios?tab=conversao`, exibindo variacao de visitas, clique em produto, produto para sacola, checkout para pedido, conversao final e busca sem resultado.
- 2026-06-10: Fatia 4 adicionou RPC `get_public_menu_segment_diagnostics` e novas secoes em `/relatorios?tab=conversao` para diagnostico por categoria e horarios de conversao, destacando cliques, sacola, pedidos, receita e gargalos por secao do cardapio e hora do dia.

---

## Bloco 17 — Integracoes Google e Instagram

Prioridade: P2  
Objetivo: aumentar aquisicao para o canal proprio.

### Escopo MVP

- [x] Links rastreaveis para bio do Instagram.
- [x] UTM por campanha.
- [x] Kit de divulgacao com QR e link.
- [x] Orientacao para Google Business Profile.
- [x] Relatorio de pedidos por origem.
- [x] Resumo de resultado por canal dentro do kit de divulgacao.

### Criterio de aceite

- Restaurante consegue divulgar link proprio e medir retorno.

Evidencia:

- 2026-06-10: Fatia 1 adicionou kit de links rastreaveis em Cardapio Digital > QR Code, com presets para Instagram bio, Instagram stories, Google Business, WhatsApp status, QR delivery e campanha personalizada. O kit gera URL com UTM, QR Code da campanha, texto pronto para compartilhamento e atalho para o relatorio de conversao por origem.
- 2026-06-10: Fatia 2 adicionou resumo de resultado dos ultimos 30 dias no kit de divulgacao, destacando visitas, pedidos, conversao e receita do canal selecionado, alem de ranking das principais origens.

---

## Bloco 18 — Central de suporte e onboarding

Prioridade: P2  
Objetivo: reduzir dependencia de implantacao manual.

### Escopo MVP

- [ ] Checklist dentro do app: dados do restaurante, produtos, QR, pedido teste.
- [ ] Tutoriais curtos por tela.
- [ ] Estado de progresso da implantacao.
- [ ] Botao de suporte com contexto da tela.
- [ ] Base de problemas comuns.

### Criterio de aceite

- Novo restaurante entende o proximo passo sem call para tudo.
- Suporte recebe contexto suficiente para resolver mais rapido.

Evidencia:

- Pendente.

---

## Regras de qualidade para cada bloco

Antes de marcar um bloco como concluido:

- [ ] RLS revisada em tabelas novas.
- [ ] Migrations aplicadas e documentadas.
- [ ] Types Supabase/TypeScript atualizados.
- [ ] UI testada em desktop e mobile quando aplicavel.
- [ ] Fluxo principal validado com usuario dono.
- [ ] Permissoes de funcionario validadas quando aplicavel.
- [ ] Erros mostram mensagem clara para usuario final.
- [ ] Logs nao expõem dados sensiveis.
- [ ] Testes unitarios/E2E ou roteiro manual atualizado.
- [ ] `docs/QA_ROTEIROS_MANUAIS.md` atualizado se o fluxo afetar piloto.
- [ ] Este documento atualizado com evidencia.

---

## Registro de progresso

| Data | Bloco | Status | Evidencia/observacao |
| --- | --- | --- | --- |
| 2026-05-28 | Plano inicial | Criado | Backlog competitivo registrado para execucao incremental. |
| 2026-05-28 | Bloco 1 — CRM de clientes | Implementado tecnicamente | Migration + tela `/clientes` + servico frontend. Pendente aplicar migration e validar no piloto. |
