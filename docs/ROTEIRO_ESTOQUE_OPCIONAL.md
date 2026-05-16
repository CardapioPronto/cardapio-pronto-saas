# Roteiro de implementação — Estoque opcional por produto

**Objetivo:** permitir que cada produto tenha controle de estoque **ligado ou desligado**, com baixa coerente nos canais (admin, PDV, menu público, integrações), histórico auditável e evolução futura para insumos/receitas.

**Branch de desenvolvimento:** `controle-estoque-opcional` (PR final ao concluir Bloco J).

**Como usar este documento**

- O **Bloco A** já está fechado com as decisões acordadas — `[x]` indica decisão tomada, não tarefa concluída.
- Nos demais blocos, marque **`[x]`** conforme for concluindo (pode substituir por ✅ no Git ou manter checkboxes no Markdown).

---

## Decisões fechadas (resumo executivo)

Princípio geral: **“saldo é consequência de movimentos”** — toda alteração de saldo passa por uma única função (`apply_stock_movement`) que atualiza `stock_quantity` e insere uma linha em `stock_movements` na mesma transação. Nenhum lugar do código escreve direto na coluna de saldo.

| Tema | Decisão |
|---|---|
| Ativação | Opt-in **por produto** (`stock_tracking_enabled`) + chave geral por restaurante; ambos default `false`. |
| Momento da baixa | **Dentro das RPCs** `create_public_menu_order` e `create_pos_order`, na mesma transação do `INSERT` em `order_items`. |
| Pagamento online pendente | Saldo já fica baixado em `aguardando_pagamento`; falha → cancelar → estorno; sucesso → sem movimento extra. |
| Sem saldo (cardápio público) | **Bloquear** + UI **“Esgotado”** (não ocultar). |
| Sem saldo (PDV) | **Bloquear** por padrão; permitir negativo apenas com permissão de gestor + motivo registrado. |
| Cancelamento total | Estorno automático e idempotente ao virar `cancelado`. |
| Reabrir pedido | Revalidar e re-baixar; **bloquear** reabertura se saldo insuficiente, com mensagem clara. |
| Cancelamento parcial / edição de item | **Fora do MVP** (UI atual não persiste essas operações de forma genérica). |
| Combos | Tratados como produtos comuns (uma baixa pelo combo). Baixa por componente fica para fase de receitas/BOM. |
| Variações (P/M/G) | **Não suportar no MVP** — schema atual não tem entidade de variação. |
| Addons (`order_items.addons`) | **Ignorar** no MVP. |
| iFood | MVP: estoque interno continua confiável; pedidos iFood não baixam automaticamente — gestor faz **ajuste manual** (linhas chegam com `product_id = NULL`). Fase 2: mapeamento SKU iFood ↔ `products.id`. |
| Permissão para ajuste manual | Reusar **`products_manage`** (sem novo valor no enum no MVP). |
| Unidade de medida | `numeric` no banco; UI default inteiro, com flag por produto para fracionado (peso/dose). |
| Saldo inicial | Ao **ligar** o tracking, exigir contagem inicial (com botão “começar com 0”). Migração inicial não preenche saldo de ninguém. |
| Saldo mínimo / alerta | Opcional por produto; indicador visual passivo (sem push/e-mail no MVP). |
| Multi-depósito / reserva no carrinho | **Não no MVP**. |

---

## Revisão de conformidade com o sistema (repo — maio/2026)

Esta seção amarra o roteiro ao que o código e as migrations indicam **hoje**, para evitar suposições que não batem com o produto.

### Modelo de dados e produtos

- **`public.products`** (vide `src/integrations/supabase/types.ts`): uma linha por item com `price` único — **não há**, nas migrations rastreadas, tabela dedicada de variações/SKU ligada a pedidos. O MVP de estoque deve assumir **saldo no registro de `products`**; evolução por variação exige schema novo + alteração dos fluxos que hoje só enviam `product_id`.
- **`public.order_items`**: possui `addons` (`jsonb`), `promotion_id`, `promotion_discount`. Qualquer baixa automática futura ligada a **adicionais** depende de padronizar se addons referenciam outros `products` ou são apenas texto/preço — documentar no Bloco A antes de descontar insumos pelos addons.

### Onde pedidos nascem (pontos obrigatórios para baixa idempotente)

- **Cardápio público / delivery:** RPC **`create_public_menu_order`** (evoluções em `supabase/migrations/20260507123000_harden_public_menu_order_integrity.sql`, `20260513090000_apply_promotions_server_side.sql`, `20260518000100_create_public_menu_order_rate_limit.sql`). O cliente chama via `src/services/deliveryOrderService.ts`. É o lugar natural para **validar saldo** e **gravar movimento na mesma transação** do `INSERT` em `orders` / `order_items`.
- **PDV:** RPC **`create_pos_order`** (`supabase/migrations/20260509120000_create_pos_order_transaction_rpcs.sql`), chamada por `src/features/pdv/services/pedidoService.ts` (`salvarPedido`). Já valida `products.available`; estoque deve seguir o mesmo padrão **server-side**.
- **Outros:** não foram encontrados criadores paralelos de `order_items` além das migrations da função pública e do POS; novos fluxos devem ser acrescentados explicitamente neste documento quando aparecerem.

