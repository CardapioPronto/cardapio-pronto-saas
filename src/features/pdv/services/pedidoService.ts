import { supabase } from "@/integrations/supabase/client";
import { ItemPedido, ProdutoSimplificado, Pedido } from "../types";
import { WhatsAppService } from "@/services/whatsapp/whatsappService";
import { mesasService } from "@/services/mesasService";
import { toast } from "sonner";

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
    
    // 1. Inserir o pedido principal
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        restaurant_id: restaurantId,
        employee_id: employeeId,
        customer_name: nomeCliente || (isMesa ? 'Cliente local' : 'Cliente balcão'),
        customer_phone: telefoneCliente || null,
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

    // 3. Atualizar status da mesa se for pedido de mesa
    if (isMesa && mesaId) {
      try {
        await mesasService.updateMesaStatus(mesaId, 'ocupada');
      } catch (mesaError) {
        console.error('Erro ao atualizar status da mesa:', mesaError);
        // Não falhar o pedido por erro na atualização da mesa
      }
    }

    // 4. Enviar notificação via WhatsApp se configurado e telefone fornecido
    if (telefoneCliente) {
      try {
        await WhatsAppService.sendOrderConfirmation(
          restaurantId,
          telefoneCliente,
          order.id
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
      cliente: pedido.customer_name || undefined,
      clientName: pedido.customer_name || undefined,
      itensPedido: pedido.order_items.map(item => ({
        produto: {
          id: item.product_id,
          name: item.product_name,
          price: item.price,
          // Add missing properties with default values
          description: "",
          available: true,
          restaurant_id: restaurantId
        } as ProdutoSimplificado,
        quantidade: item.quantity,
        observacao: item.observations
      })),
      status: pedido.status,
      timestamp: new Date(pedido.created_at),
      total: pedido.total,
      source: pedido.source
    })) as Pedido[];

    return { success: true, pedidos: pedidosFormatados };
  } catch (error) {
    console.error('Erro ao listar pedidos:', error);
    return { success: false, error };
  }
}

export async function alterarStatusPedido(pedidoId: string, novoStatus: string) {
  try {
    // Primeiro, buscar informações do pedido para poder liberar a mesa se necessário
    const { data: orderData, error: fetchError } = await supabase
      .from('orders')
      .select('table_number, restaurant_id, order_type')
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
      .update({ status: novoStatus })
      .eq('id', pedidoId);

    if (error) {
      console.error('Erro ao alterar status do pedido:', error);
      toast.error('Erro ao atualizar o status do pedido.');
      return { success: false, error };
    }

    // Se o pedido foi finalizado e é de mesa, liberar a mesa
    if (novoStatus === 'finalizado' && orderData.order_type === 'mesa' && orderData.table_number) {
      try {
        // Buscar a mesa pelo número da mesa
        const { data: mesa } = await supabase
          .from('mesas')
          .select('id')
          .eq('restaurant_id', orderData.restaurant_id)
          .eq('number', orderData.table_number)
          .single();

        if (mesa) {
          await mesasService.updateMesaStatus(mesa.id, 'livre');
        }
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
