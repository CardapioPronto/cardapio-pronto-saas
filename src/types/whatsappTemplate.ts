export type TemplateType = 
  | 'order_confirmed' 
  | 'order_preparing' 
  | 'order_ready' 
  | 'order_cancelled' 
  | 'order_delivered'
  | 'custom';

export interface WhatsAppTemplate {
  id: string;
  restaurant_id: string;
  template_type: TemplateType;
  template_name: string;
  message_content: string;
  is_active: boolean;
  variables?: string[];
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateTemplateData {
  template_type: TemplateType;
  template_name: string;
  message_content: string;
  is_active?: boolean;
  variables?: string[];
  description?: string;
}

export interface UpdateTemplateData {
  template_name?: string;
  message_content?: string;
  is_active?: boolean;
  variables?: string[];
  description?: string;
}

export const TEMPLATE_TYPE_LABELS: Record<TemplateType, string> = {
  order_confirmed: 'Pedido Confirmado',
  order_preparing: 'Pedido em Preparo',
  order_ready: 'Pedido Pronto',
  order_cancelled: 'Pedido Cancelado',
  order_delivered: 'Pedido Entregue',
  custom: 'Personalizado'
};

export const AVAILABLE_VARIABLES = [
  { key: '{customer_name}', description: 'Nome do cliente' },
  { key: '{order_number}', description: 'Número do pedido' },
  { key: '{total}', description: 'Valor total' },
  { key: '{restaurant_name}', description: 'Nome do restaurante' },
  { key: '{table_number}', description: 'Número da mesa' },
  { key: '{order_items}', description: 'Itens do pedido' },
  { key: '{date}', description: 'Data atual' },
  { key: '{time}', description: 'Hora atual' }
];

export const DEFAULT_TEMPLATES: Record<Exclude<TemplateType, 'custom'>, string> = {
  order_confirmed: 'Olá {customer_name}! ✅\n\nSeu pedido #{order_number} foi confirmado!\n\nTotal: R$ {total}\n\nEstamos preparando tudo com carinho.\n\n{restaurant_name}',
  order_preparing: 'Olá {customer_name}! 👨‍🍳\n\nSeu pedido #{order_number} está sendo preparado!\n\nEm breve estará pronto.\n\n{restaurant_name}',
  order_ready: 'Olá {customer_name}! 🎉\n\nSeu pedido #{order_number} está pronto!\n\nPode vir buscar ou aguarde na mesa {table_number}.\n\n{restaurant_name}',
  order_cancelled: 'Olá {customer_name}! ❌\n\nSeu pedido #{order_number} foi cancelado.\n\nSe tiver dúvidas, entre em contato conosco.\n\n{restaurant_name}',
  order_delivered: 'Olá {customer_name}! ✨\n\nSeu pedido #{order_number} foi entregue!\n\nEsperamos que aproveite!\n\n{restaurant_name}'
};