### Ciclo de vida do pedido e estorno

- Alteração de status usa **`update_order_status`** (mesma migration do POS). Estados incluem `pendente`, `preparo`, `finalizado`, `cancelado`, `aguardando_pagamento`, etc.
- **Cancelamento:** transição para `cancelado` deve disparar **estorno de estoque** (movimento positivo ou reversão amarrada ao `order_id`), respeitando idempotência.
- **Reabrir pedido:** a UI do histórico (`src/features/pdv/components/PedidoHistoricoItem.tsx`) permite voltar de `cancelado` ou `finalizado` para `pendente`. Isso é **crítico para estoque**: se ao cancelar o saldo foi devolvido, ao reabrir é preciso **baixar de novo** (ou bloquear reabertura se não houver saldo). Registar decisão no Bloco A e cobrir em QA (Bloco J).
- **Edição de itens / quantidade:** o roteiro prevê delta parcial; confirmar se o produto hoje permite editar linhas após criar pedido ou só via cancelamento — ajustar tarefas do Bloco D à realidade da UI/API.

### iFood (integração atual)

- `supabase/functions/ifood-integration/index.ts` importa pedidos com **`order_items.product_id` nulo** e nome/texto vindos do marketplace. Ou seja: **não há ligação automática ao catálogo interno** para baixa por produto.
- **Consequência:** no MVP, definir explicitamente uma das políticas: (1) **estoque não se aplica** a linhas sem `product_id`; (2) **ajuste manual** pelo gestor; (3) fase posterior com **mapeamento** código iFood ↔ `products.id`. O checklist do Bloco H foi escrito em cima dessa distinção.

### Permissões

- O backend usa o enum Postgres **`permission_type`** e `public.user_has_restaurant_permission` (ex.: `pdv_access`, `orders_manage`). A UI lista rótulos em `src/components/funcionarios/permissions.ts`.
- Ajuste manual de estoque **não deve** depender só de `products_manage` sem decisão explícita: ou reutiliza-se `products_manage` para MVP, ou cria-se valor novo no enum (ex.: `stock_adjust`) + política RLS/RPC — ver Bloco B/E.

### Documentação interna vs código

- `docs/IMPLEMENTATION_STATUS.md` menciona combos/`product_combinations` em alguns trechos; **não há**, nas migrations pesquisadas no repo, criação da tabela `product_combinations`. Tratar “combo com baixa em componentes” como **evolução**, não como premissa do MVP, até o modelo de combo estar persistido nos pedidos.

---

## Checklist de decisões e escopo (recomendações marcadas)

### Produto e modelo de dados

- [x] **Estoque opcional por produto** — flag explícita (ex.: `stock_tracking_enabled`); padrão `false` em migração para não alterar comportamento atual.
- [x] **Saldo em uma única “carteira” por produto** no MVP (sem multi-depósito).
- [ ] Multi-depósito / locais (cozinha, loja, evento) — fase posterior.
- [x] **Variações / SKUs:** no schema atual o pedido referencia apenas **`products.id`** com preço único — MVP de estoque em **`products`**; quando existir entidade de variação no banco e no payload do pedido, **replicar** campos de estoque na entidade vendável (filho) ou documentar baixa só no pai.
- [ ] **Combos com baixa em componentes:** recomendável **após** existir composição persistida na venda (linhas filhas, BOM ou `product_id` por componente no pedido). Enquanto o combo for apenas “outro `products`” no cardápio, o MVP é **uma baixa na linha do combo** (mesmo `product_id`).
- [ ] **Combo como SKU único** com saldo próprio no cadastro — válido como estratégia operacional simples **no MVP**, se combos forem produtos normais.

### Momento da baixa e consistência

- [x] **Baixa no mesmo commit em que `order_items` são inseridos** nas RPCs **`create_public_menu_order`** e **`create_pos_order`** (pedido já nasce `pendente` ou `aguardando_pagamento` conforme fluxo de pagamento). Evita divergência entre canais e coincide com o desenho atual transacional. Documentar exceção apenas se no futuro houver “rascunho” de pedido sem itens persistidos.
- [ ] Reserva de estoque ao adicionar ao carrinho (complexo; sessões abandonadas) — **não** no MVP.
- [x] **Transação atômica:** atualizar saldo + registrar movimento na mesma operação (ou RPC única) para evitar duplicidade em retries.
- [x] **Idempotência** nos movimentos ligados a pedido (ex.: chave lógica `order_item_id` + tipo) — reduz baixa dupla em retries/webhooks; obrigatório antes de produção com integrações.

### Comportamento sem saldo

