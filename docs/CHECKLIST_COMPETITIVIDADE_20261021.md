# Pubfy — Checklist de competitividade

Revisão: **21/10/2026**  
Objetivo: orientar as próximas entregas com base no que o Pubfy já possui e nas lacunas frente a sistemas brasileiros para restaurantes.

## 1. Diagnóstico executivo

O Pubfy já vai além de um cardápio digital: possui canal próprio, PDV, mesas, cozinha, CRM, fidelidade, campanhas, estoque com insumos e fichas técnicas, relatórios, multiunidade, onboarding e integrações. **Não vale reconstruir esses módulos.**

O principal desafio é transformar essa cobertura em operação confiável e comprovada. As prioridades são **integridade do caixa, validação de integrações em turnos reais, fiscal, impressão e continuidade offline**. Depois, aprofundar salão, delivery, gestão de custos e automação de recompra.

Direção sugerida, não uma decisão comercial já aprovada: **canal próprio + operação integrada + relacionamento com clientes**, para pequenos e médios restaurantes. Não tentar reproduzir de uma vez todas as funções de um ERP de grandes redes.

### Limites da análise

- Revisão documental e de código, acompanhada de comparação com páginas oficiais de fornecedores.
- Existência no código não comprova migração aplicada, configuração externa correta ou uso bem-sucedido em produção.
- Não foram executados novos pedidos, cobranças, emissões fiscais, testes em impressoras ou testes autenticados com a conta do proprietário nesta auditoria.
- Não foram verificadas disponibilidade contratual, homologação do Pubfy por fornecedores, preços dos concorrentes ou indicadores reais de suporte.
- Os registros de testes antigos são históricos; não representam uma nova execução nesta revisão.

## 2. Como acompanhar

- `[ ]` Pendente: implementação, correção ou validação ainda necessária.
- `[~]` Parcial: há base implementada, mas faltam complementos ou prova operacional.
- `[x]` Concluído **com evidência do critério de aceite**; não marcar apenas porque uma tela existe.
- **P0:** evita perdas/erros ou bloqueia venda como PDV completo.
- **P1:** aumenta eficiência, margem ou recompra.
- **P2:** expansão de nicho, condicionada à demanda.
- Esforço **pequeno/médio/grande** é relativo, não prazo ou orçamento contratado.
- Ao iniciar um bloco, registrar responsável e dependências. Ao concluir, anexar data, evidência, testes e limites.

Este checklist é a fila atualizada de prioridades. O histórico de entregas permanece em `docs/PLANO_EVOLUCAO_COMPETITIVA.md`; seus blocos M1–M10 são referenciados abaixo, sem apagar evidências antigas.

## 3. Base existente: aproveitar, não reimplementar

| Frente | Base encontrada | Próximo salto |
| --- | --- | --- |
| Cardápio e venda direta | Produtos, categorias, promoções, cupons, adicionais, combos, upsell e acompanhamento | Performance, cartão online e medição de resultados |
| PDV, mesas e cozinha | Criação transacional de pedidos, status, mesas/áreas, KDS e notificações | Caixa confiável, comanda dividida e operação em pico |
| Caixa | Abertura, declaração, forma por pedido, conferência e análise da foto por IA | Recebimentos por turno, cálculo protegido, rateio e auditoria |
| Relacionamento | CRM, opt-in, importação CSV, fidelidade/cashback, avaliações e recuperação de carrinho | Automação recorrente comprovada e atribuição de recompra |
| Estoque e margem | Insumos, ficha técnica, baixa/estorno, reposição, inventário e margem estimada | Compras, fornecedores, perdas e CMV real |
| Redes | Troca de unidade, consolidado, matriz de cardápio e acesso por unidade | Metas, alertas e auditoria da sincronização |
| Implantação | Onboarding, saúde no admin, importação e central de ajuda | Validação ponta a ponta, anexos e acompanhamento automático |
| Continuidade | PWA, catálogo local e fila de pedidos de balcão/mesa com revisão de conflito | Piloto em dois dispositivos e diagnóstico central |
| Integrações | Pagar.me, iFood, Resend e WhatsApp; correções recentes do iFood no código | Homologação real, monitoramento e recuperação de falhas |

**Atenção:** cartão para pagar a assinatura do Pubfy não é cartão no pedido do cliente. A função atual de pagamento do cardápio público aceita **somente PIX online**.

## 4. Checklist priorizado

### C01 — Integridade e permissões do caixa

