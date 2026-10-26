# Fechamento de caixa e conciliacao da maquininha

Entrega do bloco M7 (2026-10-08). Estrategia escolhida: **conciliacao manual estruturada**
em vez de integracao direta com adquirente (Stone, Cielo, PagSeguro etc.), que fica para
quando o piloto pedir TEF/POS integrado.

## O que foi entregue

- Tabela `cash_register_sessions` com RLS por restaurante (`get_user_restaurant_id()`).
- Apenas um caixa aberto por restaurante (indice unico parcial).
- Caixa fechado nao pode ser alterado (politica de update so para `status = 'open'`) nem apagado.
- Trigger de validacao: status valido, valores nao negativos, `closed_at`/`closed_by` automaticos.
- Tela `/caixa` (menu **Caixa**, permissoes `pdv_access` ou `orders_manage`):
  - abertura com troco inicial;
  - vendas do sistema desde a abertura (pedidos nao cancelados);
  - declaracao de dinheiro contado, sangrias, PIX, credito, debito e voucher;
  - maquininha e lote/referencia do relatorio;
  - diferenca calculada em tempo real (Conferido / Sobra / Falta) e observacoes;
  - historico dos ultimos 15 fechamentos.
- Regra de calculo isolada em `src/lib/cashRegister.ts` com testes (`cashRegister.test.ts`, 4/4).

## Formula

```text
vendas declaradas = (dinheiro contado - troco inicial + sangrias) + PIX + credito + debito + voucher
diferenca         = vendas declaradas - vendas registradas no sistema
```

O total do sistema e recalculado no momento do fechamento para evitar valor desatualizado.

## Como testar no piloto

1. Acesse **Caixa** e abra com o troco (ex.: R$ 100,00).
2. Faca pedidos no PDV.
3. Volte em **Caixa**: confira **Vendas no sistema**.
4. Preencha dinheiro contado e os totais do relatorio da maquininha.
5. Verifique o selo de diferenca e feche o caixa.
6. Confirme o fechamento em **Ultimos fechamentos**.

## Limites conhecidos

- Pedidos antigos podem não ter forma ou data de pagamento; não são convertidos automaticamente em recebimentos.
- Sem integracao automatica com adquirente/TEF.
- Sem relatorio impresso do fechamento (pode ser exportado em versao futura).

## Forma de pagamento por pedido (2026-10-08)
- No PDV (Histórico de pedidos), cada pedido tem o campo **Forma de pagamento**: Dinheiro, PIX, Crédito, Débito, Voucher ou Misto.
- **Finalizar pedido** só libera depois de escolher a forma. Em pedido finalizado, a forma pode ser corrigida.
- Pedidos pagos online (Pagar.me) aparecem como "Pago online" e ficam fora da gaveta e da maquininha.
- Gravação pela função segura `set_pos_order_payment` (só pedidos do próprio restaurante, não cancelados, sem alterar pagamento online); marca `payment_status = paid` e `paid_at`.
- Em **Caixa**, o quadro "Conferência por forma de pagamento" compara sistema × declarado em cada forma (dinheiro do sistema × gaveta − troco + sangrias) e lista pedido a pedido; clicar numa forma filtra a lista.
- Pedidos "Misto" e "Sem forma registrada" aparecem como **Explicar**; o caixa avisa quantos estão sem forma.
- Regra em `src/lib/paymentMethods.ts` (testes em `paymentMethods.test.ts`).

## C01.1 — Vendas versus recebimentos (2026-10-21)

**Status `[~]`: código e migrações entregues; piloto real e repasses ainda pendentes.**

- **Vendas no sistema:** pedidos não cancelados criados no turno. É competência da venda, não prova de entrada de dinheiro.
- **Recebido no caixa:** pedidos com `payment_status = paid`, data `paid_at` no turno e forma local identificada. Pedido antigo pago agora entra uma vez; pagamento já recebido antes não entra novamente.
- **Pagamento pendente no turno:** pedidos criados no turno sem confirmação; `not_required` e `failed` não comprovam recebimento.
- **Recebido por canal externo:** pagamentos confirmados por provedor externo, em valor bruto; não entram na gaveta ou na declaração local. A transferência bancária, taxas e valor líquido ainda não são comprovados.
- **A revisar:** misto sem parcelas, pagamento sem data, coleta iFood desconhecida e cancelamento/estorno após cobrança. Aparecem em lista e exigem justificativa no fechamento; não são imputados automaticamente às formas locais.

