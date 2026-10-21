# Acompanhamento financeiro por restaurante

Entrega: 21/10/2026. Página `/financeiro`, item **Financeiro** no menu, acesso com permissão `reports_view` (incluída no perfil operacional de gerente). Não abre, fecha nem altera o Caixa ou os pedidos.

## Consulta
- Seleção entre unidades autorizadas, usando a troca de unidade ativa já existente.
- Período personalizado e atalhos Hoje / 7 dias / 30 dias; datas inclusivas no horário de São Paulo. Consulta de hoje termina no instante atual; limite existente de relatórios: 366 dias.
- Totais de vendas não canceladas, recebimentos locais confirmados, pagamentos pendentes e cobranças externas brutas, separados.
- Fluxo diário e saldo parcial do movimento registrado; recebimentos por forma; pedidos criados **ou pagos** no período, com busca e paginação de 20 linhas.
- Atualização manual e consulta automática a cada minuto enquanto a página está visível; erros explícitos sem substituir falhas por totais zero.

## Regras e limites
- Reutiliza `get_cash_shift_activity` e a classificação compartilhada com o Caixa. Pedido antigo pago no período entra no recebimento, mas não infla vendas do período. Nenhuma sessão aberta é necessária.
- Sangrias vêm de caixas fechados, paginados em blocos de 500, filtrados por restaurante e data de fechamento. Não existe data individual de sangria no modelo atual: por isso o total é atribuído ao fechamento, não a uma hora presumida de retirada.
- Saldo parcial = recebimentos locais confirmados − sangrias dos fechamentos no período. **Não é saldo bancário, lucro, saldo contado da gaveta ou fluxo financeiro completo**: não inclui saldo inicial, despesas, suprimentos, sangrias ainda não fechadas nem repasses externos. Cobranças externas não provam transferência bancária.
- Mistos, estornos e dados insuficientes permanecem em **Para revisar**, fora dos recebimentos locais confirmados.
- Dados respeitam as políticas de restaurante existentes; a troca de unidade é confirmada no servidor antes da consulta. Não há novo armazenamento de cargos nem alterações de RLS.

## Verificação
- Testes unitários de leitura sem sessão, separação de vendas/recebimentos, sangrias únicas, agrupamento por dia e filtros de data.
- Fluxo de interface testável com dados simulados; consulta real autenticada pendente: Supabase externo não oferece sessão gerenciada para este ambiente.