**P0 · correção/ampliação · esforço médio · referência M7**

Achados: o caixa busca pedidos por data de criação, exclui apenas cancelados, limita a leitura a 1.000 pedidos e recebe os totais de fechamento calculados no navegador. As políticas existentes isolam o restaurante, mas não exigem uma permissão específica de gestão de caixa. Isso é risco de consistência e de acesso dentro da própria loja, não prova de vazamento entre restaurantes.

- [~] Separar venda realizada, valor efetivamente recebido, pagamento pendente e repasse de canal externo; conciliar recebimentos do turno, inclusive pedido antigo pago agora. **2026-10-21:** separação implementada no Caixa e na IA, por `created_at`/`paid_at`; recebimentos externos brutos ficam fora da gaveta. Falta comprovar repasses bancários e validar turno real autenticado (ver `FECHAMENTO_CAIXA.md`).
- [~] Vincular recebimentos ao caixa/turno e produzir fechamento definitivo com cálculo e congelamento do conjunto de dados no servidor, sem aceitar totais financeiros arbitrários do navegador. **2026-10-26:** RPC `close_cash_register_session` recalcula no servidor, grava corte (`closing_until`), lista congelada (`closing_snapshot`) e diferença; gatilho bloqueia fechar ou alterar totais do sistema fora dela. Falta: vínculo explícito pedido→caixa e validação em turno real.
- [~] Remover truncamento de 1.000 pedidos mediante agregação/paginação; proteger fechamento contra recebimentos simultâneos e reenvios. **2026-10-26:** leitura e fechamento agregam no banco, sem limite de linhas; bloqueio da linha do caixa impede fechamento duplo/reenvio. Falta teste de carga e de concorrência real.
- [~] Exigir permissão específica para abrir, movimentar e fechar caixa, também na camada de dados; auditar correções de forma de pagamento e exceções. **2026-10-26:** permissão `cash_manage` exigida nas regras do banco (abrir/atualizar/fechar), na rota e no menu; funcionários com PDV migrados para não perder acesso; tabela imutável `cash_audit_events` registra troca de forma de pagamento e fechamentos. Consulta implementada em **Caixa → Auditoria do caixa**, com período, ação, responsável, valores antes/depois, paginação e falha explícita; testes de serviço cobrem escopo e leitura. Falta: aprovação de exceções e teste real com colaborador sem permissão. Ver `FECHAMENTO_CAIXA.md`, seção C01.4.

**Aceite:** pedido criado no turno anterior e recebido agora entra uma vez; pedido não pago não vira dinheiro recebido; online/marketplace não inflacionam gaveta; mais de 1.000 registros não reduzem o total; colaborador sem permissão é bloqueado mesmo fora da tela.

**Dependências:** definir regra de competência versus recebimento, corte de turno e tratamento de canais externos antes de implementar.

### C02 — Pagamento misto e movimentos auditáveis

**P0 · ampliar base existente · esforço médio · referência M7**

- [~] Substituir o rótulo “Misto” por parcelas com forma, valor, confirmação e eventual estorno; a soma deve bater com o total líquido do pedido.
- [~] Registrar sangria e suprimento como movimentos individuais, com operador, horário, motivo e comprovante; hoje há declaração agregada de retiradas, não um livro completo de movimentos.
- [ ] Gerar relatório de fechamento por forma, recebimento, operador e divergência, com exportação/impressão e aprovação de exceções.

**Aceite:** pedido de R$ 100 recebido com R$ 40 em dinheiro e R$ 60 em PIX aparece corretamente nas duas formas; retirada/suprimento altera o saldo esperado sem virar venda; fechamento histórico permanece verificável.

### C03 — Integrações e piloto com evidência real

**P0 · validação e robustez · esforço médio · referências M1, M2 e M5**

- [~] Homologar PIX do cliente e assinatura Pagar.me, incluindo confirmação, expiração, cancelamento, estorno e webhook duplicado/fora de ordem; há base e testes simulados.
- [~] Homologar iFood após as correções recentes: importar, mapear itens, avançar status, cancelar com motivo válido e conferir baixa/estorno sem duplicidade.
- [~] Validar WhatsApp e Resend com conta/domínio reais, desconexão, reenvio, consentimento e falha que não bloqueia o pedido.
- [ ] Consolidar saúde das integrações: última execução, último sucesso, falhas pendentes, alerta e reprocessamento seguro; aproveitar logs e painéis existentes.
- [ ] Executar turno assistido completo com dono, caixa e cozinha, registrando pedidos, recebimentos, diferenças e incidentes; repetir após correções relevantes.

