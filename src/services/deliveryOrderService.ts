import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import type { CartItem } from '@/components/public-menu/cart/cartContextCore';
import { createLogger } from '@/lib/log';
import { captureCrmLeadFromOrder } from '@/services/crmService';

const log = createLogger('deliveryOrderService');

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
  customer_email?: string;
  accepts_marketing_email?: boolean;
  table_id?: string;
  payment_method?: string;
  change_for?: number;
  notes?: string;
  coupon_code?: string;
  delivery_fee: number;
  estimated_delivery_minutes?: number;
  client_request_id?: string;
  loyalty_redeem_amount?: number;
}

export interface OnlineOrderPayment {
  status: string;
  payment_method: string;
  qr_code?: string | null;
  qr_code_url?: string | null;
  expires_at?: string | null;
  amount?: number;
}

type JsonRecord = Record<string, unknown>;

type PublicMenuOrderResult = {
  tracking_id: string;
  order_id: string;
  delivery_order_id: string | null;
  order_number: string | null;
  fulfillment_type: FulfillmentType;
  discount_amount?: number;
  total?: number;
};

type CouponValidationResult = {
  valid: boolean;
  message: string;
  code?: string;
  title?: string;
  discount?: number;
};

type OnlineOrderPaymentResponse = OnlineOrderPayment & {
  error?: string;
};

type LoyaltyRedemptionResult = {
  applied: boolean;
  discount_amount: number;
  total: number | null;
  original_total?: number;
  reason?: string;
  idempotent_replay?: boolean;
};

type ViaCepResponse = {
  erro?: boolean;
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
};

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const readString = (record: JsonRecord, key: string): string | undefined =>
  typeof record[key] === 'string' ? record[key] : undefined;

const readNumber = (record: JsonRecord, key: string): number | undefined =>
  typeof record[key] === 'number' ? record[key] : undefined;

const readBoolean = (record: JsonRecord, key: string): boolean | undefined =>
  typeof record[key] === 'boolean' ? record[key] : undefined;

const readNullableString = (record: JsonRecord, key: string): string | null => {
  const value = record[key];
  return typeof value === 'string' ? value : null;
};

const isFulfillmentType = (value: unknown): value is FulfillmentType =>
  value === 'delivery' || value === 'pickup' || value === 'table' || value === 'counter';

const parseCreateOrderResult = (value: Json): PublicMenuOrderResult => {
  if (!isRecord(value)) {
    throw new Error('Resposta invalida ao criar pedido.');
  }

  const trackingId = readString(value, 'tracking_id');
  const orderId = readString(value, 'order_id');
  const fulfillmentType = value.fulfillment_type;

  if (!trackingId || !orderId || !isFulfillmentType(fulfillmentType)) {
    throw new Error('Resposta incompleta ao criar pedido.');
  }

  return {
    tracking_id: trackingId,
    order_id: orderId,
    delivery_order_id: readNullableString(value, 'delivery_order_id'),
    order_number: readNullableString(value, 'order_number'),
    fulfillment_type: fulfillmentType,
    discount_amount: readNumber(value, 'discount_amount'),
    total: readNumber(value, 'total'),
  };
};

const parseCouponValidation = (value: Json): CouponValidationResult => {
  if (!isRecord(value)) {
    throw new Error('Resposta invalida ao validar cupom.');
  }

  return {
    valid: value.valid === true,
    message: readString(value, 'message') || '',
    code: readString(value, 'code'),
    title: readString(value, 'title'),
    discount: readNumber(value, 'discount'),
  };
};

const parseLoyaltyRedemption = (value: Json): LoyaltyRedemptionResult => {
  if (!isRecord(value)) {
    throw new Error('Resposta invalida ao aplicar fidelidade.');
  }

  return {
    applied: readBoolean(value, 'applied') === true,
    discount_amount: Number(readNumber(value, 'discount_amount') || 0),
    total: readNumber(value, 'total') ?? null,
    original_total: readNumber(value, 'original_total'),
    reason: readString(value, 'reason'),
    idempotent_replay: readBoolean(value, 'idempotent_replay'),
  };
};

