# Roteiros de QA manual — Pubfy

Documento operacional para validar a aplicação antes do go-live (ou em
qualquer mudança grande). Quatro roteiros, um por persona:

1. [Dono do restaurante](#1-dono-do-restaurante)
2. [Funcionário / Caixa (PDV)](#2-funcionário--caixa-pdv)
3. [Cozinha](#3-cozinha)
4. [Cliente final (cardápio público)](#4-cliente-final-cardápio-público)

> Pré-requisito: ter um restaurante demo já populado. Use o RPC
> `public.seed_demo_restaurant('email-do-owner@…')` (veja
> `docs/RUNBOOK_PRODUCAO.md` seção 1) ou crie manualmente. Cada execução
> deve cobrir desktop e mobile.

Cada caso usa o checklist no formato:

- [ ] **passo** — comportamento esperado.

Marque `[x]` ao validar, anote evidência (print, id do pedido, link) à
direita se necessário. No fim do documento há um campo livre para
**bugs encontrados**.

---

## 1. Dono do restaurante

Cobre tarefas exclusivas de quem assinou o plano e configura a operação.

### 1.1 Onboarding inicial

- [ ] Cadastro em `/cadastro` com e-mail válido → recebe e-mail de
      confirmação no domínio configurado em **Site URL** do Auth.
- [ ] Após confirmar e-mail, restaurante e assinatura **trial** são
      criados automaticamente (verificar via Admin → Assinaturas).
- [ ] Login em `/login` redireciona para `/dashboard`.

### 1.2 Configuração do restaurante

- [ ] Configurações → Estabelecimento: alterar nome, endereço, telefone
      WhatsApp, horários e logo. Salvar.
- [ ] Cardápio Digital → Personalização: trocar tema, cor primária,
      banner. Pré-visualização atualiza.
- [ ] Cardápio Digital → Categorias: criar/editar/excluir categoria.
- [ ] Cardápio Digital → Produtos: criar produto com foto, descrição e
      preço; marcar como indisponível e verificar que some do cardápio
      público.
- [ ] Cardápio Digital → Promoções: criar promoção de produto, de
      categoria e de pedido. Verificar que aparecem no cardápio público
      com badge e preço riscado.
- [ ] Marketing → Cupons: criar cupom percentual e cupom fixo. Verificar
      `BEMVINDO10` aplicado em pedido público.
- [ ] Marketing → Campanhas: criar rascunho, agendar disparo. Após
      envio, conferir métricas `sent_count`/`failed_count`.

### 1.3 Mesas e PDV

- [ ] Mesas/Áreas: criar área, adicionar 4 mesas. Marcar uma como
      ocupada manualmente e verificar status.
- [ ] PDV: lançar pedido em mesa, finalizar, conferir aparição em
      Pedidos com `status = finalizado` e mesa volta a `livre`.

### 1.4 Assinatura

- [ ] Assinaturas: visualizar alert de trial com dias restantes.
- [ ] Mudar para plano pago via Pagar.me (use cartão de teste em modo
      sandbox). Após pagamento, alert muda para "Plano ativo".
- [ ] Simular `past_due` (cancelar cartão e aguardar webhook) → alert
      de pagamento em atraso aparece.

### 1.5 Relatórios

- [ ] Relatórios → Avançado, período 30 dias: receita, ticket médio e
      produtos mais vendidos batem com os pedidos finalizados.
- [ ] Análise de performance, período 90 dias: alerta "período longo"
      aparece (Bloco 6).
- [ ] Exportar CSV de pedidos: arquivo abre em planilha sem erro.

### 1.6 Integrações

- [ ] WhatsApp/Atendimento: conectar instância Evolution, enviar pedido
      pelo cardápio e confirmar que o bot/operador recebe a mensagem.
- [ ] iFood: configurar credenciais (apenas se contratado). Verificar
      que pedidos do iFood aparecem na lista de pedidos com `source = ifood`.

---

## 2. Funcionário / Caixa (PDV)

Cobre o turno do operador no balcão/mesa.

### 2.1 Login e permissões

- [ ] Login com usuário **funcionário** → vê apenas Dashboard, PDV,
      Pedidos e Cozinha (sem assinatura/configurações).
- [ ] Sem permissão `orders_metrics_view`, valores monetários ficam
      ocultos na lista de pedidos (visto no Bloco 6).

### 2.2 Operação no PDV

- [ ] PDV → escolher Mesa 1 → adicionar 3 produtos diferentes.
- [ ] Aplicar cupom `BEMVINDO10` → desconto reflete no total.
- [ ] Finalizar como "pago em dinheiro" → pedido vai para Cozinha.
- [ ] Repetir com pagamento via cartão online (Pagar.me) → status fica
      `aguardando_pagamento`, muda para `pendente` quando webhook chega.
- [ ] Cancelar pedido aberto → mesa volta para `livre`.

### 2.3 Pedidos do dia

- [ ] Pedidos → filtro "Hoje": ver todos os pedidos da operação.
- [ ] Buscar pedido por número → consulta retorna em < 2s.
- [ ] Atualizar status de um pedido manualmente (Em preparo → Pronto →
      Finalizado).
- [ ] Em mobile, tabela faz scroll horizontal sem quebrar (Bloco 8).

### 2.4 Emissão de nota / comprovante

- [ ] Pedido finalizado: abrir detalhes → imprimir/visualizar
      comprovante (Receipt). Itens, total e mesa aparecem corretos.

---

## 3. Cozinha

Pessoa que executa pedidos. Geralmente roda em TV ou tablet montado na
parede.

### 3.1 Tela

- [ ] Abrir `/cozinha` em monitor 1080p → cards de pedidos cabem na
      tela sem scroll.
- [ ] Cards em "Pendente" e "Em preparo" claramente diferenciados por
      cor.
- [ ] Notificação sonora dispara ao chegar pedido novo.

### 3.2 Fluxo de status

- [ ] Pedido novo → operador da cozinha clica "Iniciar preparo" → card
      muda para coluna "Em preparo".
- [ ] Finalizar item por item ou pedido completo → muda para "Pronto".
- [ ] Pronto sai da fila e aparece em Pedidos com `status = pronto`.

### 3.3 Comunicação

- [ ] Observações do cliente aparecem destacadas no card.
- [ ] Pedidos com `source = ifood` exibem badge iFood.

---

## 4. Cliente final (cardápio público)

Pessoa que abre o link do restaurante no celular.

### 4.1 Acesso

- [ ] Abrir `https://app.pubfy.com.br/<slug>` (mobile) → cardápio
      carrega em < 3s com tema correto.
- [ ] Banner do restaurante visível.
- [ ] Categorias listadas na ordem configurada.
- [ ] Produto promocional mostra badge e preço riscado.

### 4.2 Pedido

- [ ] Abrir produto → modal mostra descrição, preço final, observação.
- [ ] Adicionar ao carrinho → contador no topo atualiza.
- [ ] Ajustar quantidade no carrinho → total recalcula.
- [ ] Aplicar cupom `BEMVINDO10` → desconto aplicado. Caso haja
      promoção de pedido ativa, mensagem "Cupom e promoção não somam"
      aparece (Bloco 7).
- [ ] Preencher dados (nome, telefone, endereço) → validações de campo
      funcionam.

### 4.3 Pagamento

- [ ] Selecionar pagamento na entrega → pedido finalizado com
      `status = pendente`.
- [ ] Selecionar pagamento online (pix) → redireciona para fluxo
      Pagar.me; após pagar, pedido aparece como `paid`.
- [ ] Selecionar cartão online → fluxo 3DS quando aplicável; em caso
      de falha, mensagem clara ao cliente.

### 4.4 Acompanhamento

- [ ] E-mail de confirmação chega em até 1 minuto com link
      `${PUBLIC_SITE_URL}/pedido/<id>`.
- [ ] Link abre tela de tracking com status atual do pedido.

### 4.5 Acessibilidade

- [ ] Tab key navega botões em ordem lógica.
- [ ] Cores de texto/botão têm contraste suficiente (target WCAG AA).
- [ ] Mensagens de erro são lidas por screen reader (campo aria-live).

---

## Bugs encontrados

Registrar aqui durante a execução. Migrar para issues após o ciclo.

| Data | Persona | Passo | Severidade | Descrição | Observação |
| --- | --- | --- | --- | --- | --- |
|      |         |       |            |           |            |

---

## Critério para liberar produção comercial

Todos os passos do roteiro **dono** e **cliente final** verdes em
desktop e mobile. Roteiros **funcionário** e **cozinha** verdes pelo
menos em desktop/tablet. Bugs de severidade alta zerados.
