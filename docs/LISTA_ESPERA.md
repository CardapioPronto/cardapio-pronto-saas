# Lista de espera digital

## Para que serve
Organizar a fila da porta sem papel: a recepção vê quem chegou, quanto tempo espera e chama pelo WhatsApp.

## Como usar (equipe)
1. Menu **Lista de espera** (`/lista-espera`), permissões `pdv_access` ou `orders_manage`.
2. Adicione nome, WhatsApp (opcional), pessoas e observação — ou deixe o cliente entrar pelo QR Code.
3. **Chamar**: marca como chamado e abre o WhatsApp com a mensagem pronta.
4. **Sentou** (escolha a mesa antes, se quiser), **Não veio** ou **Desistiu**.
5. "Atendidos hoje" permite **Voltar à fila** em caso de engano.
6. Indicadores: grupos na fila, pessoas aguardando, espera média de hoje, sentaram/desistiram.

## QR Code (cliente)
- Baixe o QR no quadro "QR Code da fila" e deixe na entrada. Link: `/fila/<slug-do-restaurante>`.
- O cliente informa nome, WhatsApp e pessoas, vê a posição e a estimativa e pode sair da fila. A página atualiza a cada 20 s.

## Regras e segurança
- Status: `waiting`, `notified`, `seated`, `canceled`, `no_show`; horários preenchidos automaticamente.
- Equipe só vê a fila do próprio restaurante.
- Entrada pública limitada a 5 tentativas a cada 10 min por dispositivo; mesmo telefone ativo em 12 h reaproveita a vaga.
- O cliente só consulta/cancela a própria vaga pelo token salvo no navegador.
- Estimativa: grupos à frente × 10 min (valor padrão).

## Limites
- Aviso pelo WhatsApp é manual (abre o app do atendente).
- Sem reserva com horário marcado (item separado no M10).
