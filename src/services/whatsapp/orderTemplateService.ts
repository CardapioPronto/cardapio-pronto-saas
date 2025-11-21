import { WhatsAppTemplateManagementService } from "./templateManagementService";
import { TemplateType } from "@/types/whatsappTemplate";

/**
 * Serviço para enviar mensagens de pedido usando templates
 */
export class OrderTemplateService {
  /**
   * Enviar notificação de pedido confirmado
   */
  static async sendOrderConfirmed(
    restaurantId: string,
    phoneNumber: string,
    orderData: {
      customer_name: string;
      order_number: string;
      total: string;
      restaurant_name: string;
      order_items?: string;
    }
  ): Promise<boolean> {
    return WhatsAppTemplateManagementService.sendTemplateMessage(
      restaurantId,
      'order_confirmed',
      phoneNumber,
      {
        customer_name: orderData.customer_name,
        order_number: orderData.order_number,
        total: orderData.total,
        restaurant_name: orderData.restaurant_name,
        order_items: orderData.order_items || '',
        date: new Date().toLocaleDateString('pt-BR'),
        time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      }
    );
  }

  /**
   * Enviar notificação de pedido em preparo
   */
  static async sendOrderPreparing(
    restaurantId: string,
    phoneNumber: string,
    orderData: {
      customer_name: string;
      order_number: string;
      restaurant_name: string;
    }
  ): Promise<boolean> {
    return WhatsAppTemplateManagementService.sendTemplateMessage(
      restaurantId,
      'order_preparing',
      phoneNumber,
      {
        customer_name: orderData.customer_name,
        order_number: orderData.order_number,
        restaurant_name: orderData.restaurant_name,
        date: new Date().toLocaleDateString('pt-BR'),
        time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      }
    );
  }

  /**
   * Enviar notificação de pedido pronto
   */
  static async sendOrderReady(
    restaurantId: string,
    phoneNumber: string,
    orderData: {
      customer_name: string;
      order_number: string;
      restaurant_name: string;
      table_number?: string;
    }
  ): Promise<boolean> {
    return WhatsAppTemplateManagementService.sendTemplateMessage(
      restaurantId,
      'order_ready',
      phoneNumber,
      {
        customer_name: orderData.customer_name,
        order_number: orderData.order_number,
        restaurant_name: orderData.restaurant_name,
        table_number: orderData.table_number || '',
        date: new Date().toLocaleDateString('pt-BR'),
        time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      }
    );
  }

  /**
   * Enviar notificação de pedido cancelado
   */
  static async sendOrderCancelled(
    restaurantId: string,
    phoneNumber: string,
    orderData: {
      customer_name: string;
      order_number: string;
      restaurant_name: string;
    }
  ): Promise<boolean> {
    return WhatsAppTemplateManagementService.sendTemplateMessage(
      restaurantId,
      'order_cancelled',
      phoneNumber,
      {
        customer_name: orderData.customer_name,
        order_number: orderData.order_number,
        restaurant_name: orderData.restaurant_name,
        date: new Date().toLocaleDateString('pt-BR'),
        time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      }
    );
  }

  /**
   * Enviar notificação de pedido entregue
   */
  static async sendOrderDelivered(
    restaurantId: string,
    phoneNumber: string,
    orderData: {
      customer_name: string;
      order_number: string;
      restaurant_name: string;
    }
  ): Promise<boolean> {
    return WhatsAppTemplateManagementService.sendTemplateMessage(
      restaurantId,
      'order_delivered',
      phoneNumber,
      {
        customer_name: orderData.customer_name,
        order_number: orderData.order_number,
        restaurant_name: orderData.restaurant_name,
        date: new Date().toLocaleDateString('pt-BR'),
        time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      }
    );
  }

  /**
   * Enviar mensagem baseada no status do pedido
   */
  static async sendOrderStatusMessage(
    restaurantId: string,
    phoneNumber: string,
    status: 'confirmado' | 'preparando' | 'pronto' | 'cancelado' | 'entregue',
    orderData: {
      customer_name: string;
      order_number: string;
      restaurant_name: string;
      total?: string;
      table_number?: string;
      order_items?: string;
    }
  ): Promise<boolean> {
    switch (status) {
      case 'confirmado':
        if (!orderData.total) return false;
        return this.sendOrderConfirmed(restaurantId, phoneNumber, {
          customer_name: orderData.customer_name,
          order_number: orderData.order_number,
          total: orderData.total,
          restaurant_name: orderData.restaurant_name,
          order_items: orderData.order_items
        });
      
      case 'preparando':
        return this.sendOrderPreparing(restaurantId, phoneNumber, orderData);
      
      case 'pronto':
        return this.sendOrderReady(restaurantId, phoneNumber, orderData);
      
      case 'cancelado':
        return this.sendOrderCancelled(restaurantId, phoneNumber, orderData);
      
      case 'entregue':
        return this.sendOrderDelivered(restaurantId, phoneNumber, orderData);
      
      default:
        return false;
    }
  }
}
