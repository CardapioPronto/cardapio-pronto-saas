// Edge Function: pagarme-get-receipt
// Busca a última fatura/charge de uma assinatura no Pagar.me
// e retorna dados de comprovante (boleto / PIX / cartão).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { isPlatformOrderExternalId } from "../_shared/pagarme-platform-order.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PAGARME_API_URL = "https://api.pagar.me/core/v5";

type PagarmeErrorPayload = {
  message?: string;
  errors?: Array<{ message?: string }>;
  raw?: string;
};

type PagarmeTransaction = {
  transaction_type?: string | null;
  due_at?: string | null;
  url?: string | null;
  pdf?: string | null;
  barcode?: string | null;
  line?: string | null;
  qr_code?: string | null;
  qrcode?: string | null;
  qr_code_url?: string | null;
  qrcode_url?: string | null;
  expires_at?: string | null;
  card?: {
    brand?: string | null;
    last_four_digits?: string | null;
  } | null;
  acquirer_tid?: string | null;
  acquirer_nsu?: string | null;
};

type PagarmeCharge = {
  id?: string | null;
  status?: string | null;
  amount?: number | null;
  paid_amount?: number | null;
  payment_method?: string | null;
  paid_at?: string | null;
  created_at?: string | null;
  last_transaction?: PagarmeTransaction | null;
};

type PagarmeChargesList = {
  data?: PagarmeCharge[];
};

type PagarmeSubscription = {
  current_cycle?: { charges?: PagarmeCharge[] } | null;
  invoices?: Array<{ charges?: PagarmeCharge[] }> | null;
};

type PagarmeOrder = {
  charges?: PagarmeCharge[] | null;
};

type SubscriptionWithRestaurant = {
  id: string;
  restaurant_id: string;
  pagarme_subscription_id: string | null;
  restaurants?: { owner_id?: string | null } | null;
};

function authHeader() {
  const key = Deno.env.get("PAGARME_SECRET_KEY");
  if (!key) throw new Error("PAGARME_SECRET_KEY not configured");
  return `Basic ${btoa(key + ":")}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function pagarmeErrorMessage(data: unknown, status: number) {
  const payload = isRecord(data) ? data as PagarmeErrorPayload : null;
  return payload?.message || payload?.errors?.[0]?.message || `HTTP ${status}`;
}

async function pagarme<T>(path: string): Promise<T> {
  const res = await fetch(`${PAGARME_API_URL}${path}`, {
    headers: { Authorization: authHeader(), "Content-Type": "application/json" },
  });
  const text = await res.text();
  let data: unknown = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
  if (!res.ok) {
    const msg = pagarmeErrorMessage(data, res.status);
    throw new Error(`Pagar.me GET ${path}: ${msg}`);
  }
  return data as T;
}

function extractReceipt(charge: PagarmeCharge | null) {
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
    pix_qr_code: tx?.qr_code ?? tx?.qrcode ?? null,
    pix_qr_code_url: tx?.qr_code_url ?? tx?.qrcode_url ?? null,
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
      user_id: userData.user.id,
    });
    const { data: subData, error: subErr } = await admin
      .from("subscriptions")
      .select("id, restaurant_id, pagarme_subscription_id, restaurants!inner(owner_id)")
      .eq("id", subscriptionId)
      .maybeSingle();
    if (subErr || !subData) throw new Error("Subscription not found");
    const sub = subData as SubscriptionWithRestaurant;
    const isOwner = sub.restaurants?.owner_id === userData.user.id;
    if (!isSuperAdminData && !isOwner) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!sub.pagarme_subscription_id) throw new Error("Subscription is not linked to Pagar.me");

    const externalId = sub.pagarme_subscription_id;
    let charges: PagarmeCharge[] = [];

    if (isPlatformOrderExternalId(externalId)) {
      const order = await pagarme<PagarmeOrder>(
        `/orders/${encodeURIComponent(externalId)}`,
      );
      charges = order?.charges?.filter(Boolean) ?? [];
    } else {
      try {
        const list = await pagarme<PagarmeChargesList>(
          `/charges?subscription_id=${encodeURIComponent(externalId)}&size=10`,
        );
        charges = list?.data ?? [];
      } catch (_e) { /* fallback abaixo */ }

      let fallbackCharge: PagarmeCharge | null = null;
      if (charges.length === 0) {
        const subscription = await pagarme<PagarmeSubscription>(
          `/subscriptions/${encodeURIComponent(externalId)}`,
        );
        fallbackCharge =
          subscription?.current_cycle?.charges?.[0]
          ?? subscription?.invoices?.[0]?.charges?.[0]
          ?? null;
      }
      if (charges.length === 0 && fallbackCharge) {
        charges = [fallbackCharge];
      }
    }

    const allCharges = charges;
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