**Aceite:** um turno real é conciliado e rastreável; falhas externas são visíveis e recuperáveis; reprocessamento não cria pedido, baixa de estoque ou cobrança duplicada.

**Dependências:** credenciais finais, lojas/provedores habilitados, disponibilidade da equipe e autorização para transações reais. Não tratar como trabalho exclusivamente de programação.

### C04 — Fiscal/NFC-e via parceiro

**P0 para PDV completo · novo módulo · esforço grande · referência M3**

- [ ] Escolher parceiro fiscal e delimitar estados, regime, certificado e produtos/documentos atendidos com apoio contábil.
- [ ] Criar configuração fiscal e emissão a partir de pedido elegível, com chave, protocolo, status e guarda de XML/DANFE.
- [ ] Implementar rejeições acionáveis, reenvio idempotente, cancelamento e contingência conforme regras do parceiro/estado.
- [ ] Homologar emissão e cancelamento; validar certificado, limites e acesso aos documentos.

**Aceite:** uma nota autorizada e um cancelamento são comprovados no ambiente apropriado; falha não duplica nota nem desaparece; operação sabe o procedimento de contingência.

**Dependências:** contrato/API do parceiro, certificado e dados tributários reais. Comprovante do PDV não é documento fiscal. Não prometer cobertura nacional sem homologação.

### C05 — Impressão e offline confiáveis

**P0 para operação presencial · ampliar base · esforço grande · referências M6 e M7**

- [~] Homologar impressoras físicas 58 mm e 80 mm, incluindo acentos, adicionais, observações, vias, reimpressão e falta de papel.
- [~] Encaminhar cada setor/via à impressora certa, com fila e status de envio; avaliar ponte local/parceiro porque `window.print()` não comprova impressão física.
- [~] Testar pedidos de mesa offline em dois dispositivos, alteração concorrente de mesa/estoque, reconexão e fechamento de turno.
- [ ] Criar relatório legível de divergências de sincronização e monitoramento central por restaurante/dispositivo, sem expor dados de outra loja.

**Aceite:** queda curta não perde nem duplica pedido; conflito exige revisão; impressora indisponível não bloqueia venda e a via pode ser reemitida com identificação.

**Limite:** APIs, pagamentos online e marketplaces não passam a funcionar offline. App Android/iOS de loja não resolve por si só os conflitos e fica para etapa posterior.

### C06 — Segurança, qualidade e desempenho em escala

**P0 · ampliar proteção existente · esforço médio/grande · referências M4, M5 e M6**

- [~] Completar testes dos fluxos críticos: recebimento misto, caixa, pagamento público, estorno, iFood/WhatsApp, troca de unidade e conflitos offline; distinguir simulação de homologação.
- [ ] Confirmar ambiente de testes separado, alertas com responsável, backup/restauração praticados e procedimento de retorno de versão.
- [~] Revisar permissões financeiras, histórico de operações sensíveis e tratamento de dados pessoais; testar isolamento entre lojas e filiais.
- [ ] Tornar métricas confiáveis em volumes maiores: paginação/agregação, erro explícito ao carregar itens, fuso horário do restaurante e reconciliação com os totais de origem.
- [~] Medir cardápio/checkout em aparelhos e rede móvel reais; corrigir gargalos, contraste, foco e formulários observados, sem redesenhar tudo sem evidência.

**Aceite:** testes de regressão impedem as falhas financeiras essenciais; recuperação de backup é comprovada; relatórios não escondem erro nem truncam dados; fluxo de compra é utilizável em celular real.

### C07 — Salão e comandas completas

**P1 · novo fluxo sobre mesas/PDV · esforço médio/grande**

- [ ] Transferir itens ou comanda entre mesas e juntar/dividir contas, preservando pedido, operador e histórico.
- [ ] Permitir pagamento parcial e conta por pessoa/itens, reutilizando os recebimentos do C02.
- [ ] Acrescentar taxa de serviço opcional e descontos autorizados, com distribuição clara e auditoria.
- [ ] Criar fluxo de garçom orientado a comanda ativa, envio incremental à cozinha e histórico de alterações/cancelamentos de itens.

**Aceite:** grupo muda de mesa ou paga separadamente sem perder itens, duplicar produção ou liberar mesa com saldo pendente. Cadastro/status de mesa existente não é equivalente a esse fluxo.