- [x] **Política configurável por restaurante ou por produto:** bloquear venda vs permitir venda com alerta — MVP: **bloquear** quando tracking ativo e saldo < quantidade solicitada.
- [ ] Permitir saldo negativo com permissão especial — opcional (suporte a operações legadas).

### Cancelamentos e ajustes

- [x] **Estorno de movimento** ao passar pedido para **`cancelado`** via **`update_order_status`** (e qualquer outro caminho que cancele). Incluir tratamento da **reabertura** (`cancelado`/`finalizado` → `pendente`): nova baixa ou bloqueio por falta — decisão explícita no Bloco A.
- [x] **Ajuste manual** (entrada, saída, inventário) com tipo de motivo e usuário — MVP essencial.
- [ ] Aprovação em duas etapas para ajustes grandes — opcional.

### Canais e impacto

- [x] **Mesma regra** em: cadastro produto, criação de pedido interno/PDV, pedido menu público.
- [x] Integrações externas (ex.: iFood) — planejar desde o Bloco 1; na implementação atual os itens podem vir **sem `product_id`** — ver seção de conformidade. Bloco H prevê fases (manual → mapeamento).
- [ ] Sincronização bidirecional “pausar item no marketplace” — fase posterior; depende de APIs e política comercial.

### Segurança e permissões

- [x] **RLS** em tabelas novas alinhado ao `restaurant_id` (mesmo padrão das demais tabelas).
- [x] Permissões: operação com **`pdv_access`** sofre bloqueio de falta; **ajuste manual** exige critério explícito — MVP aceitável reutilizar **`products_manage`** + RPC checando `user_has_restaurant_permission`; alternativa mais limpa: novo valor em **`permission_type`** + espelho em `permissions.ts` / tipo TS de funcionário.
- [x] Relatório de auditoria exportável (CSV) — útil, pode vir logo após MVP.

### Relatórios e alertas

- [x] Listagem de produtos abaixo do mínimo (mesmo que “mínimo” seja opcional/null no MVP).
- [ ] Notificações push/e-mail — opcional pós-MVP.
- [x] Indicador na lista de produtos (saldo / sem controle).

### Documentação e produto

- [x] Alinhar **FAQ / materiais de marketing** com o que estiver realmente disponível (evitar “avançado” só no texto).
- [ ] Feature por plano (monetização) — decisão de negócio; se sim, amarrar a subscriptions antes do go-live.

---

## Visão dos blocos (ordem sugerida)

| Bloco | Nome resumido                          | Dependência      |
|-------|----------------------------------------|------------------|
| A     | Decisões de domínio fechadas           | —                |
| B     | Schema, RLS, tipos gerados             | A                |
| C     | Camada de movimentação (serviço/RPC)   | B                |
| D     | Pedidos: baixa e estorno               | C                |
| E     | UI administrativa (produto + estoque)  | B, C             |
| F     | Menu público e disponibilidade         | C, D             |
| G     | PDV e outros pontos de venda internos  | D                |
| H     | Integrações externas (ex.: iFood)      | D, F (mínimo)    |
| I     | Relatórios, alertas, polish            | E–G              |
| J     | QA, documentação interna, go-live    | I                |

---

## Bloco A — Decisões de domínio fechadas

**Objetivo:** congelar as regras antes de qualquer código. Itens `[x]` = decisão tomada (rastrear no review se algo precisar ser revisto).

- [x] **Momento da baixa:** dentro das RPCs `create_public_menu_order` e `create_pos_order`, na mesma transação do `INSERT` em `order_items`.
- [x] **Pagamento online pendente:** saldo já é baixado quando o pedido entra em `aguardando_pagamento`; transição posterior para `cancelado`/`pagamento_falhou` aciona estorno (Bloco D).
- [x] **Cancelamento total:** ao entrar em `cancelado`, estornar todos os movimentos de venda do pedido — idempotente.
- [x] **Reabrir pedido** (`cancelado`/`finalizado` → `pendente`): revalidar saldo e re-baixar; se faltar, **bloquear a reabertura** com mensagem amigável.
- [x] **Cancelamento parcial de linha / edição de quantidade:** fora do escopo MVP. Fluxo recomendado: cancelar pedido e refazer.
- [x] **Combos:** tratados como produtos comuns (uma baixa pelo combo). Baixa por componente fica para fase de receitas/BOM.
- [x] **Variações:** não suportar no MVP — schema atual não tem entidade vendável de variação.
- [x] **Addons (`order_items.addons`):** ignorar no MVP — formato atual não referencia `products`.
- [x] **iFood:** MVP não baixa estoque automático para linhas com `product_id = NULL`; gestor reconcilia via ajuste manual (Bloco E). Fase 2 = mapeamento SKU.
- [x] **`order_items.product_id` nulo é cenário válido** (iFood). RPC de baixa precisa **ignorar** linhas sem `product_id` ao invés de quebrar.
- [x] **Política sem saldo (cardápio público):** bloquear venda + UI **“Esgotado”** (não ocultar).
- [x] **Política sem saldo (PDV):** bloquear; permitir negativo só com permissão de gestor + motivo registrado.
- [x] **Permissão de ajuste manual:** reutilizar `products_manage` no MVP — sem novo valor em `permission_type`.
- [x] **Unidade de medida:** coluna de saldo `numeric`; flag `stock_is_fractional` no produto controla UX (default inteiro).
- [x] **Saldo inicial:** ao ligar o tracking, formulário exige contagem inicial (com botão “começar com 0”). Migração inicial não preenche saldo.
- [x] **Saldo mínimo / alerta:** opcional por produto; somente indicador visual no MVP (sem push/e-mail).
- [x] **Multi-depósito, reserva no carrinho, BOM:** fora do MVP, deixados em “notas de evolução”.

