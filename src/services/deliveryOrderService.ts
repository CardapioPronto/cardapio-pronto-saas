import { supabase } from '@/integrations/supabase/client';
import type { CartItem } from '@/components/public-menu/cart/CartContext';

export type FulfillmentType = 'delivery' | 'pickup' | 'table' | 'counter';

export interface DeliveryAddressInput {
  customer_name: string;
  customer_phone: string;
  zip_code: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  reference_point?: string;
}

export interface CreateDeliveryOrderInput {
  restaurant_id: string;
  items: CartItem[];
  fulfillment_type: FulfillmentType;
  address?: DeliveryAddressInput;
  customer_name?: string;
  customer_phone?: string;
  table_id?: string;
  payment_method?: string;
  change_for?: number;
  notes?: string;
  delivery_fee: number;
  estimated_delivery_minutes?: number;
}

export const deliveryOrderService = {
  async create(input: CreateDeliveryOrderInput): Promise<{
    id: string;
    order_id: string;
    delivery_order_id: string | null;
    order_number: string | null;
    fulfillment_type: FulfillmentType;
  }> {
    const payload = {
      restaurant_id: input.restaurant_id,
      fulfillment_type: input.fulfillment_type,
      table_id: input.table_id,
      customer_name: input.address?.customer_name || input.customer_name,
      customer_phone: input.address?.customer_phone || input.customer_phone,
      address: input.address,
      payment_method: input.payment_method,
      change_for: input.change_for,
      notes: input.notes,
      delivery_fee: input.fulfillment_type === 'delivery' ? input.delivery_fee : 0,
      estimated_delivery_minutes: input.estimated_delivery_minutes,
      items: input.items.map(i => ({
        product_id: i.product_id,
        quantity: i.quantity,
        observations: i.observations || null,
      })),
    };

    const { data, error } = await (supabase as any).rpc('create_public_menu_order', {
      payload,
    });

    if (error) throw error;

    const result = data as {
      tracking_id: string;
      order_id: string;
      delivery_order_id: string | null;
      order_number: string | null;
      fulfillment_type: FulfillmentType;
    };

    if (input.fulfillment_type === 'delivery' && result.delivery_order_id) {
      try {
        await supabase.functions.invoke('send-delivery-whatsapp', {
          body: {
            delivery_order_id: result.delivery_order_id,
            items: input.items.map(i => ({
              product_id: i.product_id,
              name: i.name,
              quantity: i.quantity,
              price: i.price,
              observations: i.observations || null,
            })),
            event: 'created',
          },
        });
      } catch (e) {
        console.warn('Falha ao enviar WhatsApp (pedido salvo mesmo assim):', e);
      }
    }

    return {
      id: result.tracking_id,
      order_id: result.order_id,
      delivery_order_id: result.delivery_order_id,
      order_number: result.order_number,
      fulfillment_type: result.fulfillment_type,
    };
  },

  async getById(id: string) {
    const { data, error } = await (supabase as any).rpc('get_public_order_tracking', {
      p_tracking_id: id,
    });
    if (error) throw error;
    return data;
  },

  async getStatusHistory(id: string) {
    const data = await this.getById(id);
    return data?.history || [];
  },
};

/** Busca CEP no ViaCEP. */
export async function lookupCep(cep: string): Promise<{
  street: string;
  neighborhood: string;
  city: string;
  state: string;
} | null> {
  const clean = cep.replace(/\D/g, '');
  if (clean.length !== 8) return null;
  try {
    const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.erro) return null;
    return {
      street: data.logradouro || '',
      neighborhood: data.bairro || '',
      city: data.localidade || '',
      state: data.uf || '',
    };
  } catch {
    return null;
  }
}
