-- =====================================================================
-- Estoque opcional — Bloco C (camada única de movimentação)
--
-- Roteiro: docs/ROTEIRO_ESTOQUE_OPCIONAL.md
-- Branch:  controle-estoque-opcional
-- Depende de: 20260520120000_create_stock_control_schema.sql
--
-- Princípio: toda alteração de `products.stock_quantity` passa por uma
-- destas funções. Nenhum lugar do código (RPC, trigger, UI) deve fazer
-- UPDATE direto em `products.stock_quantity`.
--
-- Funções:
--   * apply_stock_movement(jsonb)              — helper interno
--   * apply_stock_for_order(uuid, boolean)     — chamada por
--                                                create_pos_order /
--                                                create_public_menu_order
--                                                e pela reabertura
--   * revert_stock_for_order(uuid)             — chamada pelo
--                                                update_order_status no
--                                                cancelamento
--   * adjust_stock(jsonb)                      — pública para a UI:
--                                                ajuste manual e
--                                                contagem de inventário
--
-- Idempotência: cada inserção em `stock_movements` carrega um
-- `idempotency_key` único parcial. Para movimentos ligados a pedido,
-- a chave inclui o "ciclo" (número de cancelamentos já efetivados),
-- permitindo que o caminho cancelar → reabrir → cancelar funcione sem
-- colidir com chaves antigas.
--
-- Override negativo (manual_negative_override): autorizado apenas com
-- permissão `products_manage` e motivo. Tratado como uma "sale" no
-- cômputo de estado; o estorno na cancelação retorna saldo do mesmo
-- jeito.
-- =====================================================================

