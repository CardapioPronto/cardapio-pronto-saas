# Impressao operacional

Criado em: 2026-06-02

## Objetivo

Padronizar o uso da impressao no piloto operacional do Pubfy, sem prometer ainda integracao direta com impressoras fiscais ou impressoras de rede.

## Vias disponiveis

- **Comanda da cozinha**: sem valores, com mesa/balcao, cliente quando houver, itens, descricoes e observacoes.
- **Via do caixa**: com itens, valores, total, forma de pagamento e status do pagamento.
- **Comprovante do cliente**: com itens, valores, total e mensagem simples para entrega ao cliente.

## Como testar no piloto

1. Abra o PDV e crie um pedido de mesa ou balcao.
2. Finalize o pedido normalmente.
3. Acesse o historico do PDV.
4. No pedido, clique em **Reimprimir**.
5. Teste as tres vias: cozinha, caixa e cliente.
6. Confira se observacoes de item, mesa, cliente, total e pagamento aparecem na via correta.

## Impressoras suportadas no MVP

Nesta fase, o Pubfy usa a impressao nativa do navegador. Isso permite operar com:

- impressora termica instalada no Windows/macOS/Linux;
- impressora comum A4;
- impressao para PDF do proprio sistema operacional.

## Limites conhecidos

- Ainda nao ha roteamento automatico por setor de produto.
- Ainda nao ha configuracao persistida por restaurante para tamanho do papel ou quantidade de vias.
- Ainda nao ha integracao fiscal/NFC-e.
- Ainda nao ha impressao silenciosa sem abrir a janela do navegador.

## Criterio de aceite da fatia

- O historico do PDV permite reimprimir cozinha, caixa e cliente separadamente.
- A comanda da cozinha nao exibe valores.
- As vias de caixa e cliente exibem total e dados de pagamento quando disponiveis.
- Falha de abertura da janela de impressao retorna mensagem clara ao operador.