> Resumo do princípio: saldo só muda via função `apply_stock_movement`. Idempotência por chave lógica (`order_id` + `order_item_id` + `movement_type`).

---

## Bloco B — Schema, migrações Supabase, tipos

**Objetivo:** persistência e segurança antes de qualquer UI. Datas sugeridas: timestamp na ordem do diretório `supabase/migrations/`.

> Migration: [`supabase/migrations/20260520120000_create_stock_control_schema.sql`](../supabase/migrations/20260520120000_create_stock_control_schema.sql).

### B1. Coluna em `restaurant_settings`
- [x] `stock_control_enabled boolean NOT NULL DEFAULT false` — chave geral por restaurante.

### B2. Colunas em `products`
- [x] `stock_tracking_enabled boolean NOT NULL DEFAULT false`
- [x] `stock_quantity numeric NOT NULL DEFAULT 0` (saldo atual; **não** atualizar direto — apenas via RPC do Bloco C)
- [x] `stock_min_quantity numeric NULL` (mínimo para alerta)
- [x] `stock_is_fractional boolean NOT NULL DEFAULT false` (UI integer × decimal)
- [x] **Sem CHECK** que proíba negativo: o controle vive na RPC para suportar o override autorizado por gestor (Bloco G). Decisão registrada como comentário no SQL.
- [x] Índice parcial `idx_products_low_stock` para listar produtos abaixo do mínimo (suporta o widget do Bloco I).

### B3. Tabela `stock_movements`
- [x] Colunas: `id`, `restaurant_id`, `product_id` (NOT NULL), `quantity_delta numeric`, `movement_type text`, `reason text`, `notes text`, `order_id` / `order_item_id` (NULL ON DELETE SET NULL), `idempotency_key text`, `created_at`, `created_by`.
- [x] CHECK: `movement_type IN ('sale', 'sale_revert', 'adjustment_in', 'adjustment_out', 'inventory_count', 'manual_negative_override')`.
- [x] CHECK: `quantity_delta <> 0` (movimento zero é bug).
- [x] Índices: `(restaurant_id, product_id, created_at DESC)`, `(order_id)` parcial, `(created_by)` parcial.
- [x] **Idempotência via `idempotency_key`** + índice único parcial `WHERE idempotency_key IS NOT NULL`. Permite ciclo cancel/reabertura sem colisão (RPC compõe a chave incluindo o ciclo — ver Bloco C).

### B4. RLS
- [x] `ENABLE` + `FORCE ROW LEVEL SECURITY`.
- [x] Policy `SELECT` escopada por `restaurant_id = public.get_user_restaurant_id()` ou `is_super_admin`.
- [x] **Sem** policy de `INSERT/UPDATE/DELETE` para `authenticated` — gravações exclusivamente via RPCs `SECURITY DEFINER` do Bloco C.
- [x] Policy administrativa para super admin (`FOR ALL`).

### B5. Tipos e front-end
- [x] Estender `src/types/product.ts` (campos de estoque + tipo `StockMovement` / `StockMovementType`).
- [x] Atualizar `src/utils/formatProductFromSupabase.ts` para mapear os novos campos.
- [x] Sincronizar `src/integrations/supabase/types.ts` com a tabela `stock_movements` e novas colunas em `products` / `restaurant_settings`. (Será sobrescrito quando rodar `supabase gen types typescript` após aplicar a migration; mantido manualmente para `tsc` continuar verde no MVP.)
- [x] **Sem** mudanças em `permission_type` — permissão reutilizada é `products_manage`.

**Verificação:** `npx tsc --noEmit` ✅ · `npx eslint src/types/product.ts src/utils/formatProductFromSupabase.ts src/integrations/supabase/types.ts --max-warnings 0` ✅.

---

## Bloco C — Camada de movimentação (única porta para alterar saldo)

**Objetivo:** todo lugar do sistema usa o mesmo conjunto de funções para mexer em estoque. Padrão: `SECURITY DEFINER` em `public`, `SET search_path = public`, `REVOKE EXECUTE FROM PUBLIC, anon` (mantendo o padrão de `20260507101000_revoke_anon_security_definer_execute.sql`).