```text
recebimentos declarados = gaveta - troco + sangrias + PIX + crédito + débito + voucher
diferença = recebimentos declarados - recebimentos locais confirmados
gaveta esperada = troco inicial + recebimentos confirmados em dinheiro - sangrias
período = [abertura, instante da consulta), usando o corte retornado pelo servidor
```

A consulta `get_cash_shift_activity` é somente leitura, SECURITY INVOKER, restrita ao restaurante via `get_user_restaurant_id()`, e retorna pedidos por criação OU pagamento sem o limite de 1.000 linhas do endpoint de tabelas. UI e IA reutilizam `cash-shift-activity.ts`. Notificações repetidas não mudam a primeira `paid_at`: triggers em `orders`, `order_payments` e `delivery_orders`. Datas antigas potencialmente incorretas não foram reconstruídas.

Novos fechamentos guardam vendas, recebimentos locais, pendentes e externos separadamente; históricos anteriores mantêm recebimentos nulos com identificação de histórico sem classificação.

**Evidências:** 17 testes Vitest aprovados (10 cenários de atividade, 5 de cálculo e 2 de forma), migrações aplicadas, acesso anônimo à RPC negado, invoker sem bypass de RLS, três triggers existentes, build OK e função de IA implantada. E2E simulado em `e2e/cash-shift.spec.ts` criado; runner bloqueado pela ausência do Chromium da sua versão. Tentativa de navegador sem sessão ficou no carregamento inicial; não valida a tela autenticada. Nenhuma cobrança ou alteração de pedidos reais foi executada.

**Piloto pendente:** abra um turno, receba pedido antigo de R$ 100 em dinheiro, registre venda pendente de R$ 50 e pagamento externo de R$ 80; confira recebimento local R$ 100, pendente R$ 50 e externo R$ 80. Com troco R$ 100 e gaveta R$ 200, diferença deve ser zero. Feche e confira o histórico.

**Próximos itens, fora desta entrega:** vinculação dos recebimentos ao caixa, congelamento/cálculo definitivo no servidor, concorrência, permissões financeiras, parcelas do misto e repasses bancários efetivos. A leitura sem truncamento não comprova capacidade em volume extremo. Permanecem 219 apontamentos de segurança anteriores; esta entrega não adicionou novos.

## C01.4 — Consulta da auditoria (2026-10-26)

**Status `[~]`: consulta implementada; aprovação de exceções e piloto autenticado pendentes.**

- Em **Caixa → Auditoria do caixa**, consulte correções de forma de pagamento e fechamentos, mesmo sem turno aberto.
- Filtros de data inicial/final e ação; paginação de 25 eventos com contagem do período, sem truncar o histórico.
- Cada evento mostra data, responsável disponível, referência do pedido/caixa e detalhes dos valores anteriores e posteriores; fechamento inclui recebimento, diferença e observações registrados.
- Somente leitura: não apaga, edita ou aprova eventos. As regras existentes da tabela restringem acesso por restaurante e permissões; a página mantém a exigência `cash_manage`.
- Eventos anteriores à implantação dos gatilhos não são reconstruídos. Responsável sem perfil acessível aparece como indisponível, não como Sistema. Datas seguem o horário local do navegador.
- Testes de serviço cobrem restaurante, período com limite final exclusivo, paginação, ação, identificação do operador e falha explícita. Testes de tela simulados não substituem operação real.
- Evidência desta fatia: 20 testes unitários aprovados (5 de consulta e 15 de regressão do caixa) e 1 E2E simulado aprovado, incluindo detalhes de correção, paginação e fechamento com diferença de R$ -20,00; build OK.

**Roteiro do piloto:** corrija uma forma de pagamento já registrada no PDV, feche o turno e consulte as duas ações no histórico; abra os detalhes, confira operador e valores e teste um colaborador sem `cash_manage`.

**Atualização das entregas anteriores:** cálculo definitivo e congelamento agora ocorrem em `close_cash_register_session`; abertura/fechamento exigem `cash_manage`. O vínculo explícito pedido→caixa, aprovação de exceções, volume/concorrência e validação real continuam pendentes.
