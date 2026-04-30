// Edge Function: pagarme-get-receipt
// Busca a última fatura/charge de uma assinatura no Pagar.me
// e retorna dados de comprovante (boleto / PIX / cartão).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PAGARME_API_URL = "https://api.pagar.me/core/v5";

function authHeader() {
  const key = Deno.env.get("PAGARME_SECRET_KEY");
  if (!key) throw new Error("PAGARME_SECRET_KEY not configured");
  return `Basic ${btoa(key + ":")}`;
}

async function pagarme(path: string) {
  const res = await fetch(`${PAGARME_API_URL}${path}`, {
    headers: { Authorization: authHeader(), "Content-Type": "application/json" },
  });
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
  if (!res.ok) {
    const msg = data?.message || data?.errors?.[0]?.message || `HTTP ${res.status}`;
    throw new Error(`Pagar.me GET ${path}: ${msg}`);
  }
  return data;
}

function extractReceipt(charge: any) {
  if (!charge) return null;
  const tx = charge.last_transaction ?? null;
  const method = (charge.payment_method ?? tx?.transaction_type ?? "").toLowerCase();
  return {
    charge_id: charge.id ?? null,
    status: charge.status ?? null,
    amount: typeof charge.amount === "number" ? charge.amount / 100 : null,
    paid_amount: typeof charge.paid_amount === "number" ? charge.paid_amount / 100 : null,
    payment_method: method || null,
    paid_at: charge.paid_at ?? null,
    created_at: charge.created_at ?? null,
    due_at: tx?.due_at ?? null,
    // Boleto
    boleto_url: tx?.url ?? tx?.pdf ?? null,
    boleto_barcode: tx?.barcode ?? null,
    boleto_line: tx?.line ?? null,
    // PIX
    pix_qr_code: tx?.qr_code ?? null,
    pix_qr_code_url: tx?.qr_code_url ?? null,
    pix_expires_at: tx?.expires_at ?? null,
    // Cartão
    card_brand: tx?.card?.brand ?? null,
    card_last_four: tx?.card?.last_four_digits ?? null,
    acquirer_tid: tx?.acquirer_tid ?? null,
    acquirer_nsu: tx?.acquirer_nsu ?? null,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const authHeaderValue = req.headers.get("Authorization");
    if (!authHeaderValue?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeaderValue } } },
    );
    const token = authHeaderValue.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const subscriptionId: string | undefined = body?.subscription_id;
    if (!subscriptionId) throw new Error("subscription_id is required");

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Verifica posse: super admin ou owner do restaurante
    const { data: isSuperAdminData } = await admin.rpc("is_super_admin", {
      _user_id: userData.user.id,
    });
    const { data: sub, error: subErr } = await admin
      .from("subscriptions")
      .select("id, restaurant_id, pagarme_subscription_id, restaurants!inner(owner_id)")
      .eq("id", subscriptionId)
      .maybeSingle();
    if (subErr || !sub) throw new Error("Subscription not found");
    const isOwner = (sub as any).restaurants?.owner_id === userData.user.id;
    if (!isSuperAdminData && !isOwner) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!sub.pagarme_subscription_id) throw new Error("Subscription is not linked to Pagar.me");

    // Tenta listar charges da assinatura (mais confiável p/ recibos)
    let charges: any[] = [];
    try {
      const list = await pagarme(
        `/charges?subscription_id=${encodeURIComponent(sub.pagarme_subscription_id)}&size=10`,
      );
      charges = list?.data ?? [];
    } catch (_e) { /* fallback abaixo */ }

    // Fallback: busca a assinatura e extrai charge do current_cycle / invoices
    let fallbackCharge: any = null;
    if (charges.length === 0) {
      const subscription = await pagarme(
        `/subscriptions/${encodeURIComponent(sub.pagarme_subscription_id)}`,
      );
      fallbackCharge =
        subscription?.current_cycle?.charges?.[0]
        ?? subscription?.invoices?.[0]?.charges?.[0]
        ?? null;
    }

    const allCharges = charges.length > 0 ? charges : (fallbackCharge ? [fallbackCharge] : []);
    const latest = allCharges[0] ?? null;
    const lastPaid = allCharges.find((c) => c?.status === "paid") ?? null;

    return new Response(JSON.stringify({
      success: true,
      latest: extractReceipt(latest),
      last_paid: extractReceipt(lastPaid),
      history: allCharges.map(extractReceipt).filter(Boolean),
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});