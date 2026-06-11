# Modo offline e app mobile

## Status atual

O Pubfy ja possui base PWA instalavel pelo navegador, com `manifest.webmanifest`, icones, metadados mobile e `service-worker.js` registrado em producao.

O app shell pode continuar abrindo apos o primeiro acesso, mesmo com conexao instavel. APIs, Supabase, pagamentos, WhatsApp, iFood, relatorios, edicao de cardapio e rotinas administrativas continuam exigindo internet.

O PDV ja possui suporte offline parcial:

- Catalogo local por restaurante com produtos, categorias, areas e mesas.
- Indicador online/offline baseado em probe real do Supabase, nao apenas `navigator.onLine`.
- Banner global de perda de conexao.
- Fila local para pedido de balcao offline, com sincronizacao quando a conexao voltar.
- Bloqueio claro para pedido de mesa offline, pois ainda ha risco de conflito operacional.

Ainda nao ha app nativo com Capacitor, projeto Android/iOS, publicacao em loja ou modo offline completo para todos os canais.

## Estado por fase

### Fase 1: PWA instalavel - concluida

Objetivo: permitir instalar o Pubfy no celular ou tablet pelo navegador e manter a aplicacao carregavel.

- [x] Adicionar `manifest.webmanifest` com nome, icones, cor de tema e modo `standalone`.
- [x] Adicionar service worker conservador para app shell e assets estaticos.
- [x] Cachear assets da aplicacao para abrir a interface mesmo sem conexao apos primeiro acesso.
- [x] Exibir indicador de conexao online/offline.
- [x] Bloquear acoes que ainda dependem da internet com mensagens claras.

Resultado: experiencia de app instalado, sem prometer operacao offline completa.

### Fase 2: cache local dos dados essenciais do PDV - implementada

Objetivo: deixar o operador navegar pelo PDV com dados ja sincronizados quando a conexao cair.

- [x] Persistir produtos disponiveis, categorias, mesas e areas por restaurante.
- [x] Atualizar o cache quando a conexao estiver online.
- [x] Mostrar ao operador quando os dados foram sincronizados pela ultima vez.
- [x] Usar dados locais no PDV quando o Supabase estiver indisponivel.

Resultado: o usuario consegue consultar o ultimo catalogo sincronizado e montar comandas com os dados disponiveis localmente.

### Fase 3: fila offline de pedidos - parcial

Objetivo: permitir registrar vendas simples sem perder pedido quando a internet cair.

- [x] Criar fila local de pedidos offline no dispositivo.
- [x] Salvar pedido de balcao offline com identificador unico do cliente.
- [x] Mostrar painel de pedidos pendentes de sincronizacao no PDV.
- [x] Sincronizar pedidos pendentes quando a internet voltar.
- [x] Evitar duplicidade com `client_order_id`.
- [ ] Expandir para pedidos de mesa com tratamento de conflito.
- [ ] Registrar auditoria detalhada dos erros de sincronizacao para suporte.

Resultado atual: pedidos de balcao podem ser salvos offline e sincronizados depois. Pedidos de mesa continuam exigindo conexao.

### Fase 4: consistencia e conflitos

Objetivo: tornar a sincronizacao confiavel para uso operacional mais amplo.

- [x] Usar `client_order_id` unico em cada pedido local e restricao unica no banco.
- [x] Reenvio seguro para pedidos de balcao.
- [ ] Revalidar mesa, usuario, produtos e totais com relatorio visivel quando houver divergencia.
- [ ] Definir regra de conflito para mesas: se a mesa mudou online enquanto o app estava offline, manter o pedido e sinalizar revisao.
- [ ] Criar painel administrativo de pedidos offline com falha por restaurante/dispositivo.

Resultado esperado: sincronizacao confiavel para pedido de mesa, revisao assistida e suporte com contexto.

### Fase 5: app Android

Objetivo: publicar como aplicativo nativo usando a base React/Vite atual.

- [ ] Adicionar Capacitor.
- [ ] Configurar `capacitor.config.ts`.
- [ ] Gerar projeto Android.
- [ ] Ajustar build para servir os assets do `dist`.
- [ ] Testar login, rotas, cache, IndexedDB, permissao de rede e tela cheia em aparelho real.
- [ ] Publicar build interno na Google Play Console.

Resultado esperado: app Android instalavel pela loja ou por distribuicao interna.

### Fase 6: iOS

Objetivo: reaproveitar a mesma base para App Store.

- [ ] Gerar projeto iOS com Capacitor.
- [ ] Testar IndexedDB, armazenamento local, safe areas e comportamento de rede no Safari/WebView.
- [ ] Criar certificados, provisioning profiles e build no Xcode.
- [ ] Publicar via TestFlight antes da App Store.

Resultado esperado: app iOS com a mesma experiencia operacional.

## Recomendacao comercial

Comunicar o recurso como PWA instalavel com operacao offline parcial no PDV, deixando claro que o modo offline completo esta restrito por escopo.

Pode ser prometido hoje:

- App instalavel pelo navegador em Android/tablet.
- Interface aberta mesmo com conexao instavel apos primeiro acesso.
- Indicador online/offline e banner de perda de conexao.
- Catalogo local do PDV.
- Pedido de balcao salvo offline e sincronizado depois.

Nao prometer ainda:

- Pedido de mesa offline completo.
- Pagamento online offline.
- WhatsApp, iFood ou webhooks offline.
- Edicao de cardapio offline.
- Relatorios offline.
- App nativo Android/iOS publicado em loja.

## Proximos passos recomendados

1. Adicionar prompt guiado "Instalar app" no dashboard quando o navegador permitir.
2. Criar diagnostico PWA/offline com service worker ativo, ultima sincronizacao e fila pendente.
3. Adicionar aviso de nova versao quando o service worker atualizar assets.
4. Expandir fila offline para mesa com revisao de conflito.
5. Criar monitoramento por restaurante dos pedidos offline com erro.
6. Testar em aparelho Android real durante um turno piloto.
7. Avaliar Capacitor somente depois da estabilidade do PWA em piloto.