> Migration: [`supabase/migrations/20260520120100_create_stock_control_rpcs.sql`](../supabase/migrations/20260520120100_create_stock_control_rpcs.sql).

### C1. `apply_stock_movement(jsonb) RETURNS jsonb` — helper interno
- [x] Aceita `restaurant_id`, `product_id`, `quantity_delta`, `movement_type`, `order_id`, `order_item_id`, `idempotency_key`, `reason`, `notes`, `allow_negative`, `actor_id`.
- [x] No-op silencioso quando `stock_tracking_enabled = false` (retorna `{ skipped: true, reason: 'tracking_disabled' }`).
- [x] Idempotência: se já houver movimento com a mesma `idempotency_key`, devolve o existente sem repetir o trabalho.
- [x] Concorrência: `SELECT … FOR UPDATE` no produto + `RAISE EXCEPTION 'Estoque insuficiente …'` quando saldo ficaria negativo e `allow_negative = false`.
- [x] Captura `unique_violation` (race rara entre verificação e insert) revertendo o saldo e devolvendo o movimento ganhador.
- [x] `REVOKE EXECUTE` total para clientes; só `service_role` chama diretamente (usado internamente pelas demais funções deste bloco).

### C2. `apply_stock_for_order(uuid, boolean) RETURNS jsonb`
- [x] Itera `order_items` com `product_id NOT NULL` e produto com tracking ativo.
- [x] **Estado por item** = nº de vendas ativas − nº de estornos. Pula itens com estado ≥ 1 (já tem venda ativa).
- [x] **Ciclo** = `count(sale_revert)` para o item; idempotency_key = `'order_item:<id>:<sale|manual_negative_override>:<ciclo>'`.
- [x] Quando chamada com `p_allow_negative = true`, registra movimento como `manual_negative_override` (caminho do override do PDV).
- [x] Usado em (Bloco D): criação inicial pela RPC do pedido **e** reabertura via `update_order_status`.

### C3. `revert_stock_for_order(uuid) RETURNS jsonb`
- [x] Itera `order_items` com `product_id NOT NULL`.
- [x] Estorna apenas os itens com estado ≥ 1; idempotency_key = `'order_item:<id>:sale_revert:<ciclo>'`.
- [x] `allow_negative = true` no estorno (saldo só sobe).
- [x] Chamada a partir de `update_order_status` (Bloco D) quando alvo é `cancelado` ou `pagamento_falhou`.

### C4. `adjust_stock(jsonb) RETURNS jsonb` — face pública para a UI
- [x] Tipos aceitos: `adjustment_in`, `adjustment_out`, `inventory_count`.
- [x] Para `inventory_count` espera `target_quantity` e calcula o delta no servidor (sem race com saldo lido na UI).
- [x] Exige `user_has_restaurant_permission(restaurant_id, 'products_manage')`.
- [x] Exige `reason` não-vazio (auditoria).
- [x] `GRANT EXECUTE TO authenticated` (única função do bloco exposta ao client).

### C5. Testes
- [ ] Roteiro manual no Bloco J cobrirá: venda feliz, falta de saldo, idempotência, ciclo cancel→reabrir→cancelar, override negativo, ajuste manual, inventário sem mudança. Testes automatizados (pgTAP) ficam para o roadmap.

---

## Bloco D — Integração com pedidos (baixa e estorno)

**Objetivo:** alterar as RPCs existentes sem mudar contrato com o front. Cada chamada permanece atômica; estoque é só um passo a mais dentro do mesmo `BEGIN/END`.

> Migration: [`supabase/migrations/20260520120200_apply_stock_in_order_rpcs.sql`](../supabase/migrations/20260520120200_apply_stock_in_order_rpcs.sql) — recria por inteiro `create_pos_order`, `create_public_menu_order` e `update_order_status` com diferenças marcadas como `-- [estoque]`.

### D1. `create_public_menu_order` (cardápio público)
- [x] `PERFORM public.apply_stock_for_order(v_order_id, false)` após inserir os `order_items`, antes da inserção em `delivery_orders`.
- [x] Sem override no canal público (cliente final nunca força venda sem saldo).
- [x] Mensagem de erro padronizada vinda de `apply_stock_movement`: `Estoque insuficiente para "{nome}": disponível X, solicitado Y.`. UI deve mapear para texto neutro tipo "Esgotado" antes de mostrar ao consumidor (ajuste em `src/services/menuThemeService.ts` continua em E5).
- [x] Idempotência via `idempotency_key` por ciclo (Bloco C). Retentativa de POST não duplica baixa.

### D2. `create_pos_order` (PDV)
- [x] Mesmo padrão de D1.
- [x] Aceita `allow_negative_override` (bool) + `negative_override_reason` (text) no payload.
- [x] Override exige `user_has_restaurant_permission('products_manage')` e motivo não-vazio. Falha em qualquer um lança exceção antes de tocar estoque.
- [x] Quando ativo, registra movimento como `manual_negative_override` (Bloco G).

