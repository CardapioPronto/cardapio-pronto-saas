
import { supabase } from "@/integrations/supabase/client";
import { ItemPedido } from "../types";
import { toast } from "sonner";

export async function salvarPedido(
  restaurantId: string,
  mesaOuBalcao: string,
  itensPedido: ItemPedido[],
  totalPedido: number,
  nomeCliente?: string
) {
  try {
    // Determinar se é mesa ou balcão
    const isMesa = mesaOuBalcao.startsWith('Mesa');
    
    // 1. Inserir o pedido principal
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        restaurant_id: restaurantId,
        customer_name: nomeCliente || (isMesa ? 'Cliente local' : 'Cliente balcão'),
        order_type: isMesa ? 'mesa' : 'balcao',
        table_number: isMesa ? mesaOuBalcao.replace('Mesa ', '') : null,
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
      return { success: false, error: itemsError };
    }

    toast.success('Pedido finalizado com sucesso!');
    return { success: true, pedido: order };
  } catch (error) {
    console.error('Erro ao processar pedido:', error);
    toast.error('Erro ao processar o pedido.');
    return { success: false, error };
  }
}

export async function listarPedidos(restaurantId: string) {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (*)
      `)
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar pedidos:', error);
      return { success: false, error };
    }

    // Formatar os dados para o formato esperado pelo front-end
    const pedidosFormatados = data.map(pedido => ({
      id: pedido.id,
      mesa: pedido.table_number ? `Mesa ${pedido.table_number}` : 'Balcão',
      itensPedido: pedido.order_items.map(item => ({
        produto: {
          id: item.product_id,
          name: item.product_name,
          price: item.price
        },
        quantidade: item.quantity,
        observacao: item.observations
      })),
      status: pedido.status,
      timestamp: new Date(pedido.created_at),
      total: pedido.total
    }));

    return { success: true, pedidos: pedidosFormatados };
  } catch (error) {
    console.error('Erro ao listar pedidos:', error);
    return { success: false, error };
  }
}

export async function alterarStatusPedido(pedidoId: string, novoStatus: string) {
  try {
    const { error } = await supabase
      .from('orders')
      .update({ status: novoStatus })
      .eq('id', pedidoId);

    if (error) {
      console.error('Erro ao alterar status do pedido:', error);
      toast.error('Erro ao atualizar o status do pedido.');
      return { success: false, error };
    }

    toast.success(`Status do pedido atualizado para ${novoStatus}`);
    return { success: true };
  } catch (error) {
    console.error('Erro ao alterar status:', error);
    toast.error('Erro ao processar a alteração de status.');
    return { success: false, error };
  }
}
