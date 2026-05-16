-- =====================================================================
-- Estoque opcional — Bloco B (schema base)
--
-- Roteiro: docs/ROTEIRO_ESTOQUE_OPCIONAL.md
-- Branch:  controle-estoque-opcional
--
-- Este migration apenas cria a estrutura. O comportamento (baixa,
-- estorno, idempotência, override negativo, validações) vive nas RPCs
-- do Bloco C (próxima migration) que escrevem em `stock_movements`.
-- Nenhum cliente autenticado escreve diretamente: as policies abaixo
-- só permitem SELECT escopado por restaurante; a gravação acontece
-- exclusivamente via funções SECURITY DEFINER, no padrão já usado
-- por `create_pos_order` / `create_public_menu_order`.
--
-- Princípio: "saldo é consequência de movimentos". A coluna
-- `products.stock_quantity` é cache de leitura; toda alteração precisa
-- inserir uma linha em `stock_movements`. Auditoria e suporte dependem
-- disso.
--
-- Idempotência: a tabela tem uma coluna `idempotency_key` text com
-- índice único parcial. As RPCs do Bloco C compõem essa chave a partir
-- do contexto (`order_item_id` + tipo + ciclo de cancel/reabertura)
-- para evitar baixas/estornos duplicados em retries de rede.
-- =====================================================================

-- ---------------------------------------------------------------------
-- B1 — Chave geral por restaurante.
-- Default false: nenhum tenant existente passa a controlar estoque
-- automaticamente. Espelha o padrão de `opening_time`/`closing_time`
-- (ver 20260501009000_add_opening_closing_hours_and_order_position).
-- ---------------------------------------------------------------------
ALTER TABLE public.restaurant_settings
  ADD COLUMN IF NOT EXISTS stock_control_enabled boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.restaurant_settings.stock_control_enabled IS
  'Liga o módulo de estoque para o restaurante. Quando desligada, a UI esconde toda a seção e a flag por produto não tem efeito.';

-- ---------------------------------------------------------------------
-- B2 — Campos de estoque por produto.
-- Defaults seguros: tracking desligado, saldo zero, sem mínimo, inteiro.
-- Não há CHECK que proíba saldo negativo: o controle é feito nas RPCs
-- (Bloco C) para suportar o override de venda autorizada por gestor
-- previsto no Bloco G.
-- ---------------------------------------------------------------------
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS stock_tracking_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stock_quantity numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stock_min_quantity numeric NULL,
  ADD COLUMN IF NOT EXISTS stock_is_fractional boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.products.stock_tracking_enabled IS
  'Quando true, vendas deste produto deduzem `stock_quantity` via RPC. Default false mantém comportamento atual.';
COMMENT ON COLUMN public.products.stock_quantity IS
  'Saldo atual em estoque. NUNCA atualizar diretamente — usar RPC apply_stock_movement (Bloco C). Negativo só é possível via override autorizado.';
COMMENT ON COLUMN public.products.stock_min_quantity IS
  'Saldo mínimo para alerta visual. NULL = sem alerta.';
COMMENT ON COLUMN public.products.stock_is_fractional IS
  'Se true, UI permite quantidades fracionadas (peso, dose). Default inteiro.';

CREATE INDEX IF NOT EXISTS idx_products_low_stock
  ON public.products(restaurant_id)
  WHERE stock_tracking_enabled = true
    AND stock_min_quantity IS NOT NULL
    AND stock_quantity <= stock_min_quantity;

-- ---------------------------------------------------------------------
-- B3 — Tabela de movimentos.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id),
  quantity_delta numeric NOT NULL,
  movement_type text NOT NULL,
  reason text,
  notes text,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  order_item_id uuid REFERENCES public.order_items(id) ON DELETE SET NULL,
  idempotency_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT stock_movements_type_check CHECK (
    movement_type IN (
      'sale',
      'sale_revert',
      'adjustment_in',
      'adjustment_out',
      'inventory_count',
      'manual_negative_override'
    )
  ),
  CONSTRAINT stock_movements_delta_nonzero CHECK (quantity_delta <> 0)
);

COMMENT ON TABLE public.stock_movements IS
  'Histórico imutável de movimentações de estoque. Toda alteração de products.stock_quantity tem que ter uma linha aqui. Auditoria e suporte dependem disso.';
COMMENT ON COLUMN public.stock_movements.quantity_delta IS
  'Positivo = entrada (estorno, ajuste de entrada, contagem maior). Negativo = saída (venda, ajuste de saída).';
COMMENT ON COLUMN public.stock_movements.idempotency_key IS
  'Chave lógica para evitar baixa/estorno duplicado. Gerada pela RPC do Bloco C combinando order_item_id + tipo + ciclo cancel/reabertura.';

-- Índice principal de consulta: histórico por produto/tempo.
CREATE INDEX IF NOT EXISTS idx_stock_movements_restaurant_product_created
  ON public.stock_movements(restaurant_id, product_id, created_at DESC);

-- Auxiliar para reconciliar com pedidos (ex.: estornar todos os movimentos de um pedido).
CREATE INDEX IF NOT EXISTS idx_stock_movements_order
  ON public.stock_movements(order_id)
  WHERE order_id IS NOT NULL;

-- Suporta filtros de auditoria por usuário responsável.
CREATE INDEX IF NOT EXISTS idx_stock_movements_created_by
  ON public.stock_movements(created_by)
  WHERE created_by IS NOT NULL;

-- Idempotência forte ao nível do banco: dois inserts com a mesma chave falham.
-- A RPC captura unique_violation e retorna o movimento existente sem duplicar.
CREATE UNIQUE INDEX IF NOT EXISTS idx_stock_movements_idempotency_key
  ON public.stock_movements(idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- ---------------------------------------------------------------------
-- B4 — RLS.
-- Apenas SELECT é exposto a `authenticated`. Escrita acontece via
-- SECURITY DEFINER no Bloco C (mesmo padrão de `pagarme_webhook_events`,
-- `email_send_logs` etc.). Super admin enxerga tudo.
-- ---------------------------------------------------------------------
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "stock_movements_select_own_restaurant" ON public.stock_movements;
CREATE POLICY "stock_movements_select_own_restaurant"
  ON public.stock_movements
  FOR SELECT
  TO authenticated
  USING (
    restaurant_id = public.get_user_restaurant_id()
    OR public.is_super_admin(auth.uid())
  );

DROP POLICY IF EXISTS "stock_movements_super_admin_manage" ON public.stock_movements;
CREATE POLICY "stock_movements_super_admin_manage"
  ON public.stock_movements
  FOR ALL
  TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));
