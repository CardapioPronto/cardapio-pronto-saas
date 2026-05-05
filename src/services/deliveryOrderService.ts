import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
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
  coupon_code?: string;
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
    discount_amount: number;
    total: number;
  }> {
    const payload: Json = {
      restaurant_id: input.restaurant_id,
      fulfillment_type: input.fulfillment_type,
      table_id: input.table_id,
      customer_name: input.address?.customer_name || input.customer_name,
      customer_phone: input.address?.customer_phone || input.customer_phone,
      address: input.address
        ? {
            customer_name: input.address.customer_name,
            customer_phone: input.address.customer_phone,
            zip_code: input.address.zip_code,
            street: input.address.street,
            number: input.address.number,
            complement: input.address.complement,
            neighborhood: input.address.neighborhood,
            city: input.address.city,
            state: input.address.state,
            reference_point: input.address.reference_point,
          }
        : undefined,
      payment_method: input.payment_method,
      change_for: input.change_for,
      notes: input.notes,
      coupon_code: input.coupon_code?.trim().toUpperCase() || undefined,
      delivery_fee: input.fulfillment_type === 'delivery' ? input.delivery_fee : 0,
      estimated_delivery_minutes: input.estimated_delivery_minutes,
      items: input.items.map(i => ({
        product_id: i.product_id,
        quantity: i.quantity,
        observations: i.observations || null,
      })),
    };

    const { data, error } = await supabase.rpc('create_public_menu_order' as any, {
      payload,
    });

    if (error) throw error;

    const result = data as {
      tracking_id: string;
      order_id: string;
      delivery_order_id: string | null;
      order_number: string | null;
      fulfillment_type: FulfillmentType;
      discount_amount?: number;
      total?: number;
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
      discount_amount: Number(result.discount_amount || 0),
      total: Number(result.total || 0),
    };
  },

  async validateCoupon(input: {
    restaurant_id: string;
    code: string;
    subtotal: number;
  }): Promise<{
    valid: boolean;
    message: string;
    code?: string;
    title?: string;
    discount?: number;
  }> {
    const { data, error } = await supabase.rpc('validate_public_coupon' as any, {
      p_code: input.code.trim().toUpperCase(),
      p_restaurant_id: input.restaurant_id,
      p_order_value: input.subtotal,
    });

    if (error) throw error;
    return data as {
      valid: boolean;
      message: string;
      code?: string;
      title?: string;
      discount?: number;
    };
  },

  async getById(id: string) {
    const { data, error } = await supabase.rpc('get_public_order_tracking' as any, {
      p_tracking_id: id,
    });
    if (error) throw error;
    return data;
  },

  async getStatusHistory(id: string) {
    const data = await this.getById(id);
    return (data as any)?.history || [];
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