### C08 — Entrega e cartão online

**P1 · ampliar pedido público/delivery · esforço grande**

- [ ] Implementar cartão no pedido público, com tokenização adequada, confirmação assíncrona, idempotência, reembolso e homologação Pagar.me; não armazenar dados sensíveis do cartão.
- [ ] Criar despacho com entregador, atribuição de pedido, saída, entrega e comprovação; começar simples, antes de geolocalização contínua/roteirização.
- [~] Revisar a base de taxa/prazo de entrega e acrescentar cobertura validada por região, limite e exceção, evitando prometer endereço não atendido.
- [ ] Medir atrasos por etapa/canal e informar exceções ao cliente e à equipe.

**Aceite:** cliente paga e acompanha sem duplicidade; atendente identifica quem leva cada pedido e qual está atrasado; endereço fora de cobertura é bloqueado de forma clara.

**Dependências:** habilitação contratual do cartão, custos/antifraude do provedor e política real de entrega da loja.

### C09 — Compras, perdas e resultado financeiro real

**P1 · ampliar insumos/ficha técnica/financeiro · esforço grande · referências M10 e blocos 10/14**

- [ ] Cadastrar fornecedores, compras e entradas com custo, unidade/conversão e atualização auditável.
- [ ] Registrar perdas/descarte, validade/lote onde necessário e inventário com responsabilidade de conferência.
- [ ] Calcular CMV real e variação de custo a partir de compras, estoque e perdas; manter margem estimada separada quando faltar dado.
- [ ] Criar contas a pagar/receber, taxas/repasses reais e DRE gerencial simplificada, com exportação e sem chamar estimativa de lucro líquido.

**Aceite:** loja explica a diferença entre custo da ficha, consumo esperado, perda e resultado; receita online não é confundida com repasse disponível; números batem com registros de origem.

### C10 — Recompra mensurável, não só campanhas

**P1 · ampliar CRM/campanhas/funil · esforço médio · blocos 3, 8, 12, 13 e 16**

- [~] Comprovar e, onde necessário, completar execução recorrente dos gatilhos de campanhas sem depender de abrir a tela ou enviar manualmente.
- [ ] Unificar limite de frequência, consentimento e descadastro entre campanhas, recuperação e WhatsApp; avaliar canal oficial conforme contrato/políticas do provedor.
- [ ] Restaurar carrinho por link de recuperação com validação atual de preço, estoque, cupom e consentimento.
- [ ] Medir conversão de clientes importados por coorte e primeira compra após importação, além da taxa histórica atual; não atribuir venda antiga à importação.
- [ ] Transformar insights do copiloto em tarefas mensuráveis e medir receita/conversão por regra de upsell; não prometer que toda receita atribuída é incremental.
- [ ] Para restaurantes que anunciam, acrescentar configuração consentida de Meta Pixel/GA4 e validar eventos de compra sem duplicidade; o funil próprio existente deve ser preservado.
- [ ] Evoluir recência, frequência e gasto para segmentação RFV explicável quando houver histórico suficiente; não apresentar a segmentação atual como um motor RFV já validado.

**Aceite:** gatilho envia uma única comunicação elegível, descadastro interrompe novos envios e recompra posterior é rastreada. CRM, cashback, upsell e funil já existem; evolução é automação e qualidade da medição.

### C11 — Implantação, suporte e prova comercial

**P1 · ampliar base existente · esforço pequeno/médio · referências M8 e M9**

- [~] Validar onboarding e saúde no admin com conta real, desde importação até primeiro pedido e equipe treinada; telas/RPCs já existem.
- [~] Completar anexos privados nos chamados, notificações de resposta e acompanhamento por responsável/prazo; comentários e histórico não devem ser recriados.
- [~] Automatizar lembretes úteis dos primeiros sete dias para cliente/atendimento, com consentimento e sem duplicar avisos.
- [ ] Definir matriz comercial por plano: incluído, beta, parceiro necessário e fora do escopo; coletar caso real com vendas, tempo de implantação e incidentes.

**Aceite:** uma nova loja publica cardápio e faz primeiro pedido com orientação clara; chamado chega com evidência e pode ser acompanhado; comercial não vende offline completo, TEF ou fiscal inexistente.

**Dependências:** responsável pelo suporte e dados consentidos do piloto. Preços atuais não devem ser alterados só para copiar concorrentes.

### C12 — Expansões condicionadas à demanda

