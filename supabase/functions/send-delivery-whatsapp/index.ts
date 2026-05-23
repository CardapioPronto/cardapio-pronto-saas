import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { createLogger } from "../_shared/logger.ts";
import { captureEdgeException } from "../_shared/observability.ts";

const logger = createLogger("send-delivery-whatsapp");

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const EVOLUTION_API_URL = Deno.env.get('EVOLUTION_API_URL');
const EVOLUTION_API_KEY = Deno.env.get('EVOLUTION_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const PUBLIC_SITE_URL = (Deno.env.get('PUBLIC_SITE_URL') || Deno.env.get('SITE_URL') || '').replace(/\/+$/, '');

interface ItemPayload {
  product_id: string;
  name: string;
  quantity: number;
  price: number;
  observations?: string | null;
  addons?: Array<{ name: string; price?: number }> | null;
}

interface RequestBody {
  delivery_order_id: string;
  tracking_id?: string;
  items: ItemPayload[];
  event?: 'created' | 'status_changed';
  new_status?: string;
}

interface RestaurantPayload {
  id: string;
  name: string;
  phone_whatsapp?: string | null;
  phone?: string | null;
}

interface DeliveryOrderPayload {
  id: string;
  restaurant_id: string;
  order_id: string;
  created_at?: string | null;
  customer_name: string;
  customer_phone: string;
  street: string;
  number: string;
  complement?: string | null;
  neighborhood: string;
  city: string;
  state: string;
  zip_code: string;
  reference_point?: string | null;
  subtotal: number | string;
  delivery_fee: number | string;
  total: number | string;
  payment_method?: string | null;
  change_for?: number | string | null;
  estimated_delivery_minutes?: number | null;
  notes?: string | null;
  whatsapp_send_attempts?: number | null;
  whatsapp_sent_at?: string | null;
  restaurant?: RestaurantPayload | null;
}

interface EvolutionSendResult {
  key?: { id?: string };
  messageId?: string;
  [key: string]: unknown;
}

interface OrderItemRow {
  product_id: string;
  product_name: string;
  quantity: number | string | null;
  price: number | string | null;
  observations?: string | null;
  addons?: Array<{ name: string; price?: number }> | null;
}

const STATUS_LABEL: Record<string, string> = {
  awaiting_payment: '💳 Aguardando pagamento',
  payment_failed: '⚠️ Pagamento não confirmado',
  pending: '🕒 Aguardando confirmação',
  confirmed: '✅ Pedido confirmado',
  preparing: '👨‍🍳 Em preparo',
  ready: '✅ Pronto para entrega',
  out_for_delivery: '🛵 Saiu para entrega',
  delivered: '🎉 Entregue',
  cancelled: '❌ Cancelado',
};

function brl(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatPhoneBR(raw: string): string {
  const digits = (raw || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('55')) return digits;
  return `55${digits}`;
}

async function getUser(req: Request, supabase: ReturnType<typeof createClient>) {
  const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const { data } = await supabase.auth.getUser(token);
  return data.user ?? null;
}

async function canManageRestaurant(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  restaurantId: string,
) {
  const { data: isSuperAdmin } = await supabase.rpc('is_super_admin', { user_id: userId });
  if (isSuperAdmin) return true;

  const { data: profile } = await supabase
    .from('users')
    .select('restaurant_id, user_type')
    .eq('id', userId)
    .maybeSingle();

  if (profile?.restaurant_id !== restaurantId) return false;
  if (profile?.user_type === 'owner') return true;

  const { data: employee } = await supabase
    .from('employees')
    .select('id, user_type')
    .eq('user_id', userId)
    .eq('restaurant_id', restaurantId)
    .eq('is_active', true)
    .maybeSingle();

  if (!employee?.id) return false;
  if (employee.user_type === 'manager') return true;

  const { data: permission } = await supabase
    .from('employee_permissions')
    .select('permission')
    .eq('employee_id', employee.id)
    .in('permission', ['orders_manage', 'whatsapp_manage'])
    .limit(1)
    .maybeSingle();

  return !!permission;
}

async function loadOrderItems(
  supabase: ReturnType<typeof createClient>,
  orderId: string,
  fallbackItems: ItemPayload[],
): Promise<ItemPayload[]> {
  const { data: items, error } = await supabase
    .from('order_items')
    .select('product_id, product_name, quantity, price, observations, addons')
    .eq('order_id', orderId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  if (!items?.length) return fallbackItems || [];

  return (items as OrderItemRow[]).map((item) => ({
    product_id: item.product_id,
    name: item.product_name,
    quantity: Number(item.quantity || 1),
    price: Number(item.price || 0),
    observations: item.observations,
    addons: Array.isArray(item.addons) ? item.addons : [],
  }));
}

function buildOrderMessage(order: DeliveryOrderPayload, items: ItemPayload[]): string {
  const lines: string[] = [];
  lines.push(`🆕 *NOVO PEDIDO DE DELIVERY*`);
  lines.push(`━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`👤 *Cliente:* ${order.customer_name}`);
  lines.push(`📞 *Telefone:* ${order.customer_phone}`);
  lines.push('');
  lines.push(`📍 *Endereço de entrega:*`);
  lines.push(`${order.street}, ${order.number}${order.complement ? ` - ${order.complement}` : ''}`);
  lines.push(`${order.neighborhood} - ${order.city}/${order.state}`);
  lines.push(`CEP: ${order.zip_code}`);
  if (order.reference_point) lines.push(`📌 Ref: ${order.reference_point}`);
  lines.push('');
  lines.push(`🛒 *Itens do pedido:*`);
  for (const it of items) {
    lines.push(`• ${it.quantity}x ${it.name} — ${brl(it.price * it.quantity)}`);
    if (it.addons && it.addons.length) {
      for (const a of it.addons) {
        lines.push(`   ➕ ${a.name}${a.price ? ` (+${brl(a.price)})` : ''}`);
      }
    }
    if (it.observations) lines.push(`   📝 ${it.observations}`);
  }
  lines.push('');
  lines.push(`💰 *Resumo:*`);
  lines.push(`Subtotal: ${brl(Number(order.subtotal))}`);
  lines.push(`Taxa de entrega: ${brl(Number(order.delivery_fee))}`);
  lines.push(`*TOTAL: ${brl(Number(order.total))}*`);
  lines.push('');
  lines.push(`💳 *Pagamento:* ${order.payment_method || 'Não informado'}`);
  if (order.change_for) lines.push(`💵 Troco para: ${brl(Number(order.change_for))}`);
  if (order.estimated_delivery_minutes) {
    lines.push(`⏱️ Tempo estimado: ${order.estimated_delivery_minutes} min`);
  }
  if (order.notes) {
    lines.push('');
    lines.push(`🗒️ *Observações:* ${order.notes}`);
  }
  lines.push('');
  lines.push(`🆔 Pedido: \`${order.id.substring(0, 8)}\``);
  if (PUBLIC_SITE_URL) {
    lines.push(`🔗 Acompanhar: ${PUBLIC_SITE_URL}/pedido/${order.id}`);
  }
  return lines.join('\n');
}

function buildStatusMessage(order: DeliveryOrderPayload, newStatus: string): string {
  const label = STATUS_LABEL[newStatus] || newStatus;
  return [
    `📦 *Atualização do seu pedido*`,
    ``,
    `Olá ${order.customer_name}!`,
    `Status atual: *${label}*`,
    ``,
    `🆔 Pedido: \`${order.id.substring(0, 8)}\``,
  ].join('\n');
}

async function sendViaEvolution(instanceName: string, phoneE164: string, text: string): Promise<EvolutionSendResult> {
  const baseUrl = (EVOLUTION_API_URL || '').replace(/\/+$/, '');
  const url = `${baseUrl}/message/sendText/${instanceName}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': EVOLUTION_API_KEY!,
    },
    body: JSON.stringify({
      number: phoneE164,
      text,
    }),
  });
  const body = await res.text();
  if (!res.ok) {
    throw new Error(`Evolution API ${res.status}: ${body}`);
  }
  try {
    return JSON.parse(body) as EvolutionSendResult;
  } catch {
    return { raw: body };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
      throw new Error('Evolution API não configurada (EVOLUTION_API_URL/EVOLUTION_API_KEY).');
    }

    const body = (await req.json()) as RequestBody;
    const { delivery_order_id, tracking_id, items, event = 'created', new_status } = body;

    if (!delivery_order_id) {
      return new Response(JSON.stringify({ error: 'delivery_order_id é obrigatório' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 1) Carregar pedido + restaurante
    const { data: order, error: orderErr } = await supabase
      .from('delivery_orders')
      .select('*, restaurant:restaurants(id, name, phone_whatsapp, phone)')
      .eq('id', delivery_order_id)
      .maybeSingle();

    if (orderErr || !order) {
      throw new Error(`Pedido não encontrado: ${orderErr?.message || 'not found'}`);
    }

    const deliveryOrder = order as DeliveryOrderPayload;

    const user = await getUser(req, supabase);
    const isPrivilegedCaller = user
      ? await canManageRestaurant(supabase, user.id, deliveryOrder.restaurant_id)
      : false;

    if (event === 'status_changed' && !isPrivilegedCaller) {
      return new Response(JSON.stringify({ error: 'Sem permissão para enviar atualização de status' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (event === 'created') {
      if (tracking_id !== deliveryOrder.id) {
        return new Response(JSON.stringify({ error: 'Código de acompanhamento inválido' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const createdAt = deliveryOrder.created_at ? new Date(deliveryOrder.created_at).getTime() : NaN;
      if (!isPrivilegedCaller && Number.isFinite(createdAt) && Date.now() - createdAt > 15 * 60 * 1000) {
        return new Response(JSON.stringify({ error: 'Janela de notificação expirada' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (deliveryOrder.whatsapp_sent_at) {
        return new Response(
          JSON.stringify({ success: true, event, duplicate: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
    }

    const restaurant = deliveryOrder.restaurant;
    const storePhoneRaw = restaurant?.phone_whatsapp || restaurant?.phone;
    if (!storePhoneRaw) {
      throw new Error('Restaurante sem telefone WhatsApp configurado.');
    }

    // 2) Buscar instância ativa do restaurante
    const { data: instance, error: instErr } = await supabase
      .from('whatsapp_instances')
      .select('instance_name, status')
        .eq('restaurant_id', deliveryOrder.restaurant_id)
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (instErr || !instance?.instance_name) {
      throw new Error('Nenhuma instância WhatsApp ativa para o restaurante.');
    }

    // 3) Montar mensagem de acordo com o evento
    let target: string;
    let text: string;
    const trustedItems = await loadOrderItems(supabase, deliveryOrder.order_id, items || []);

    if (event === 'status_changed' && new_status) {
      // notifica o CLIENTE
      target = formatPhoneBR(deliveryOrder.customer_phone);
      text = buildStatusMessage(deliveryOrder, new_status);
    } else {
      // notifica a LOJA
      target = formatPhoneBR(storePhoneRaw);
      text = buildOrderMessage(deliveryOrder, trustedItems);
    }

    if (!target) throw new Error('Número de destino inválido.');

    // 4) Tentar envio com retry simples (3 tentativas, backoff 1s/2s)
    const maxAttempts = 3;
    let lastError: unknown = null;
    let success: EvolutionSendResult | null = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        logger.info('Sending WhatsApp message attempt', { attempt, delivery_order_id, event });
        success = await sendViaEvolution(instance.instance_name, target, text);
        lastError = null;
        break;
      } catch (e) {
        lastError = e;
        logger.warn('WhatsApp send attempt failed', { attempt, delivery_order_id, error: (e as Error).message });
        if (attempt < maxAttempts) {
          await new Promise((r) => setTimeout(r, attempt * 1000));
        }
      }
    }

    // 5) Persistir resultado
    const attemptsInc = (deliveryOrder.whatsapp_send_attempts || 0) + 1;
    if (success && event !== 'status_changed') {
      await supabase
        .from('delivery_orders')
        .update({
          whatsapp_sent_at: new Date().toISOString(),
          whatsapp_message_id: success?.key?.id || success?.messageId || null,
          whatsapp_send_attempts: attemptsInc,
          whatsapp_last_attempt_at: new Date().toISOString(),
          whatsapp_last_error: null,
        })
        .eq('id', delivery_order_id);
    } else if (!success) {
      await supabase
        .from('delivery_orders')
        .update({
          whatsapp_send_attempts: attemptsInc,
          whatsapp_last_attempt_at: new Date().toISOString(),
          whatsapp_last_error: (lastError as Error)?.message?.slice(0, 500) || 'erro desconhecido',
        })
        .eq('id', delivery_order_id);

      throw lastError instanceof Error ? lastError : new Error('Falha ao enviar WhatsApp');
    }

    return new Response(
      JSON.stringify({ success: true, event, target, result: success }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    logger.error('send-delivery-whatsapp error', error as Error);
    await captureEdgeException(error, {
      functionName: "send-delivery-whatsapp",
      req,
    });
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