-- ---------------------------------------------------------------------
-- C1. apply_stock_movement — helper interno.
-- Aceita um payload jsonb e insere uma linha em `stock_movements`,
-- atualizando `products.stock_quantity` na mesma transação.
--
-- Não valida permissões (callers superiores fazem). Não tem lógica de
-- estado (callers superiores decidem se é hora de chamar). Apenas:
--   * checa se produto tem tracking ativo (no-op em caso contrário);
--   * trata negativo conforme `allow_negative`;
--   * captura unique_violation do `idempotency_key` retornando o
--     movimento existente.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.apply_stock_movement(p_args jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_restaurant_id uuid;
  v_product_id uuid;
  v_quantity_delta numeric;
  v_movement_type text;
  v_reason text;
  v_notes text;
  v_order_id uuid;
  v_order_item_id uuid;
  v_idempotency_key text;
  v_allow_negative boolean;
  v_actor_id uuid;
  v_product record;
  v_new_quantity numeric;
  v_movement_id uuid;
  v_existing_movement record;
BEGIN
  v_restaurant_id := NULLIF(p_args->>'restaurant_id', '')::uuid;
  v_product_id := NULLIF(p_args->>'product_id', '')::uuid;
  v_quantity_delta := NULLIF(p_args->>'quantity_delta', '')::numeric;
  v_movement_type := NULLIF(p_args->>'movement_type', '');
  v_reason := NULLIF(btrim(COALESCE(p_args->>'reason', '')), '');
  v_notes := NULLIF(btrim(COALESCE(p_args->>'notes', '')), '');
  v_order_id := NULLIF(p_args->>'order_id', '')::uuid;
  v_order_item_id := NULLIF(p_args->>'order_item_id', '')::uuid;
  v_idempotency_key := NULLIF(p_args->>'idempotency_key', '');
  v_allow_negative := COALESCE((p_args->>'allow_negative')::boolean, false);
  v_actor_id := COALESCE(NULLIF(p_args->>'actor_id', '')::uuid, auth.uid());

  IF v_restaurant_id IS NULL THEN
    RAISE EXCEPTION 'apply_stock_movement: restaurant_id é obrigatório.';
  END IF;
  IF v_product_id IS NULL THEN
    RAISE EXCEPTION 'apply_stock_movement: product_id é obrigatório.';
  END IF;
  IF v_movement_type IS NULL THEN
    RAISE EXCEPTION 'apply_stock_movement: movement_type é obrigatório.';
  END IF;
  IF v_quantity_delta IS NULL OR v_quantity_delta = 0 THEN
    RAISE EXCEPTION 'apply_stock_movement: quantity_delta deve ser diferente de zero.';
  END IF;

  -- Idempotência: se já temos um movimento com a mesma chave, retornar.
  IF v_idempotency_key IS NOT NULL THEN
    SELECT *
    INTO v_existing_movement
    FROM public.stock_movements
    WHERE idempotency_key = v_idempotency_key
    LIMIT 1;

    IF FOUND THEN
      RETURN jsonb_build_object(
        'movement_id', v_existing_movement.id,
        'product_id', v_existing_movement.product_id,
        'quantity_delta', v_existing_movement.quantity_delta,
        'movement_type', v_existing_movement.movement_type,
        'idempotent_replay', true
      );
    END IF;
  END IF;

  -- Trava o produto e checa que pertence ao restaurante.
  SELECT id, restaurant_id, name, stock_tracking_enabled, stock_quantity
  INTO v_product
  FROM public.products
  WHERE id = v_product_id
    AND restaurant_id = v_restaurant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'apply_stock_movement: produto inexistente ou não pertence ao restaurante.';
  END IF;

  -- Se tracking estiver desligado, no-op silencioso.
  IF NOT v_product.stock_tracking_enabled THEN
    RETURN jsonb_build_object(
      'skipped', true,
      'reason', 'tracking_disabled',
      'product_id', v_product.id
    );
  END IF;

  v_new_quantity := v_product.stock_quantity + v_quantity_delta;

  IF v_new_quantity < 0 AND NOT v_allow_negative THEN
    RAISE EXCEPTION 'Estoque insuficiente para "%": disponível %, solicitado %.',
      v_product.name, v_product.stock_quantity, ABS(v_quantity_delta)
      USING ERRCODE = 'check_violation';
  END IF;

  UPDATE public.products
  SET stock_quantity = v_new_quantity,
      updated_at = now()
  WHERE id = v_product.id;

  BEGIN
    INSERT INTO public.stock_movements (
      restaurant_id,
      product_id,
      quantity_delta,
      movement_type,
      reason,
      notes,
      order_id,
      order_item_id,
      idempotency_key,
      created_by
    )
    VALUES (
      v_restaurant_id,
      v_product_id,
      v_quantity_delta,
      v_movement_type,
      v_reason,
      v_notes,
      v_order_id,
      v_order_item_id,
      v_idempotency_key,
      v_actor_id
    )
    RETURNING id INTO v_movement_id;
  EXCEPTION
    WHEN unique_violation THEN
      -- Outra transação inseriu a mesma idempotency_key entre o SELECT e o INSERT.
      -- Reverte o UPDATE de saldo e devolve o movimento existente.
      UPDATE public.products
      SET stock_quantity = v_product.stock_quantity
      WHERE id = v_product.id;

      SELECT *
      INTO v_existing_movement
      FROM public.stock_movements
      WHERE idempotency_key = v_idempotency_key
      LIMIT 1;

      RETURN jsonb_build_object(
        'movement_id', v_existing_movement.id,
        'product_id', v_existing_movement.product_id,
        'quantity_delta', v_existing_movement.quantity_delta,
        'movement_type', v_existing_movement.movement_type,
        'idempotent_replay', true
      );
  END;

  RETURN jsonb_build_object(
    'movement_id', v_movement_id,
    'product_id', v_product.id,
    'quantity_delta', v_quantity_delta,
    'movement_type', v_movement_type,
    'new_quantity', v_new_quantity
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.apply_stock_movement(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_stock_movement(jsonb) TO service_role;

COMMENT ON FUNCTION public.apply_stock_movement(jsonb) IS
  'Helper interno do módulo de estoque. Não chamar do client; usar adjust_stock / apply_stock_for_order / revert_stock_for_order.';

-- ---------------------------------------------------------------------
-- C2. apply_stock_for_order — usado pelas RPCs de pedido (Bloco D).
-- Itera os order_items e, para cada um com `product_id` e tracking ativo,
-- aplica uma "sale" (ou "manual_negative_override" quando autorizado).
-- Idempotente por ciclo cancelar↔reabrir.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.apply_stock_for_order(
  p_order_id uuid,
  p_allow_negative boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_oi record;
  v_state integer;
  v_cycle integer;
  v_movement_type text;
  v_idempotency_key text;
  v_applied integer := 0;
  v_skipped integer := 0;
  v_result jsonb;
BEGIN
  IF p_order_id IS NULL THEN
    RAISE EXCEPTION 'apply_stock_for_order: order_id é obrigatório.';
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'apply_stock_for_order: pedido % não encontrado.', p_order_id;
  END IF;

  v_movement_type := CASE WHEN p_allow_negative THEN 'manual_negative_override' ELSE 'sale' END;

  FOR v_oi IN
    SELECT oi.id AS order_item_id,
           oi.product_id,
           oi.quantity::numeric AS quantity,
           p.stock_tracking_enabled
    FROM public.order_items oi
    LEFT JOIN public.products p ON p.id = oi.product_id
    WHERE oi.order_id = p_order_id
      AND oi.product_id IS NOT NULL
  LOOP
    -- Pula itens cujo produto não controla estoque (ex.: itens iFood
    -- mapeados, mas o catálogo está com tracking off; ou itens normais
    -- sem tracking).
    IF NOT COALESCE(v_oi.stock_tracking_enabled, false) THEN
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

    -- Estado do item: nº de vendas ativas - nº de estornos.
    SELECT
      COALESCE(SUM(CASE WHEN movement_type IN ('sale', 'manual_negative_override') THEN 1 ELSE 0 END), 0)
      - COALESCE(SUM(CASE WHEN movement_type = 'sale_revert' THEN 1 ELSE 0 END), 0)
    INTO v_state
    FROM public.stock_movements
    WHERE order_item_id = v_oi.order_item_id;

    IF v_state >= 1 THEN
      -- Já há venda ativa para esse item neste ciclo: nada a fazer.
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

    -- Ciclo = quantos cancelamentos já ocorreram para esse item.
    SELECT COUNT(*)::integer INTO v_cycle
    FROM public.stock_movements
    WHERE order_item_id = v_oi.order_item_id
      AND movement_type = 'sale_revert';

    v_idempotency_key := format(
      'order_item:%s:%s:%s',
      v_oi.order_item_id,
      v_movement_type,
      v_cycle
    );

    PERFORM public.apply_stock_movement(jsonb_build_object(
      'restaurant_id', v_order.restaurant_id,
      'product_id', v_oi.product_id,
      'quantity_delta', - v_oi.quantity,
      'movement_type', v_movement_type,
      'order_id', p_order_id,
      'order_item_id', v_oi.order_item_id,
      'idempotency_key', v_idempotency_key,
      'allow_negative', p_allow_negative,
      'reason', CASE WHEN p_allow_negative THEN 'venda_autorizada_sem_saldo' ELSE NULL END
    ));

    v_applied := v_applied + 1;
  END LOOP;

  v_result := jsonb_build_object(
    'order_id', p_order_id,
    'applied', v_applied,
    'skipped', v_skipped
  );
  RETURN v_result;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.apply_stock_for_order(uuid, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_stock_for_order(uuid, boolean) TO service_role;

COMMENT ON FUNCTION public.apply_stock_for_order(uuid, boolean) IS
  'Aplica baixa de estoque para os itens de um pedido. Chamada pelas RPCs create_pos_order, create_public_menu_order e na reabertura via update_order_status. Idempotente por ciclo cancel↔reabrir.';

-- ---------------------------------------------------------------------
-- C3. revert_stock_for_order — usado por update_order_status no
-- cancelamento. Devolve saldo de cada item com venda ativa.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.revert_stock_for_order(p_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_oi record;
  v_state integer;
  v_cycle integer;
  v_idempotency_key text;
  v_reverted integer := 0;
  v_skipped integer := 0;
BEGIN
  IF p_order_id IS NULL THEN
    RAISE EXCEPTION 'revert_stock_for_order: order_id é obrigatório.';
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'revert_stock_for_order: pedido % não encontrado.', p_order_id;
  END IF;

  FOR v_oi IN
    SELECT oi.id AS order_item_id,
           oi.product_id,
           oi.quantity::numeric AS quantity
    FROM public.order_items oi
    WHERE oi.order_id = p_order_id
      AND oi.product_id IS NOT NULL
  LOOP
    -- Existe venda ativa para esse item?
    SELECT
      COALESCE(SUM(CASE WHEN movement_type IN ('sale', 'manual_negative_override') THEN 1 ELSE 0 END), 0)
      - COALESCE(SUM(CASE WHEN movement_type = 'sale_revert' THEN 1 ELSE 0 END), 0)
    INTO v_state
    FROM public.stock_movements
    WHERE order_item_id = v_oi.order_item_id;

    IF v_state <= 0 THEN
      -- Nada para estornar (item nunca consumiu estoque ou já foi estornado).
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

    -- Conta de estornos prévios para compor o ciclo.
    SELECT COUNT(*)::integer INTO v_cycle
    FROM public.stock_movements
    WHERE order_item_id = v_oi.order_item_id
      AND movement_type = 'sale_revert';

    v_idempotency_key := format(
      'order_item:%s:sale_revert:%s',
      v_oi.order_item_id,
      v_cycle
    );

    PERFORM public.apply_stock_movement(jsonb_build_object(
      'restaurant_id', v_order.restaurant_id,
      'product_id', v_oi.product_id,
      'quantity_delta', v_oi.quantity,
      'movement_type', 'sale_revert',
      'order_id', p_order_id,
      'order_item_id', v_oi.order_item_id,
      'idempotency_key', v_idempotency_key,
      'allow_negative', true,  -- estorno sempre aceito (saldo só sobe).
      'reason', 'cancelamento_pedido'
    ));

    v_reverted := v_reverted + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'order_id', p_order_id,
    'reverted', v_reverted,
    'skipped', v_skipped
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.revert_stock_for_order(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.revert_stock_for_order(uuid) TO service_role;

COMMENT ON FUNCTION public.revert_stock_for_order(uuid) IS
  'Estorna baixas de estoque dos itens de um pedido. Chamada pelo update_order_status quando o pedido entra em cancelado ou pagamento_falhou. Idempotente.';

-- ---------------------------------------------------------------------
-- C4. adjust_stock — face pública para a UI fazer ajuste manual e
-- contagem de inventário. Valida permissão `products_manage`.
--
-- Tipos aceitos: 'adjustment_in', 'adjustment_out', 'inventory_count'.
-- Para 'inventory_count' o caller envia `target_quantity` e a função
-- calcula o delta. Para os outros, envia `quantity` (positivo).
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.adjust_stock(p_args jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_restaurant_id uuid;
  v_product_id uuid;
  v_movement_type text;
  v_quantity numeric;
  v_target_quantity numeric;
  v_quantity_delta numeric;
  v_reason text;
  v_notes text;
  v_product record;
  v_result jsonb;
BEGIN
  v_restaurant_id := NULLIF(p_args->>'restaurant_id', '')::uuid;
  v_product_id := NULLIF(p_args->>'product_id', '')::uuid;
  v_movement_type := NULLIF(p_args->>'movement_type', '');
  v_quantity := NULLIF(p_args->>'quantity', '')::numeric;
  v_target_quantity := NULLIF(p_args->>'target_quantity', '')::numeric;
  v_reason := NULLIF(btrim(COALESCE(p_args->>'reason', '')), '');
  v_notes := NULLIF(btrim(COALESCE(p_args->>'notes', '')), '');

  IF v_restaurant_id IS NULL THEN
    RAISE EXCEPTION 'Restaurante não informado.';
  END IF;
  IF v_product_id IS NULL THEN
    RAISE EXCEPTION 'Produto não informado.';
  END IF;
  IF v_movement_type IS NULL OR v_movement_type NOT IN ('adjustment_in', 'adjustment_out', 'inventory_count') THEN
    RAISE EXCEPTION 'Tipo de ajuste inválido.';
  END IF;

  IF NOT public.user_has_restaurant_permission(v_restaurant_id, 'products_manage'::public.permission_type) THEN
    RAISE EXCEPTION 'Sem permissão para ajustar estoque.';
  END IF;

  -- Trava o produto para calcular o delta com saldo atualizado.
  SELECT id, restaurant_id, name, stock_tracking_enabled, stock_quantity
  INTO v_product
  FROM public.products
  WHERE id = v_product_id
    AND restaurant_id = v_restaurant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Produto inexistente ou não pertence ao restaurante.';
  END IF;

  IF NOT v_product.stock_tracking_enabled THEN
    RAISE EXCEPTION 'O produto "%" não tem controle de estoque ativo.', v_product.name;
  END IF;

  -- Compõe o delta conforme o tipo do ajuste.
  IF v_movement_type = 'inventory_count' THEN
    IF v_target_quantity IS NULL OR v_target_quantity < 0 THEN
      RAISE EXCEPTION 'Para inventário, informe target_quantity (>= 0).';
    END IF;
    v_quantity_delta := v_target_quantity - v_product.stock_quantity;

    IF v_quantity_delta = 0 THEN
      RETURN jsonb_build_object(
        'skipped', true,
        'reason', 'no_change',
        'product_id', v_product.id,
        'stock_quantity', v_product.stock_quantity
      );
    END IF;
  ELSE
    IF v_quantity IS NULL OR v_quantity <= 0 THEN
      RAISE EXCEPTION 'Quantidade do ajuste deve ser maior que zero.';
    END IF;
    v_quantity_delta := CASE v_movement_type
      WHEN 'adjustment_in' THEN v_quantity
      WHEN 'adjustment_out' THEN - v_quantity
    END;
  END IF;

  IF v_reason IS NULL THEN
    RAISE EXCEPTION 'O motivo é obrigatório para ajustes manuais.';
  END IF;

  v_result := public.apply_stock_movement(jsonb_build_object(
    'restaurant_id', v_restaurant_id,
    'product_id', v_product_id,
    'quantity_delta', v_quantity_delta,
    'movement_type', v_movement_type,
    'reason', v_reason,
    'notes', v_notes,
    'allow_negative', false  -- ajuste de saída nunca derruba para negativo.
  ));

  RETURN v_result;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.adjust_stock(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.adjust_stock(jsonb) TO authenticated, service_role;

COMMENT ON FUNCTION public.adjust_stock(jsonb) IS
  'Ajuste manual / contagem de inventário pela UI. Tipos aceitos: adjustment_in, adjustment_out, inventory_count. Exige products_manage.';