### D3. `update_order_status`
- [x] Antes: bloqueava `cancelado/finalizado → pendente` com EXCEPTION. Agora a transição é permitida e revalida estoque via `apply_stock_for_order`. Se faltar saldo, RPC explode, status não muda, front mostra mensagem.
- [x] Alvo `cancelado` ou `pagamento_falhou` → `revert_stock_for_order` antes do `UPDATE` final.
- [x] Demais transições não tocam estoque.
- [x] Resposta extendida com `reopened` e `reverted_stock` (campos novos, sem quebrar consumidores existentes).

### D4. Garantias transversais
- [x] Falha em qualquer função do Bloco C → rollback total via exceção propagada. Pedido NÃO fica órfão e saldo NÃO fica fora de sincronia.
- [x] Itens com `product_id IS NULL` (fluxo iFood atual) são ignorados pelo `apply_stock_for_order` / `revert_stock_for_order`. Comportamento atual da edge function `ifood-integration` permanece intacto.
- [x] Comentários `-- [estoque]` no SQL marcam todas as diferenças em relação à versão anterior, facilitando review e futuras manutenções.
- [ ] **Pós-MVP:** instrumentar `supabase/functions/ifood-integration/index.ts` para contar quantos `order_items` ficaram sem `product_id` e registrar no README do módulo iFood.

---

## Bloco E — UI administrativa

**Objetivo:** gestão pelo dono da loja. Toda escrita passa pelas RPCs do Bloco C — nenhum componente faz `UPDATE` direto em `products.stock_quantity`.

### E1. Configuração geral do restaurante
- [x] Card `StockSettingsCard` (`src/components/produtos/StockSettingsCard.tsx`) plugado em `PersonalizacaoTab` (perto do `HoursManager`). Hook `useStockSettings` (`src/hooks/useStockSettings.ts`) lê e grava em `restaurant_settings` no padrão **key/value** (`setting_key='stock_control'`, `setting_value={enabled}`).
- [x] **Decisão de modelagem:** abandonamos a coluna plana `restaurant_settings.stock_control_enabled` (criada na migration B1 mas ambígua, já que `restaurant_settings` é tabela key/value). A flag oficial vive no JSON. A coluna plana fica como _deprecated/no-op_ para evitar mais uma migration agora.
- [x] Quando a chave global está desligada, a seção de estoque some no formulário de produto e os botões "Ajustar estoque" e "Histórico" deixam de aparecer na lista.

### E2. Cadastro de produto
- [x] `ProdutoForm` ganhou seção "Estoque" condicionada à flag global (`stockControlEnabled` prop). `AddProdutoDialog` e `EditProdutoDialog` resolvem a flag via `useStockSettings`.
- [x] Toggle "Controlar estoque deste produto" (`stock_tracking_enabled`); ao desligar, limpa `stock_min_quantity` e `stock_is_fractional` para evitar lixo no banco.
- [x] Campo "Contagem inicial" só aparece em **criação** ou quando o produto está sendo **ativado** agora (antes não rastreava). Em produtos já rastreados, o saldo só muda via "Ajustar estoque".
- [x] Após o `INSERT` do produto, `useProdutos` chama a RPC `adjust_stock` com `movement_type='inventory_count'` para registrar a contagem inicial — saldo nunca é gravado direto pela UI. A migração da rota de **edição** segue o mesmo caminho quando o tracking é ativado pela primeira vez.
- [x] `PRODUCT_SELECT` foi estendido com `stock_*` e o helper `withProductAuditFields` passou a stripar essas colunas no fallback legado.

### E3. Página de produtos
- [x] `StockBadge` na coluna "Estoque" do `ProdutosList`: "Sem controle" (slate), saldo (emerald), "Baixo · X" (amber, quando `stock_quantity <= stock_min_quantity`), "Esgotado" (red, quando `<= 0`). Usa `Math.round` para saldos inteiros e `toLocaleString('pt-BR', { maximumFractionDigits: 3 })` para fracionados.
- [x] Coluna só aparece quando a flag global está ligada **ou** quando algum produto já está rastreado (resiliente ao caso "desliguei a global mas tem rastreamento legado").
- [x] Botões "Ajustar estoque" (ícone `Boxes`) e "Histórico" (ícone `History`) por linha, gated por `canManage` e por `stock_tracking_enabled`.
- [ ] **Falta:** filtros novos no `useProdutos` ("abaixo do mínimo" / "esgotados") como tabs adicionais. Não bloqueia o MVP — a coluna já evidencia visualmente.

