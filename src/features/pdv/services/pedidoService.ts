import { supabase } from "@/integrations/supabase/client";
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

type PedidoResumoRow = {
  id: string;
  status: string;
  total: number;
};

const formatMesaDisplay = (pedido: PedidoQueryRow) => {
  if (pedido.order_type === 'delivery') return 'Delivery';
  if (pedido.order_type === 'balcao') return 'Balcão';
  if (!pedido.mesa) return 'Balcão';

  if (pedido.mesa.number) return `Mesa ${pedido.mesa.number}`;
  if (pedido.mesa.name) return pedido.mesa.name;

  return 'Mesa';
};

const OPEN_TABLE_STATUSES: PedidoStatus[] = ['pendente', 'preparo', 'em-andamento', 'pronto'];
const FATURAMENTO_STATUS: PedidoStatus = 'finalizado';

const notifyMesasChanged = (restaurantId: string) => {
  window.dispatchEvent(new CustomEvent('mesas:changed', { detail: { restaurantId } }));
};

const montarResumoPedidos = (pedidos: PedidoResumoRow[] = []): HistoricoPedidosResumo => ({
  totalPedidos: pedidos.length,
  totalVendido: pedidos
    .filter((pedido) => pedido.status === FATURAMENTO_STATUS)
    .reduce((total, pedido) => total + Number(pedido.total || 0), 0),
  pedidosAbertos: pedidos.filter((pedido) => OPEN_TABLE_STATUSES.includes(pedido.status as PedidoStatus)).length,
  cancelados: pedidos.filter((pedido) => pedido.status === 'cancelado').length,
});

export async function salvarPedido(
  restaurantId: string,
  mesaOuBalcao: string,
  itensPedido: ItemPedido[],
  _totalPedido: number,
  _employeeId: string,
  nomeCliente?: string,
  telefoneCliente?: string,
  mesaId?: string
) {
  try {
    // Determinar se é mesa ou balcão
    const isMesa = mesaOuBalcao.startsWith('Mesa');
    const tableId = isMesa ? mesaId : null;

    if (isMesa && !tableId) {
      toast.error('Selecione uma mesa válida para finalizar o pedido.');
      return { success: false, error: new Error('Mesa não selecionada') };
    }
    
    const { data: order, error: orderError } = await supabase.rpc('create_pos_order', {
      payload: {
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
      },
    });

    if (orderError || !order) {
      console.error('Erro ao criar pedido:', orderError);
      toast.error('Erro ao salvar o pedido. Por favor, tente novamente.');
      return { success: false, error: orderError || new Error('Pedido não retornado') };
    }

    if (isMesa && mesaId) {
      notifyMesasChanged(restaurantId);
    }

    if (telefoneCliente && order.order_id) {
      try {
        await WhatsAppService.sendOrderConfirmation(
          restaurantId,
          telefoneCliente,
          String(order.order_id)
        );
      } catch (whatsappError) {
        console.error('Erro ao enviar notificação WhatsApp:', whatsappError);
        // Não falhar o pedido por erro do WhatsApp
      }
    }

    toast.success('Pedido finalizado com sucesso!');
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

    let resumoQuery = supabase
      .from('orders')
      .select('id, status, total');

    resumoQuery = resumoQuery.eq('restaurant_id', restaurantId);

    if (options.dataInicio) {
      resumoQuery = resumoQuery.gte('created_at', options.dataInicio);
    }

    if (options.dataFim) {
      resumoQuery = resumoQuery.lte('created_at', options.dataFim);
    }

    if (options.status && options.status !== 'todos') {
      resumoQuery = resumoQuery.eq('status', options.status);
    }

    const { data: resumoData, error: resumoError } = await resumoQuery;

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
      resumo: montarResumoPedidos((resumoData || []) as PedidoResumoRow[]),
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
      console.error('Erro ao alterar status do pedido:', error);
      toast.error('Erro ao atualizar o status do pedido.');
      return { success: false, error };
    }

    if (data?.restaurant_id && data?.table_id) {
      notifyMesasChanged(String(data.restaurant_id));
    }

    toast.success(`Status do pedido atualizado para ${novoStatus}`);
    return { success: true, data };
  } catch (error) {
    console.error('Erro ao alterar status:', error);
    toast.error('Erro ao processar a alteração de status.');
    return { success: false, error };
  }
}