**P2 · selecionar após P0/P1 · esforço variável · referências M10 e bloco 15**

- [ ] Reservas por horário/capacidade, confirmação e política de não comparecimento, integradas à lista de espera existente.
- [ ] Metas e alertas por unidade, comparativos e auditoria das sincronizações; multiunidade básica já existe.
- [ ] Totem de autoatendimento web/tablet com pagamento e fila de cozinha, apenas quando houver loja piloto interessada.
- [ ] TEF/POS integrado e conciliação automática com adquirente, após definir parceiro, dispositivos e homologação.
- [ ] App de entregador/roteirização, integração mais profunda com Google e Android/iOS nativo somente com caso de uso e retorno claros.

**Aceite:** cada expansão tem cliente interessado, escopo, custo de manutenção e resultado esperado antes de começar. Não marcar todos esses itens como obrigatórios para todo restaurante.

## 5. Ordem prática de execução

1. **C01 + C02:** corrigir caixa/recebimentos e viabilizar pagamento misto. Melhor próximo desenvolvimento por valor diário e risco identificado.
2. **C03 + C06:** preparar e executar piloto real; proteger o que já existe. Começar seleção fiscal do C04 em paralelo, pois depende de terceiros.
3. **C04 + C05:** fiscal e operação presencial confiável, se a oferta for PDV completo.
4. **C07 + C08:** aprofundar salão ou delivery conforme o perfil dos restaurantes, sem obrigar ambas as frentes ao mesmo tempo.
5. **C09 + C10 + C11:** custos reais, recompra mensurável e implantação escalável.
6. **C12:** escolher expansões pelo retorno e pela demanda, não por quantidade de telas.

**Porta de liberação:** não afirmar prontidão comercial ampla nesta análise. Exigir piloto documentado, conciliação correta, integrações necessárias homologadas, proteção de dados, suporte e recuperação praticados.

## 6. Evidências técnicas e divergências documentais

| Evidência | Consequência para o checklist |
| --- | --- |
| `src/services/cashRegisterService.ts`: `fetchSessionSales` usa `created_at`, exclui cancelados e limita a 1.000; `closeSession` atualiza payload recebido | C01 é correção prioritária, não mera melhoria visual |
| `src/pages/FechamentoCaixa.tsx`: atualiza leitura antes de fechar, mas calcula resumo no navegador | Evitar afirmar ausência de atualização; o que falta é cálculo/congelamento autoritativo e vínculo ao recebimento |
| Migration `20261008235937_e9ebdacb-4e3a-44f6-ac03-0be9e6edffa6.sql`: políticas por restaurante e validação de valores/status | Há isolamento de loja; falta permissão específica e fechamento protegido |
| `src/lib/paymentMethods.ts`: “misto” é classificação, não lista de parcelas | C02 precisa rateio real |
| `supabase/functions/pagarme-create-order-payment/index.ts`: rejeita forma diferente de `pix` | Cartão público é pendente; cartão da assinatura é outro fluxo |
| `src/services/metricsService.ts`: conversão cruza telefones com pedidos históricos; leitura de itens não propaga erro e consultas não têm paginação explícita | C06/C10 precisam confiabilidade de volume, erro e coorte |
| `supabase/functions/_shared/ifood-poll-core.ts`: endpoint atual, categorias ALL, mapeamento e consumo/estorno de estoque | Não reimplementar as correções do iFood; homologar e observar |
| `src/features/pdv/services/pdvOfflineOrderQueueService.ts` e `src/hooks/usePrint.ts` | Fila local/conflitos e impressão no navegador existem; não equivalem a fila central ou confirmação de impressão física |
| `src/pages/admin/AdminOnboarding.tsx` e serviços de progresso/saúde do onboarding | Usar implementação atual, não listas antigas que dizem faltar a tela |

Alguns documentos históricos ficaram contraditórios com as entregas posteriores:

- `docs/INTEGRACOES_ESTOQUE.md` ainda descreve iFood sem mapeamento/baixa; há mapeamento e baixa no código atual.
- `docs/FECHAMENTO_CAIXA.md` mantém um limite antigo de ausência de forma por pedido, corrigido em seção posterior do próprio documento.
- Blocos antigos de PWA/onboarding ainda listam como pendentes itens já entregues em fatias posteriores.
- A marcação de “sangria/suprimento” concluída no plano não comprova movimentos individualizados de suprimento no caixa atual.