### E4. Ajuste manual / inventário
- [x] `AjustarEstoqueDialog` (`src/components/produtos/AjustarEstoqueDialog.tsx`) com três tipos: entrada / saída / inventário. Inventário envia `target_quantity` e o servidor calcula o delta (sem race com saldo lido na UI).
- [x] Motivo obrigatório (front + back).
- [x] Chama `supabase.rpc('adjust_stock', { p_args })`. Mensagem de erro do back é exibida via `toast.error(error.message)`.
- [x] `Produtos.tsx` passa `fetchProdutos` como `onStockChanged` para a lista re-buscar saldos depois do ajuste.

### E5. Histórico de movimentações
- [x] `HistoricoEstoqueDialog` (`src/components/produtos/HistoricoEstoqueDialog.tsx`) lê os 50 últimos movimentos do produto (filtro `product_id`), ordenados por `created_at desc`.
- [x] Layout em lista vertical: badge tipificada por `movement_type` (cores por categoria), data formatada `pt-BR`, motivo, observações, link curto para `order_id` quando houver, e delta colorido (vermelho saída, verde entrada).
- [x] RLS (`stock_movements_select_own_restaurant`) garante que só usuários do restaurante leem.
- [ ] **Falta (pós-MVP):** paginação real, filtros por tipo/período, e exibição do nome do `created_by` (hoje só temos o UUID).

### E6. Permissões na UI
- [x] Toda ação de escrita (toggle global, ajuste, edição com tracking) já é gated pelo `hasPermission('products_manage')` existente em `Produtos.tsx`. A RPC `adjust_stock` também valida `products_manage` no servidor (defesa em profundidade).
- [x] Visualização de saldo segue o padrão atual de `products_view` (lista de produtos é gated por `products_view` na rota).

**Verificação:** `npx tsc --noEmit` ✅ · `npm run lint:src` ✅ · `npx vitest run` (29/29) ✅.

---

## Bloco F — Menu público / cardápio digital

**Objetivo:** cliente não finalize compra impossível nem veja item “disponível” quando zerado (conforme política).

- [x] Ao montar dados públicos (**`src/services/menuThemeService.ts`**, tipos em **`src/types/menuTheme.ts`**): o serviço busca `stock_tracking_enabled`/`stock_quantity` apenas para derivar `is_sold_out`, e retorna ao cliente somente a flag booleana — sem vazar saldo numérico.
- [x] Componentes de tema / modal de item (**`src/components/public-menu/themes/*`**, **`AddItemModal`**): UX **“Esgotado”** exibida nos temas; no tema operacional de delivery, o botão “Adicionar” fica bloqueado e o modal também impede confirmação defensivamente.
- [x] Garantir condição de corrida: validação final continua **na RPC** `create_public_menu_order` (fonte da verdade). A flag pública é apenas UX/antecipação.

**Verificação:** `npx tsc --noEmit -p tsconfig.app.json` ✅ · `npm run lint:src` ✅ · `npx vitest run` (29/29) ✅.

---

## Bloco G — PDV e fluxos internos

**Objetivo:** paridade com menu público + override controlado.

- [x] PDV (`src/pages/PDV.tsx`) + `salvarPedido` em `src/features/pdv/services/pedidoService.ts`: erros de estoque detectados por regex na mensagem da RPC (`Estoque insuficiente…`, permissão/motivo de override) retornam `needsStockOverride` **sem** toast genérico; demais erros seguem com toast.
- [x] Quando `needsStockOverride`, `usePDVHook` abre `OverrideEstoqueDialog` (`src/features/pdv/components/OverrideEstoqueDialog.tsx`). Botão “Vender mesmo assim” só aparece com `hasPermission('products_manage')`; confirmação chama `create_pos_order` com `allow_negative_override: true` + `negative_override_reason` (motivo obrigatório na UI).
- [x] Histórico / mudança de status: `alterarStatusPedido` → `update_order_status`; falha na reabertura (`pendente`) por falta de saldo exibe toast explícito com o texto da RPC (`Não foi possível reabrir o pedido: …`). Sucesso de reabertura / estorno usa toasts distintos quando o payload inclui `reopened` / `reverted_stock`.
- [ ] Validação otimista no cliente (mostrar “Esgotado” no card do produto no PDV) — **nunca** substitui a checagem na RPC *(opcional pós-MVP)*.

**Verificação:** `npx tsc --noEmit -p tsconfig.app.json` ✅ · `npm run lint:src` ✅ · `npx vitest run` (29/29) ✅.

**Nota:** `src/pages/PDVOnline.tsx` é página de marketing (landing); o fluxo operacional do PDV é `PDV.tsx`.

---

## Bloco H — Integrações externas

**Objetivo:** não divergir estoque entre canais — com política realista para dados incompletos.

