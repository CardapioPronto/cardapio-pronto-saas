# Modo offline e app mobile

## Status atual

O sistema ainda nao oferece modo offline real para o PDV.

Hoje o PDV depende de internet para carregar restaurante, produtos, mesas, usuario autenticado, historico de pedidos e para salvar pedidos no Supabase. Tambem nao ha configuracao de PWA, service worker, manifesto web, Capacitor, pasta Android ou pasta iOS no projeto.

A FAQ ja comunica esse limite corretamente. A pagina de funcionalidades foi ajustada para marcar o modo offline como recurso em desenvolvimento, evitando prometer uma capacidade que ainda nao esta pronta.

## O que da para implementar

### Fase 1: PWA instalavel

Objetivo: permitir instalar o Pubfy no celular ou tablet pelo navegador e manter a aplicacao carregavel.

- Adicionar `manifest.webmanifest` com nome, icones, cor de tema e modo `standalone`.
- Adicionar service worker via `vite-plugin-pwa`.
- Cachear os assets da aplicacao para abrir a interface mesmo sem conexao.
- Exibir indicador de conexao online/offline.
- Bloquear acoes que ainda dependem da internet com mensagens claras.

Resultado: experiencia de "app instalado", mas ainda sem venda offline completa.

### Fase 2: cache local dos dados essenciais do PDV

Objetivo: deixar o operador montar pedidos mesmo sem internet.

- Persistir em IndexedDB os produtos disponiveis, categorias, mesas e dados basicos do restaurante.
- Atualizar o cache quando a conexao estiver online.
- Mostrar ao operador quando os dados foram sincronizados pela ultima vez.
- Usar os dados locais no PDV quando o Supabase estiver indisponivel.

Resultado: o usuario consegue navegar pelo PDV e montar comandas offline usando o ultimo cardapio sincronizado.

### Fase 3: fila offline de pedidos

Objetivo: permitir finalizar pedidos offline sem perder venda.

- Criar tabela/local store de `offline_orders` no IndexedDB.
- Ao finalizar pedido offline, salvar um pedido local com `local_id`, itens, total, mesa, cliente, funcionario e data.
- Marcar o pedido como `pending_sync`.
- Mostrar um painel de pedidos pendentes de sincronizacao no PDV.
- Quando voltar a internet, enviar os pedidos ao Supabase na ordem correta.
- Apos sincronizar, gravar o `remote_order_id` retornado pelo banco.

Resultado: pedidos de mesa e balcao podem ser registrados offline e sincronizados depois.

### Fase 4: consistencia e conflitos

Objetivo: evitar duplicidade e inconsistencias.

- Usar um `client_order_id` unico em cada pedido local e criar restricao unica no banco.
- Tratar reenvio seguro: se a conexao cair durante a sincronizacao, o mesmo pedido nao deve duplicar.
- Revalidar mesa, usuario, produtos e totais no servidor.
- Definir regra de conflito para mesas: se a mesa mudou online enquanto o app estava offline, manter o pedido e sinalizar revisao.
- Registrar erros de sincronizacao com detalhes acionaveis para suporte.

Resultado: sincronizacao confiavel para uso operacional.

### Fase 5: app Android primeiro

Objetivo: publicar como aplicativo nativo usando a base React/Vite atual.

- Adicionar Capacitor.
- Configurar `capacitor.config.ts`.
- Gerar projeto Android.
- Ajustar build para servir os assets do `dist`.
- Testar login, rotas, cache, IndexedDB, permissao de rede e tela cheia em aparelho real.
- Publicar build interno na Google Play Console.

Resultado: app Android instalavel pela loja ou por distribuicao interna.

### Fase 6: iOS

Objetivo: reaproveitar a mesma base para App Store.

- Gerar projeto iOS com Capacitor.
- Testar IndexedDB, armazenamento local, safe areas e comportamento de rede no Safari/WebView.
- Criar certificados, provisioning profiles e build no Xcode.
- Publicar via TestFlight antes da App Store.

Resultado: app iOS com a mesma experiencia operacional.

## Recomendacao de escopo inicial

Comecar por Android + PWA + offline apenas para pedidos de balcao e mesa. Nao incluir inicialmente pagamento online, WhatsApp, iFood, imagens novas, relatorios ou edicao de cardapio em modo offline.

Essas partes devem continuar exigindo internet, porque dependem de servicos externos, webhooks, gateways de pagamento ou dados agregados.

## Mudancas principais no codigo

- Criar um modulo local de armazenamento, por exemplo `src/features/offline/`, usando IndexedDB.
- Adaptar `useProdutos` e `useMesas` para preencher cache local quando online.
- Adaptar `usePDVHook.finalizarPedido` para salvar na fila local quando offline.
- Adaptar `pedidoService` para aceitar `client_order_id` e sincronizar pedidos pendentes.
- Criar uma migration no Supabase adicionando `client_order_id` em `orders` com indice unico por restaurante.
- Adicionar componentes de status no PDV: conectado, offline, sincronizando, erro de sincronizacao.
- Adicionar service worker e manifesto PWA.
- Adicionar Capacitor para Android.

## Riscos importantes

- Autenticacao: se o usuario nunca abriu o app online, nao havera sessao local para operar.
- Dados desatualizados: produtos ou precos podem mudar enquanto o app esta offline.
- Mesas: o estado da mesa pode conflitar entre dispositivos.
- Duplicidade: sem `client_order_id`, pedidos podem ser criados duas vezes ao reconectar.
- Impressao: impressoras termicas podem exigir integracao nativa ou ponte local dependendo do modelo.

## Caminho sugerido

1. Corrigir comunicacao publica, deixando offline como recurso em desenvolvimento.
2. Implementar PWA instalavel.
3. Implementar cache local de produtos, categorias e mesas.
4. Implementar fila offline de pedidos de balcao.
5. Expandir para pedidos de mesa com tratamento de conflito.
6. Adicionar Capacitor e gerar Android.
7. Testar em operacao real antes de prometer sincronizacao automatica completa.
