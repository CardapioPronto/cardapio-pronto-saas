import { supabase } from '@/integrations/supabase/client';
import type { CartItem } from '@/components/public-menu/cart/CartContext';

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
  address: DeliveryAddressInput;
  payment_method: string;
  change_for?: number;
  notes?: string;
  delivery_fee: number;
  estimated_delivery_minutes?: number;
}

export const deliveryOrderService = {
  async create(input: CreateDeliveryOrderInput): Promise<{ id: string; order_number: string | null }> {
    const subtotal = input.items.reduce((s, i) => s + i.price * i.quantity, 0);
    const total = subtotal + input.delivery_fee;

    // 1) cria order oficial (sem auth — RLS exige restaurant_id matching, isso só funcionará para usuários do restaurante.
    //    Para pedidos públicos, criamos APENAS delivery_orders — a loja confirma pelo painel e gera o order interno).
    // Nesta MVP: criamos somente delivery_orders e order_items via edge function (service role).
    const { data, error } = await supabase
      .from('delivery_orders')
      .insert({
        restaurant_id: input.restaurant_id,
        customer_name: input.address.customer_name,
        customer_phone: input.address.customer_phone,
        zip_code: input.address.zip_code,
        street: input.address.street,
        number: input.address.number,
        complement: input.address.complement || null,
        neighborhood: input.address.neighborhood,
        city: input.address.city,
        state: input.address.state,
        reference_point: input.address.reference_point || null,
        delivery_fee: input.delivery_fee,
        subtotal,
        total,
        payment_method: input.payment_method,
        change_for: input.change_for ?? null,
        notes: input.notes || null,
        estimated_delivery_minutes: input.estimated_delivery_minutes ?? null,
        status: 'pending',
      } as any)
      .select('id')
      .single();

    if (error) throw error;

    // 2) Disparar edge function que envia o WhatsApp à loja
    try {
      await supabase.functions.invoke('send-delivery-whatsapp', {
        body: {
          delivery_order_id: data.id,
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

    return { id: data.id, order_number: null };
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('delivery_orders')
      .select('*, restaurant:restaurants(name, phone_whatsapp, logo_url)')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async getStatusHistory(id: string) {
    const { data, error } = await supabase
      .from('delivery_order_status_history')
      .select('*')
      .eq('delivery_order_id', id)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data || [];
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