**Regra desta revisão:** preferir evidência atual ao texto antigo, sem converter automaticamente implementação em homologação. Atualizar cada documento afetado quando executar seu bloco.

## 7. Referências de mercado

Fontes oficiais consultadas em 21/10/2026. São ofertas declaradas pelos fornecedores, não testes independentes; recursos podem depender de plano, módulo adicional, parceiro e contrato. A comparação não é um ranking de qualidade, preço ou participação de mercado.

| Sistema | Oferta pública verificada | Lacuna/oportunidade para o Pubfy |
| --- | --- | --- |
| Saipos | CRM conectado ao PDV, classificação RFV e campanhas WhatsApp de aniversário, boas-vindas e reativação; app com visão por loja/consolidada | Aprofundar jornadas mensuráveis e canal de mensagens, não recriar CRM ou multiunidade |
| Consumer/MenuDino | Campanhas WhatsApp segmentadas/agendadas; fidelidade por pontos/carimbos; cadastro de cardápio e treinamento assistidos | Garantir orquestração e implantação confiáveis; carimbos são alternativa opcional ao cashback, não ausência de fidelidade no Pubfy |
| Anota AI | Cupons, cashback configurável por dia, Meta Pixel e relatórios com filtro/comparação de períodos | Integração de anúncios e regras de campanha podem agregar valor; cupons, cashback e relatórios básicos já existem no Pubfy |
| Goomer | Planos com CRM, cupons, chatbot, fidelidade, venda sugestiva, e-mail e Google Analytics conforme pacote | Explicitar oferta/limites e medir aquisição; botão de WhatsApp não equivale a automação de CRM |

### Links oficiais

- Saipos CRM: https://saipos.com/sistema/saipos-crm
- Saipos app de gestão: https://saipos.com/sistema/app-de-gestao
- Consumer campanhas: https://ajuda.programaconsumer.com.br/como-utilizar-o-modulo-de-campanhas-inteligentes/
- Consumer fidelidade: https://ajuda.programaconsumer.com.br/como-controlar-cartoes-de-fidelidade-em-seu-restaurante-no-programa-consumer/
- Consumer implantação/oferta: https://www.consumer.com.br/
- Anota AI marketing: https://anota.ai/home/funcionalidade/marketing-para-restaurante/
- Anota AI relatórios: https://anota.ai/ajuda/relatorios/
- Goomer planos: https://goomer.com.br/planos
- Goomer CRM: https://ajuda.goomer.com.br/goomergo/painel/crm/clientes

**Leitura estratégica:** quantidade de módulos não basta. Caixa correto, implantação rápida, retorno mensurável e resolução de falhas são os pontos que precisam de prova no Pubfy. A posição relativa em fiscal, hardware e continuidade foi inferida da auditoria do Pubfy e do segmento PDV, não de testes práticos dos concorrentes.

## 8. Registro de execução

| Data | ID | Responsável | Status | Evidência e próximos passos |
| --- | --- | --- | --- | --- |
| 2026-10-21 | Auditoria | — | Checklist elaborado | Leitura de código/documentação e comparação de mercado; nenhum novo recurso implementado ou operação real executada |
| 2026-10-21 | C01.1 | Lovable (implementação); responsável pelo piloto a definir | Parcial `[~]` | Migrações aplicadas: RPC invoker por restaurante e preservação de `paid_at` nas três tabelas; separação no Caixa/IA e totais históricos distintos. Vitest 17/17; build OK; RPC sem acesso anônimo e sem bypass de RLS. E2E simulado criado, execução bloqueada por Chromium ausente na versão do runner. Sem turno autenticado, repasse real ou teste concorrente. |

Para cada entrega futura: preencher ID, responsável, data, testes, evidência da operação e limitações restantes. Fechar os subitens individualmente; o bloco só fica `[x]` após cumprir seu aceite.
| 2026-10-26 | C01.2/C01.3 | Lovable (implementação) | Parcial `[~]` | Migração aplicada: fechamento definitivo no servidor com corte, conjunto congelado, bloqueio contra fechamento duplo e gatilho contra totais do navegador. Tela Caixa usa a nova função. Sem turno autenticado nem teste concorrente/volume. Próximo: permissão específica de caixa (C01.4). |
| 2026-10-26 | C01.4 | Lovable (implementação) | Parcial `[~]` | Migrações aplicadas: enum `cash_manage`, políticas do caixa por permissão, auditoria automática. Tipos/compilação OK. Sem teste autenticado com colaborador bloqueado. |
