# Impressao operacional

Criado em: 2026-06-02

## Objetivo

Padronizar o uso da impressao no piloto operacional do Pubfy, sem prometer ainda integracao direta com impressoras fiscais ou impressoras de rede.

## Vias disponiveis

- **Comanda da cozinha**: sem valores, com mesa/balcao, cliente quando houver, itens, descricoes e observacoes.
- **Via do caixa**: com itens, valores, total, forma de pagamento e status do pagamento.
- **Comprovante do cliente**: com itens, valores, total e mensagem simples para entrega ao cliente.

## Como testar no piloto

1. Acesse **Configuracoes > Sistema**.
2. Em **Impressao operacional**, escolha o tamanho do papel: 80mm, 58mm ou A4.
3. Selecione as vias padrao: cozinha, caixa e/ou cliente.
4. Clique em **Testar Impressao** para validar as vias escolhidas.
5. Abra o PDV e crie um pedido de mesa ou balcao.
6. Finalize o pedido normalmente.
7. Se **Impressao automatica** estiver ativa, confirme o dialogo **Imprimir vias do pedido**.
8. Acesse o historico do PDV.
9. No pedido, clique em **Reimprimir**.
10. Teste as tres vias: cozinha, caixa e cliente.
11. Confira se observacoes de item, mesa, cliente, total e pagamento aparecem na via correta.

## Impressoras suportadas no MVP

Nesta fase, o Pubfy usa a impressao nativa do navegador. Isso permite operar com:

- impressora termica instalada no Windows/macOS/Linux;
- impressora comum A4;
- impressao para PDF do proprio sistema operacional.

## Limites conhecidos

- Ainda nao ha roteamento automatico por setor de produto.
- A impressao automatica do MVP abre uma confirmacao para o operador imprimir as vias padrao. Impressao silenciosa sem clique ainda nao e suportada pelo navegador.
- Ainda nao ha integracao fiscal/NFC-e.
- Ainda nao ha impressao silenciosa sem abrir a janela do navegador.

## Criterio de aceite da fatia

- O historico do PDV permite reimprimir cozinha, caixa e cliente separadamente.
- A comanda da cozinha nao exibe valores.
- As vias de caixa e cliente exibem total e dados de pagamento quando disponiveis.
- Falha de abertura da janela de impressao retorna mensagem clara ao operador.
- O tamanho de papel configurado em Sistema e usado no teste de impressao e nas reimpressoes do PDV.
- Com impressao automatica ativa, o PDV oferece as vias padrao logo apos finalizar o pedido.