- [x] **H0 — Documentar limitação atual:** `supabase/functions/ifood-integration/index.ts` grava itens com **`product_id` nulo** → baixa automática por produto **não aplica** até haver mapeamento. Ver `docs/INTEGRACOES_ESTOQUE.md`.
- [x] **H1 — MVP operacional:** estoque interno continua verdadeiro para cardápio + PDV; pedidos iFood entram como hoje e podem ser reconciliados por **ajuste manual** (Bloco E) ou ignorados no relatório de consumo por SKU.
- [x] **Instrumentação mínima:** a Edge Function do iFood registra em log quantos itens foram importados sem vínculo de produto (`unmappedItems`), preservando comportamento atual.
- [x] **H2 — Evolução documentada:** tabela/campo de **mapeamento** (SKU/código iFood → `products.id`) na importação; só então aplicar mesma RPC de baixa ou fatiar movimento na Edge Function com **service role** e função interna idempotente (`ifood_id` + índice da linha).
- [x] Quando status iFood → cancelado já refletir em `orders.status`/`update_order_status`, acoplar **estorno** aos mesmos ganhos do Bloco D; hoje `updateOrderStatusInIfood` ainda não está habilitado, então a paridade de cancelamento com estoque fica como fase posterior ao mapeamento.
- [ ] (Opcional) Pausar item no marketplace quando zerado — depende da API iFood e do catálogo vinculado.

**Verificação:** documentação + log sem alteração de contrato; `npx tsc --noEmit -p tsconfig.app.json` ✅ · `npm run lint:src` ✅.

---

## Bloco I — Relatórios, alertas, polish

- [x] Relatório/widget inicial: `src/pages/Produtos.tsx` agora exibe indicador **Baixo estoque** e aba dedicada. O cálculo considera produtos com tracking ativo e saldo zerado ou `stock_quantity <= stock_min_quantity`.
- [x] Filtro operacional em `src/hooks/useProdutos.ts`: aba **Baixo estoque** pagina apenas produtos que exigem atenção, reaproveitando busca/categoria/ordenação da lista.
- [ ] Exportação simples (CSV) de movimentos — se aceito no checklist de decisões.
- [ ] Dashboard opcional: consumo por período (derivado de `stock_movements` tipo sale).
- [x] Empty states/textos de ajuda básicos seguem o `ProdutosList`; baixo estoque sem resultados reutiliza o estado “Nenhum produto encontrado”.

**Verificação:** `npx tsc --noEmit -p tsconfig.app.json` ✅ · `npm run lint:src` ✅ · `npx vitest run` (29/29) ✅.

---

## Bloco J — QA, documentação, go-live

- [x] Casos de teste manuais (roteirados em `docs/QA_ROTEIROS_MANUAIS.md`):
  - Venda feliz com tracking ligado / desligado.
  - Falta de estoque no cardápio público (ver “Esgotado”).
  - Falta de estoque no PDV + override por gestor com motivo.
  - Cancelamento total → saldo retorna.
  - Reabrir pedido com saldo suficiente → re-baixa.
  - Reabrir pedido sem saldo → bloqueio com mensagem.
  - Pedido pago online: aguardando_pagamento mantém baixa; pagamento_falhou estorna.
  - Pedido iFood entra com `product_id` nulo → não baixa, não quebra; ajuste manual funciona.
  - Idempotência: rodar a mesma RPC duas vezes não duplica movimento.
- [x] Atualizar FAQ (`src/pages/FAQ.tsx`) com regra de estoque opcional e limitação iFood. Textos de planos/landing não prometem baixa automática de estoque.
- [x] Atualizar `docs/IMPLEMENTATION_STATUS.md` movendo “Sistema de Estoque” para concluído.
- [x] Checklist de deploy/smoke test documentado em `docs/RUNBOOK_PRODUCAO.md`.
- [ ] Comunicação de release para usuários existentes (“ativa quando quiser por produto”).
- [ ] Abrir o PR final da branch `controle-estoque-opcional` para `main` com este documento como changelog principal.

---

## Critérios de aceite globais (Definition of Done)

- [ ] Produto sem tracking **não** altera saldo e **não** bloqueia vendas por estoque.
- [ ] Produto com tracking **bloqueia** venda quando saldo insuficiente (política MVP) **nas RPCs** `create_public_menu_order` e `create_pos_order`.
- [ ] Cancelamento **restaura** saldo de forma rastreável via **`update_order_status`** (e equivalentes documentados).
- [ ] **Reabrir pedido** não corrompe saldo (nem deixa de baixar de novo) — cenário coberto em QA.
- [ ] Histórico de movimentos permite responder: “por que este saldo está X?” em suporte.
- [ ] RLS impede leitura/escrita entre restaurantes.
- [ ] Integrações com linhas **sem `product_id`** não quebram RPCs nem geram baixa fantasma; comportamento documentado (Bloco H).

---

## Notas de evolução (fora do escopo deste roteiro, mas preparar o desenho)

- Insumos e **receitas (BOM)** — tabela de composição e baixa em cascata.
- Lotes e validade.
- Multi-depósito e transferências.
- Reserva de estoque no carrinho com TTL.

---

**Última atualização:** 2026-05-16 — Blocos F, G, H e recorte inicial do I implementados/documentados; pendem QA/manual e itens opcionais de relatório/exportação.
