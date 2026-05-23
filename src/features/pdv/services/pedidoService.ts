import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import {
  HistoricoPedidosResumo,
  HistoricoPedidosResultado,
  HistoricoStatusFiltro,
  ItemPedido,
  ProdutoSimplificado,
  Pedido,
  PedidoStatus,
} from "../types";
import { WhatsAppService } from "@/services/whatsapp/whatsappService";
import {
  mapPedidoStatusToDeliveryStatus,
  notifyDeliveryOrderStatusWhatsApp,
} from "@/lib/deliveryOrderStatusWhatsApp";
import { updateOrderStatusInIfood } from "@/services/ifood/syncService";
import { toast } from "sonner";

type PedidoQueryRow = {
  id: string;
  customer_name: string | null;
  created_at: string;
  status: string;
  source: string | null;
  order_type: string;
  table_id: string | null;
  total: number;
  payment_method: string | null;
  payment_status: string | null;
  order_items?: Array<{
    id: string;
    product_id: string | null;
    product_name: string;
    quantity: number;
    price: number;
    observations: string | null;
  }> | null;
  mesa?: {
    id: string;
    name: string | null;
    number: string | null;
  } | null;
};

interface ListarPedidosOptions {
  dataInicio?: string;
  dataFim?: string;
  status?: HistoricoStatusFiltro;
  pagina?: number;
  itensPorPagina?: number;
}

const formatMesaDisplay = (pedido: PedidoQueryRow) => {
  if (pedido.order_type === 'delivery') return 'Delivery';
  if (pedido.order_type === 'balcao') return 'Balcão';
  if (!pedido.mesa) return 'Balcão';

  if (pedido.mesa.number) return `Mesa ${pedido.mesa.number}`;
  if (pedido.mesa.name) return pedido.mesa.name;

  return 'Mesa';
};

const notifyMesasChanged = (restaurantId: string) => {
  window.dispatchEvent(new CustomEvent('mesas:changed', { detail: { restaurantId } }));
};

const RESUMO_VAZIO: HistoricoPedidosResumo = {
  totalPedidos: 0,
  totalVendido: 0,
  pedidosAbertos: 0,
  cancelados: 0,
};

type ResumoRpcResult = {
  totalPedidos?: number | null;
  totalVendido?: number | null;
  pedidosAbertos?: number | null;
  cancelados?: number | null;
};

const parseResumoRpc = (raw: unknown): HistoricoPedidosResumo => {
  if (!raw || typeof raw !== 'object') return { ...RESUMO_VAZIO };
  const value = raw as ResumoRpcResult;
  return {
    totalPedidos: Number(value.totalPedidos ?? 0),
    totalVendido: Number(value.totalVendido ?? 0),
    pedidosAbertos: Number(value.pedidosAbertos ?? 0),
    cancelados: Number(value.cancelados ?? 0),
  };
};

/**
 * Resultado de `salvarPedido`. Quando `needsStockOverride` é true, a RPC
 * recusou o pedido por falta de saldo e o caller (PDV) deve abrir o
 * diálogo de "vender mesmo assim". `errorMessage` traz a mensagem
 * humanizada vinda do servidor (ex.: 'Estoque insuficiente para "X":
 * disponível 0, solicitado 2.').
 */
export interface SalvarPedidoOverrideOptions {
  allowNegative: boolean;
  reason: string;
}

export interface SalvarPedidoResult {
  success: boolean;
  pedido?: unknown;
  error?: unknown;
  needsStockOverride?: boolean;
  errorMessage?: string;
}

const STOCK_ERROR_PATTERNS = [
  /^Estoque insuficiente/i,
  /Sem permissão para vender sem saldo/i,
  /Informe o motivo da venda sem saldo/i,
];

const isStockShortageError = (message: string | undefined) =>
  Boolean(message && STOCK_ERROR_PATTERNS.some((re) => re.test(message)));

export async function salvarPedido(
  restaurantId: string,
  mesaOuBalcao: string,
  itensPedido: ItemPedido[],
  _totalPedido: number,
  _employeeId: string,
  nomeCliente?: string,
  telefoneCliente?: string,
  mesaId?: string,
  override?: SalvarPedidoOverrideOptions,
): Promise<SalvarPedidoResult> {
  try {
    // Determinar se é mesa ou balcão
    const isMesa = mesaOuBalcao.startsWith('Mesa');
    const tableId = isMesa ? mesaId : null;

    if (isMesa && !tableId) {
      toast.error('Selecione uma mesa válida para finalizar o pedido.');
      return { success: false, error: new Error('Mesa não selecionada') };
    }

    const payload: Record<string, Json | undefined> = {
      restaurant_id: restaurantId,
      order_type: isMesa ? 'mesa' : 'balcao',
      table_id: tableId,
      customer_name: nomeCliente || undefined,
      customer_phone: telefoneCliente || undefined,
      items: itensPedido.map((item) => ({
        product_id: item.produto.id,
        quantity: item.quantidade,
        observations: item.observacao || undefined,
      })),
    };

    if (override?.allowNegative) {
      payload.allow_negative_override = true;
      payload.negative_override_reason = override.reason;
    }

    const { data: order, error: orderError } = await supabase.rpc('create_pos_order', {
      payload: payload as Json,
    });

    if (orderError || !order) {
      const errorMessage = orderError?.message ?? '';
      console.error('Erro ao criar pedido:', orderError);

      // Quando a RPC bloqueia por falta de saldo, devolvemos um sinal
      // específico para o caller abrir o diálogo de override em vez de
      // já jogar um toast genérico.
      if (!override?.allowNegative && isStockShortageError(errorMessage)) {
        return {
          success: false,
          error: orderError,
          needsStockOverride: true,
          errorMessage,
        };
      }

      toast.error(errorMessage || 'Erro ao salvar o pedido. Por favor, tente novamente.');
      return {
        success: false,
        error: orderError || new Error('Pedido não retornado'),
        errorMessage,
      };
    }

    if (isMesa && mesaId) {
      notifyMesasChanged(restaurantId);
    }

    if (telefoneCliente && (order as { order_id?: string | number }).order_id) {
      try {
        await WhatsAppService.sendOrderConfirmation(
          restaurantId,
          telefoneCliente,
          String((order as { order_id?: string | number }).order_id)
        );
      } catch (whatsappError) {
        console.error('Erro ao enviar notificação WhatsApp:', whatsappError);
        // Não falhar o pedido por erro do WhatsApp
      }
    }

    toast.success(
      override?.allowNegative
        ? 'Pedido finalizado (venda autorizada sem saldo).'
        : 'Pedido finalizado com sucesso!',
    );
    return { success: true, pedido: order };
  } catch (error) {
    console.error('Erro ao processar pedido:', error);
    toast.error('Erro ao processar o pedido.');
    return { success: false, error };
  }
}

