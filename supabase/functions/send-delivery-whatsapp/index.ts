import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const EVOLUTION_API_URL = Deno.env.get('EVOLUTION_API_URL');
const EVOLUTION_API_KEY = Deno.env.get('EVOLUTION_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

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
  items: ItemPayload[];
  event?: 'created' | 'status_changed';
  new_status?: string;
}

const STATUS_LABEL: Record<string, string> = {
  pending: '🕒 Aguardando confirmação',
  confirmed: '✅ Pedido confirmado',
  preparing: '👨‍🍳 Em preparo',
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

function buildOrderMessage(order: any, items: ItemPayload[]): string {
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
  lines.push(`🔗 Acompanhar: ${SUPABASE_URL.replace(/\.supabase\.co.*$/, '')}/pedido/${order.id}`);
  return lines.join('\n');
}

function buildStatusMessage(order: any, newStatus: string): string {
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

async function sendViaEvolution(instanceName: string, phoneE164: string, text: string) {
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
    return JSON.parse(body);
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
    const { delivery_order_id, items, event = 'created', new_status } = body;

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

    const restaurant = (order as any).restaurant;
    const storePhoneRaw = restaurant?.phone_whatsapp || restaurant?.phone;
    if (!storePhoneRaw) {
      throw new Error('Restaurante sem telefone WhatsApp configurado.');
    }

    // 2) Buscar instância ativa do restaurante
    const { data: instance, error: instErr } = await supabase
      .from('whatsapp_instances')
      .select('instance_name, status')
      .eq('restaurant_id', order.restaurant_id)
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

    if (event === 'status_changed' && new_status) {
      // notifica o CLIENTE
      target = formatPhoneBR(order.customer_phone);
      text = buildStatusMessage(order, new_status);
    } else {
      // notifica a LOJA
      target = formatPhoneBR(storePhoneRaw);
      text = buildOrderMessage(order, items || []);
    }

    if (!target) throw new Error('Número de destino inválido.');

    // 4) Tentar envio com retry simples (3 tentativas, backoff 1s/2s)
    const maxAttempts = 3;
    let lastError: unknown = null;
    let success: any = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(`[send-delivery-whatsapp] tentativa ${attempt} → ${target}`);
        success = await sendViaEvolution(instance.instance_name, target, text);
        lastError = null;
        break;
      } catch (e) {
        lastError = e;
        console.warn(`Falha na tentativa ${attempt}:`, (e as Error).message);
        if (attempt < maxAttempts) {
          await new Promise((r) => setTimeout(r, attempt * 1000));
        }
      }
    }

    // 5) Persistir resultado
    const attemptsInc = (order.whatsapp_send_attempts || 0) + 1;
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
    console.error('send-delivery-whatsapp error:', (error as Error).message);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});