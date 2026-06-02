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
- [ ] Relatorio separado: vendas iFood x vendas canal proprio.

### Criterio de aceite

- Pedido iFood mapeado baixa estoque como PDV/cardapio publico.
- Pedido nao mapeado nao quebra operacao e aparece para correcao.
- Dono entende quanto vendeu em marketplace versus canal proprio.

Evidencia:

- 2026-06-02: Bloco 6 iniciado com tabela `ifood_item_mappings`, registro automatico de itens observados no polling iFood, tentativa de vinculo durante importacao de pedidos e aba "Mapeamento" em `/ifood-integracao` para associar item externo a produto interno.
- 2026-06-02: Credenciais do app iFood foram centralizadas no Super Admin em `ifood_saas_app`; restaurantes configuram apenas a loja/Merchant ID.
- 2026-06-02: Baixa automatica de estoque conectada ao polling iFood para itens mapeados, reaproveitando `apply_stock_for_order`; cancelamentos/status externos cancelados estornam via `revert_stock_for_order`. Se faltar saldo, o pedido importado nao e perdido e o erro fica registrado no evento/log para correcao operacional.
- Pendente: criar relatorio comparando iFood x canal proprio.

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

- [ ] Gerar resumo diario automatico.
- [ ] Sugerir produto parado, produto campeao e queda de vendas.
- [ ] Sugerir campanha com base em clientes inativos.
- [ ] Sugerir ajuste de cardapio/promocao.
- [ ] Mostrar "por que estou vendo isso" com dados usados.
- [ ] Nunca executar mudanca automaticamente sem confirmacao do dono.

### Criterio de aceite

- Dono recebe 3 a 5 recomendacoes praticas por semana.
- Cada recomendacao tem acao clara: criar cupom, ajustar produto, divulgar link, revisar estoque.

Evidencia:

- Pendente.

---

## Bloco 9 — Offline inicial do PDV

Prioridade: P1  
Objetivo: reduzir risco quando a internet oscila.

### Escopo MVP

- [ ] Cache local de produtos, categorias e mesas.
- [ ] Mostrar ultima sincronizacao.
- [ ] Criar fila local de pedidos de balcao.
- [ ] Sincronizar quando internet voltar.
- [ ] Adicionar `client_order_id` para evitar duplicidade.
- [ ] Mostrar painel de pedidos pendentes de sincronizacao.

### Fora do MVP

- Pagamento online offline.
- iFood offline.
- Edicao de cardapio offline.
- Relatorios offline.

### Criterio de aceite

- Operador consegue registrar pedido de balcao sem internet e sincronizar depois sem duplicar.
- Conflitos aparecem para revisao, nao sao silenciosos.

Evidencia:

- Pendente.

---

## Bloco 10 — Dashboard financeiro e margem

Prioridade: P1  
Objetivo: provar valor economico do Pubfy.

### Escopo MVP

- [ ] Receita por canal: PDV, cardapio proprio, WhatsApp, iFood.
- [ ] Taxas estimadas de marketplace/gateway.
- [ ] Ticket medio por canal.
- [ ] Produtos com maior receita.
- [ ] Margem estimada quando houver custo/ficha tecnica.
- [ ] Calculadora de economia do canal proprio.

### Criterio de aceite

- Dono consegue ver se o canal proprio esta crescendo.
- Comercial consegue usar dados reais para provar economia.

Evidencia:

- Pendente.

---

## Bloco 11 — Avaliacoes e NPS

Prioridade: P1  
Objetivo: medir qualidade e recuperar experiencias ruins.

### Escopo MVP

- [ ] Enviar pesquisa pos-pedido.
- [ ] Coletar nota e comentario.
- [ ] Alertar dono em nota baixa.
- [ ] Mostrar media por periodo.
- [ ] Associar avaliacao ao pedido e ao cliente.

### Criterio de aceite

- Restaurante identifica clientes insatisfeitos antes de perder recompra.
- Avaliacao nao atrapalha o fluxo principal de pedido.

Evidencia:

- Pendente.

---

## Bloco 12 — Abandono de carrinho

Prioridade: P1  
Objetivo: recuperar pedidos iniciados e nao concluidos.

### Escopo MVP

- [ ] Registrar carrinho iniciado com telefone quando informado.
- [ ] Detectar abandono apos janela configuravel.
- [ ] Criar lembrete por e-mail ou WhatsApp quando houver opt-in.
- [ ] Cupom opcional de recuperacao.
- [ ] Relatorio: abandonos, recuperados, receita recuperada.

### Criterio de aceite

- Restaurante consegue recuperar pelo menos parte dos pedidos iniciados.
- Mensagens respeitam consentimento e limite de frequencia.

Evidencia:

- Pendente.

---

## Bloco 13 — Cardapio inteligente e upsell

Prioridade: P1  
Objetivo: aumentar ticket medio.

### Escopo MVP

- [ ] Produtos em destaque por horario.
- [ ] Sugestao de adicionais no modal do produto.
- [ ] Combos sugeridos no carrinho.
- [ ] "Clientes tambem pedem" com base em dados reais quando houver volume.
- [ ] Regra manual como fallback.

### Criterio de aceite

- Dono consegue configurar upsell sem conhecimento tecnico.
- Cliente recebe sugestoes uteis sem poluir o checkout.

Evidencia:

- Pendente.

---

## Bloco 14 — Ficha tecnica e insumos

Prioridade: P2  
Objetivo: evoluir estoque para controle de custo real.

### Escopo MVP

- [ ] Cadastro de insumos.
- [ ] Unidade de medida.
- [ ] Receita/ficha tecnica por produto.
- [ ] Baixa de insumo por pedido finalizado.
- [ ] Custo estimado do produto.
- [ ] Margem bruta por produto.

### Criterio de aceite

- Restaurante consegue responder quanto custa vender cada produto principal.
- Baixa de insumo e auditavel e reversivel em cancelamento.

Evidencia:

- Pendente.

---

## Bloco 15 — Multiunidade/franquias

Prioridade: P2  
Objetivo: vender para redes pequenas e franquias.

### Escopo MVP

- [ ] Usuario com acesso a multiplos restaurantes.
- [ ] Troca de unidade no painel.
- [ ] Relatorio consolidado.
- [ ] Cardapio matriz opcional.
- [ ] Permissoes por unidade.

### Criterio de aceite

- Gestor de rede enxerga consolidado sem misturar dados indevidamente.
- RLS continua impedindo vazamento entre unidades.

Evidencia:

- Pendente.

---

## Bloco 16 — Funil e analytics de conversao

Prioridade: P2  
Objetivo: medir performance do canal proprio.

### Escopo MVP

- [ ] Visualizacoes do cardapio.
- [ ] Cliques em produto.
- [ ] Produto adicionado ao carrinho.
- [ ] Checkout iniciado.
- [ ] Pedido concluido.
- [ ] Conversao por campanha/origem.

### Criterio de aceite

- Dono consegue ver onde perde clientes no cardapio.
- Campanhas mostram origem e conversao.

Evidencia:

- Pendente.

---

## Bloco 17 — Integracoes Google e Instagram

Prioridade: P2  
Objetivo: aumentar aquisicao para o canal proprio.

### Escopo MVP

- [ ] Links rastreaveis para bio do Instagram.
- [ ] UTM por campanha.
- [ ] Kit de divulgacao com QR e link.
- [ ] Orientacao para Google Business Profile.
- [ ] Relatorio de pedidos por origem.

### Criterio de aceite

- Restaurante consegue divulgar link proprio e medir retorno.

Evidencia:

- Pendente.

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