export async function listarPedidos(
  restaurantId: string,
  options: ListarPedidosOptions = {}
): Promise<{ success: true } & HistoricoPedidosResultado | { success: false; error: unknown }> {
  try {
    const pagina = Math.max(1, options.pagina || 1);
    const itensPorPagina = Math.max(1, options.itensPorPagina || 20);
    const from = (pagina - 1) * itensPorPagina;
    const to = from + itensPorPagina - 1;

    let pedidosQuery = supabase
      .from('orders')
      .select(`
        *,
        order_items (
          id,
          product_id,
          product_name,
          quantity,
          price,
          observations
        ),
        mesa:mesas (
          id,
          name,
          number
        )
      `, { count: 'exact' });

    pedidosQuery = pedidosQuery.eq('restaurant_id', restaurantId);

    if (options.dataInicio) {
      pedidosQuery = pedidosQuery.gte('created_at', options.dataInicio);
    }

    if (options.dataFim) {
      pedidosQuery = pedidosQuery.lte('created_at', options.dataFim);
    }

    if (options.status && options.status !== 'todos') {
      pedidosQuery = pedidosQuery.eq('status', options.status);
    }

    const { data, error, count } = await pedidosQuery
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('Erro ao buscar pedidos:', error);
      return { success: false, error };
    }

    const { data: resumoData, error: resumoError } = await supabase.rpc(
      'get_orders_summary',
      {
        p_restaurant_id: restaurantId,
        p_data_inicio: options.dataInicio || null,
        p_data_fim: options.dataFim || null,
        p_status: options.status && options.status !== 'todos' ? options.status : null,
      },
    );

    if (resumoError) {
      console.error('Erro ao buscar resumo de pedidos:', resumoError);
      return { success: false, error: resumoError };
    }

    const rows = (data || []) as PedidoQueryRow[];

    const pedidosFormatados = rows.map((pedido) => ({
      id: pedido.id,
      mesa: formatMesaDisplay(pedido),
      table_id: pedido.table_id,
      cliente: pedido.customer_name || undefined,
      clientName: pedido.customer_name || undefined,
      itensPedido: (pedido.order_items || []).map((item) => ({
        produto: {
          id: item.product_id || item.id,
          name: item.product_name,
          price: item.price,
          description: "",
          available: true,
          restaurant_id: restaurantId
        } as ProdutoSimplificado,
        quantidade: item.quantity,
        observacao: item.observations
      })),
      status: pedido.status as PedidoStatus,
      timestamp: new Date(pedido.created_at),
      total: pedido.total,
      payment_method: pedido.payment_method,
      payment_status: pedido.payment_status,
      source: pedido.source as Pedido['source']
    })) satisfies Pedido[];

    return {
      success: true,
      pedidos: pedidosFormatados,
      total: count || 0,
      resumo: parseResumoRpc(resumoData),
    };
  } catch (error) {
    console.error('Erro ao listar pedidos:', error);
    return { success: false, error };
  }
}

export async function alterarStatusPedido(pedidoId: string, novoStatus: PedidoStatus) {
  try {
    const { data, error } = await supabase.rpc('update_order_status', {
      p_order_id: pedidoId,
      p_status: novoStatus,
    });

    if (error) {
      const errorMessage = error.message ?? '';
      console.error('Erro ao alterar status do pedido:', error);

      // Reabertura bloqueada por estoque vem como "Estoque insuficiente
      // para X: disponível Y, solicitado Z" do back. Mostra a mensagem
      // direta — o usuário precisa entender qual produto falta.
      if (isStockShortageError(errorMessage) && novoStatus === 'pendente') {
        toast.error(
          `Não foi possível reabrir o pedido: ${errorMessage}`,
        );
      } else {
        toast.error(errorMessage || 'Erro ao atualizar o status do pedido.');
      }
      return { success: false, error };
    }

    const updatedRow = data as { restaurant_id?: string; table_id?: string; reopened?: boolean; reverted_stock?: boolean } | null;
    if (updatedRow?.restaurant_id && updatedRow?.table_id) {
      notifyMesasChanged(String(updatedRow.restaurant_id));
    }

    if (updatedRow?.reopened) {
      toast.success('Pedido reaberto. Saldo de estoque foi re-aplicado.');
    } else if (updatedRow?.reverted_stock) {
      toast.success(`Status do pedido atualizado para ${novoStatus}. Estoque estornado.`);
    } else {
      toast.success(`Status do pedido atualizado para ${novoStatus}`);
    }
    return { success: true, data };
  } catch (error) {
    console.error('Erro ao alterar status:', error);
    toast.error('Erro ao processar a alteração de status.');
    return { success: false, error };
  }
}
