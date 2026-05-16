# Integrações Externas e Estoque

## iFood no MVP

A integração atual do iFood importa pedidos em `supabase/functions/ifood-integration/index.ts` usando os nomes e preços enviados pelo marketplace. Os itens entram em `order_items` com `product_id = null`, porque ainda não existe um mapeamento confiável entre o item do catálogo iFood e `products.id` do catálogo interno.

Consequência prática:

- pedidos iFood não baixam estoque automaticamente no MVP;
- as RPCs de estoque ignoram `order_items` sem `product_id`, então a importação não quebra nem cria baixa fantasma;
- a reconciliação operacional deve ser feita por ajuste manual de estoque quando o restaurante quiser refletir vendas iFood no saldo interno;
- os logs da Edge Function registram quantos itens foram importados sem vínculo de produto para facilitar diagnóstico.

## Evolução Recomendada

Para baixa automática futura, criar um mapeamento explícito entre item externo e produto interno, por exemplo `ifood_item_id`/SKU/código do marketplace -> `products.id`.

Somente depois desse vínculo existir a importação deve chamar a mesma camada de movimentação de estoque usada por cardápio público e PDV, com idempotência baseada em `ifood_id` + índice/ID do item. Cancelamentos vindos do iFood também devem passar pelo mesmo caminho de estorno usado em `update_order_status`.

Até lá, o estoque interno permanece fonte confiável para vendas feitas no cardápio público e no PDV, e pedidos iFood permanecem rastreáveis como vendas externas sem baixa por SKU.
