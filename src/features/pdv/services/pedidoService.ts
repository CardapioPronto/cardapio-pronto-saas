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
import { mesasService } from "@/services/mesasService";
import { toast } from "sonner";

type PedidoQueryRow = {
  id: string;
  customer_name: string | null;
  created_at: string;
  status: string;
  source: string | null;
  table_id: string | null;
  total: number;
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

type OrderItemQueryRow = {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  price: number;
  observations: string | null;
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
  if (!pedido.mesa) return 'Balcão';

  if (pedido.mesa.number) return `Mesa ${pedido.mesa.number}`;
  if (pedido.mesa.name) return pedido.mesa.name;

  return 'Mesa';
};

const OPEN_TABLE_STATUSES: PedidoStatus[] = ['pendente', 'preparo', 'em-andamento'];

const notifyMesasChanged = (restaurantId: string) => {
  window.dispatchEvent(new CustomEvent('mesas:changed', { detail: { restaurantId } }));
};

const montarResumoPedidos = (pedidos: PedidoResumoRow[] = []): HistoricoPedidosResumo => ({
  totalPedidos: pedidos.length,
  totalVendido: pedidos
    .filter((pedido) => pedido.status !== 'cancelado')
    .reduce((total, pedido) => total + Number(pedido.total || 0), 0),
  pedidosAbertos: pedidos.filter((pedido) => OPEN_TABLE_STATUSES.includes(pedido.status as PedidoStatus)).length,
  cancelados: pedidos.filter((pedido) => pedido.status === 'cancelado').length,
});

export async function salvarPedido(
  restaurantId: string,
  mesaOuBalcao: string,
  itensPedido: ItemPedido[],
  totalPedido: number,
  employeeId: string,
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
    
    // 1. Inserir o pedido principal
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        restaurant_id: restaurantId,
        employee_id: employeeId,
        customer_name: nomeCliente || (isMesa ? 'Cliente local' : 'Cliente balcão'),
        customer_phone: telefoneCliente || null,
        order_type: isMesa ? 'mesa' : 'balcao',
        table_id: tableId,
        status: 'pendente',
        total: totalPedido,
        source: 'app'
      })
      .select()
      .single();

    if (orderError) {
      console.error('Erro ao criar pedido:', orderError);
      toast.error('Erro ao salvar o pedido. Por favor, tente novamente.');
      return { success: false, error: orderError };
    }

    // 2. Inserir os itens do pedido
    const orderItems = itensPedido.map(item => ({
      order_id: order.id,
      product_id: item.produto.id,
      product_name: item.produto.name,
      quantity: item.quantidade,
      price: item.produto.price,
      observations: item.observacao || null
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (itemsError) {
      console.error('Erro ao criar itens do pedido:', itemsError);
      toast.error('Erro ao salvar os itens do pedido.');
      await supabase.from('orders').delete().eq('id', order.id);
      return { success: false, error: itemsError };
    }

    // 3. Atualizar status da mesa se for pedido de mesa
    if (isMesa && mesaId) {
      try {
        await mesasService.updateMesaStatus(mesaId, 'ocupada');
        notifyMesasChanged(restaurantId);
      } catch (mesaError) {
        console.error('Erro ao atualizar status da mesa:', mesaError);
        // Não falhar o pedido por erro na atualização da mesa
      }
    }

    // 4. Enviar notificação via WhatsApp se configurado e telefone fornecido
    if (telefoneCliente && order?.id) {
      try {
        await WhatsAppService.sendOrderConfirmation(
          restaurantId,
          telefoneCliente,
          String(order.id)
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
    const orderIds = rows.map((pedido) => pedido.id);
    const itemsByOrderId = new Map<string, OrderItemQueryRow[]>();

    if (orderIds.length > 0) {
      const { data: itemsData, error: itemsError } = await supabase
        .from('order_items')
        .select('id, order_id, product_id, product_name, quantity, price, observations')
        .in('order_id', orderIds)
        .order('created_at', { ascending: true });

      if (itemsError) {
        console.error('Erro ao buscar itens dos pedidos:', itemsError);
        return { success: false, error: itemsError };
      }

      for (const item of (itemsData || []) as OrderItemQueryRow[]) {
        const items = itemsByOrderId.get(item.order_id) || [];
        items.push(item);
        itemsByOrderId.set(item.order_id, items);
      }
    }

    const pedidosFormatados = rows.map((pedido) => ({
      id: pedido.id,
      mesa: formatMesaDisplay(pedido),
      table_id: pedido.table_id,
      cliente: pedido.customer_name || undefined,
      clientName: pedido.customer_name || undefined,
      itensPedido: (itemsByOrderId.get(pedido.id) || pedido.order_items || []).map((item) => ({
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
    // Primeiro, buscar informações do pedido para poder liberar a mesa se necessário
    const { data: orderData, error: fetchError } = await supabase
      .from('orders')
      .select('table_id, restaurant_id, order_type')
      .eq('id', pedidoId)
      .single();

    if (fetchError) {
      console.error('Erro ao buscar pedido:', fetchError);
      toast.error('Erro ao buscar informações do pedido.');
      return { success: false, error: fetchError };
    }

    // Atualizar o status do pedido
    const { error } = await supabase
      .from('orders')
      .update({
        status: novoStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', pedidoId);

    if (error) {
      console.error('Erro ao alterar status do pedido:', error);
      toast.error('Erro ao atualizar o status do pedido.');
      return { success: false, error };
    }

    if (OPEN_TABLE_STATUSES.includes(novoStatus) && orderData.order_type === 'mesa' && orderData.table_id) {
      try {
        await mesasService.updateMesaStatus(orderData.table_id, 'ocupada');
        notifyMesasChanged(orderData.restaurant_id);
      } catch (mesaError) {
        console.error('Erro ao ocupar mesa:', mesaError);
      }
    }

    // Se ainda existirem pedidos abertos na mesa, ela permanece ocupada.
    if ((novoStatus === 'finalizado' || novoStatus === 'cancelado') && orderData.order_type === 'mesa' && orderData.table_id) {
      try {
        const { data: pedidosAbertos, error: pedidosAbertosError } = await supabase
          .from('orders')
          .select('id')
          .eq('restaurant_id', orderData.restaurant_id)
          .eq('table_id', orderData.table_id)
          .in('status', OPEN_TABLE_STATUSES)
          .neq('id', pedidoId);

        if (pedidosAbertosError) throw pedidosAbertosError;

        const mesaStatus = pedidosAbertos && pedidosAbertos.length > 0 ? 'ocupada' : 'livre';
        await mesasService.updateMesaStatus(orderData.table_id, mesaStatus);
        notifyMesasChanged(orderData.restaurant_id);
      } catch (mesaError) {
        console.error('Erro ao liberar mesa:', mesaError);
        // Não falhar a operação por erro na liberação da mesa
      }
    }

    toast.success(`Status do pedido atualizado para ${novoStatus}`);
    return { success: true };
  } catch (error) {
    console.error('Erro ao alterar status:', error);
    toast.error('Erro ao processar a alteração de status.');
    return { success: false, error };
  }
}