const applyLoyaltyRedemption = async (
  orderId: string,
  requestedAmount: number,
): Promise<LoyaltyRedemptionResult> => {
  const amount = Number(requestedAmount || 0);
  if (!orderId || amount <= 0) {
    return { applied: false, discount_amount: 0, total: null, reason: 'invalid_amount' };
  }

  const { data, error } = await supabase.rpc('apply_public_loyalty_redemption', {
    p_order_id: orderId,
    p_requested_amount: amount,
  });

  if (error) throw error;
  return parseLoyaltyRedemption(data);
};

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
    const payload = {
      restaurant_id: input.restaurant_id,
      fulfillment_type: input.fulfillment_type,
      table_id: input.table_id,
      customer_name: input.address?.customer_name || input.customer_name,
      customer_phone: input.address?.customer_phone || input.customer_phone,
      customer_email: input.customer_email,
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
        flavor_selection: i.flavor_selection || null,
      })),
    };

    const { data, error } = await supabase.rpc('create_public_menu_order', {
      payload: payload as unknown as Json,
    });

    if (error) throw error;

    const result = parseCreateOrderResult(data);
    let loyaltyDiscount = 0;
    let orderTotal = Number(result.total || 0);

    if (Number(input.loyalty_redeem_amount || 0) > 0) {
      const redemption = await applyLoyaltyRedemption(result.order_id, Number(input.loyalty_redeem_amount));
      if (redemption.applied) {
        loyaltyDiscount = Number(redemption.discount_amount || 0);
        orderTotal = Number(redemption.total ?? orderTotal);
      }
    }

    try {
      await captureCrmLeadFromOrder(result.order_id, {
        acceptsMarketing: input.accepts_marketing_email ?? null,
        source: 'cardapio',
      });
    } catch (e) {
      log.capture(e, {
        action: 'capture_public_order_crm_lead_optional',
        restaurantId: input.restaurant_id,
        orderId: result.order_id,
        trackingId: result.tracking_id,
      });
    }

    if (input.fulfillment_type === 'delivery' && result.delivery_order_id) {
      try {
        await supabase.functions.invoke('send-delivery-whatsapp', {
          body: {
            delivery_order_id: result.delivery_order_id,
            tracking_id: result.tracking_id,
            items: input.items.map(i => ({
              product_id: i.product_id,
              name: i.name,
              quantity: i.quantity,
              price: i.price,
              observations: i.observations || null,
              flavor_selection: i.flavor_selection || null,
            })),
            event: 'created',
          },
        });
      } catch (e) {
        log.capture(e, {
          action: 'send_delivery_whatsapp_optional',
          restaurantId: input.restaurant_id,
          orderId: result.order_id,
          deliveryOrderId: result.delivery_order_id,
          trackingId: result.tracking_id,
        });
      }
    }

    if (input.customer_email) {
      try {
        await supabase.functions.invoke('email-dispatch', {
          body: {
            action: 'send_order_confirmation',
            restaurant_id: input.restaurant_id,
            order_id: result.order_id,
            delivery_order_id: result.delivery_order_id,
            tracking_id: result.tracking_id,
            email: input.customer_email,
            accepts_marketing: !!input.accepts_marketing_email,
            origin: window.location.origin,
          },
        });
      } catch (e) {
        log.capture(e, {
          action: 'send_order_confirmation_email_optional',
          restaurantId: input.restaurant_id,
          orderId: result.order_id,
          deliveryOrderId: result.delivery_order_id,
          trackingId: result.tracking_id,
        });
      }
    }

    return {
      id: result.tracking_id,
      order_id: result.order_id,
      delivery_order_id: result.delivery_order_id,
      order_number: result.order_number,
      fulfillment_type: result.fulfillment_type,
      discount_amount: Number(result.discount_amount || 0) + loyaltyDiscount,
      total: orderTotal,
    };
  },

  applyLoyaltyRedemption,

  async createOnlinePayment(input: {
    order_id: string;
    tracking_id: string;
    payment_method: 'pix';
  }): Promise<OnlineOrderPayment> {
    const { data, error } = await supabase.functions.invoke<OnlineOrderPaymentResponse>('pagarme-create-order-payment', {
      body: input,
    });

    if (error) throw error;
    if (!data) throw new Error('Resposta vazia ao criar pagamento.');
    if (data.error) throw new Error(data.error);
    return data;
  },

  async validateCoupon(input: {
    restaurant_id: string;
    code: string;
    subtotal: number;
  }): Promise<CouponValidationResult> {
    const { data, error } = await supabase.rpc('validate_public_coupon', {
      p_code: input.code.trim().toUpperCase(),
      p_restaurant_id: input.restaurant_id,
      p_order_value: input.subtotal,
    });

    if (error) throw error;
    return parseCouponValidation(data);
  },

  async getById(id: string) {
    const { data, error } = await supabase.rpc('get_public_order_tracking', {
      p_tracking_id: id,
    });
    if (error) throw error;
    return data;
  },

  async getStatusHistory(id: string) {
    const data = await this.getById(id);
    return isRecord(data) && Array.isArray(data.history) ? data.history : [];
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
    const data = await res.json() as ViaCepResponse;
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
