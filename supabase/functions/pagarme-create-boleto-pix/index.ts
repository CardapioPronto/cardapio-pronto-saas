// Edge Function: pagarme-create-boleto-pix
// Cria customer + subscription no Pagar.me usando boleto
// a partir de um plano local sincronizado, e persiste em `subscriptions`.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { sendManagedEmail } from "../_shared/email-delivery.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PAGARME_API_URL = "https://api.pagar.me/core/v5";

type BillingCycle = "monthly" | "yearly";
type PaymentMethod = "boleto";

interface CustomerInput {
  name: string;
  email: string;
  document: string;
  document_type?: "cpf" | "cnpj";
  phone: string;
}

interface RequestBody {
  local_plan_id: string;
  billing_cycle: BillingCycle;
  payment_method: PaymentMethod;
  customer: CustomerInput;
}

function authHeader() {
  const key = Deno.env.get("PAGARME_SECRET_KEY");
  if (!key) throw new Error("PAGARME_SECRET_KEY not configured");
  return `Basic ${btoa(key + ":")}`;
}

async function pagarme(path: string, method: string, body?: unknown) {
  const res = await fetch(`${PAGARME_API_URL}${path}`, {
    method,
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
  if (!res.ok) {
    const msg = data?.message || data?.errors?.[0]?.message || `HTTP ${res.status}`;
    throw new Error(`Pagar.me ${method} ${path}: ${msg}`);
  }
  return data;
}

const digits = (s: string) => (s || "").replace(/\D/g, "");

function validateBody(b: any): RequestBody {
  if (!b || typeof b !== "object") throw new Error("Invalid body");
  if (!b.local_plan_id) throw new Error("local_plan_id is required");
  if (b.billing_cycle !== "monthly" && b.billing_cycle !== "yearly") {
    throw new Error("billing_cycle must be monthly or yearly");
  }
  if (b.payment_method !== "boleto") {
    throw new Error("payment_method must be boleto");
  }
  if (!b.customer?.name || !b.customer?.email || !b.customer?.document || !b.customer?.phone) {
    throw new Error("customer fields are required");
  }
  return b as RequestBody;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
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
    const userId = userData.user.id;

    const body = validateBody(await req.json());
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: profile } = await admin
      .from("users")
      .select("id, restaurant_id, role, user_type")
      .eq("id", userId)
      .maybeSingle();

    const { data: isSuperAdmin } = await admin.rpc("is_super_admin", { user_id: userId });

    // 1) Restaurante. O front usa users.restaurant_id, então o backend precisa
    // respeitar o mesmo vínculo antes de cair no owner_id.
    let restaurantQuery = admin
      .from("restaurants")
      .select("id, name, owner_id");

    restaurantQuery = profile?.restaurant_id
      ? restaurantQuery.eq("id", profile.restaurant_id)
      : restaurantQuery.eq("owner_id", userId);

    const { data: restaurant, error: restErr } = await restaurantQuery
      .maybeSingle();

    if (restErr || !restaurant) {
      return new Response(JSON.stringify({ error: "Restaurant not found for user" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (restaurant.owner_id !== userId && !isSuperAdmin) {
      return new Response(JSON.stringify({ error: "Only the restaurant owner can subscribe" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2) Plano local sincronizado
    const { data: plan, error: planErr } = await admin
      .from("plans")
      .select("id, name, is_active, trial_days, pagarme_plan_id_monthly, pagarme_plan_id_yearly")
      .eq("id", body.local_plan_id)
      .maybeSingle();
    if (planErr || !plan) {
      return new Response(JSON.stringify({ error: "Plan not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!plan.is_active) {
      return new Response(JSON.stringify({ error: "Plan is inactive" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const pagarmePlanId = body.billing_cycle === "monthly"
      ? plan.pagarme_plan_id_monthly
      : plan.pagarme_plan_id_yearly;
    if (!pagarmePlanId) {
      return new Response(JSON.stringify({
        error: `Plan is not synced with Pagar.me (${body.billing_cycle}). Sync from Super Admin first.`,
      }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 3) Customer
    const docDigits = digits(body.customer.document);
    const docType = body.customer.document_type || (docDigits.length === 14 ? "cnpj" : "cpf");
    const phoneDigits = digits(body.customer.phone);
    const areaCode = phoneDigits.slice(0, 2);
    const phoneNumber = phoneDigits.slice(2);

    const customer = await pagarme("/customers", "POST", {
      name: body.customer.name,
      email: body.customer.email,
      document: docDigits,
      document_type: docType,
      type: docType === "cnpj" ? "company" : "individual",
      phones: {
        mobile_phone: {
          country_code: "55",
          area_code: areaCode,
          number: phoneNumber,
        },
      },
    });

    // 4) Subscription (boleto)
    const subscriptionPayload: Record<string, unknown> = {
      plan_id: pagarmePlanId,
      customer_id: customer.id,
      payment_method: body.payment_method,
      boleto_due_days: 3,
    };
    const subscription = await pagarme("/subscriptions", "POST", subscriptionPayload);

    // 5) Datas e status
    const now = new Date();
    const trialDays = plan.trial_days ?? 0;
    const trialStart = trialDays > 0 ? now : null;
    const trialEnd = trialDays > 0 ? new Date(now.getTime() + trialDays * 86400000) : null;

    const status: string = subscription.status === "trialing"
      ? "trialing"
      : subscription.status === "active"
        ? "active"
        : subscription.status === "past_due"
          ? "past_due"
          : subscription.status === "canceled"
            ? "canceled"
            : (trialEnd ? "trialing" : "active");

    const nextBilling = subscription.next_billing_at
      ? new Date(subscription.next_billing_at)
      : (trialEnd ?? null);
    const currentPeriodEnd = subscription.current_period_end
      ? new Date(subscription.current_period_end)
      : (trialEnd ?? null);

    // 6) Cancela assinaturas vivas anteriores
    await admin
      .from("subscriptions")
      .update({ status: "canceled", end_date: now.toISOString() })
      .eq("restaurant_id", restaurant.id)
      .in("status", ["active", "trialing", "past_due"]);

    // 7) Persiste
    const { data: inserted, error: insertErr } = await admin
      .from("subscriptions")
      .insert({
        restaurant_id: restaurant.id,
        plan_id: plan.id,
        status,
        is_trial: trialDays > 0,
        billing_cycle: body.billing_cycle,
        start_date: now.toISOString(),
        trial_start: trialStart?.toISOString() ?? null,
        trial_ends_at: trialEnd?.toISOString() ?? null,
        current_period_start: now.toISOString(),
        current_period_end: currentPeriodEnd?.toISOString() ?? null,
        next_billing_at: nextBilling?.toISOString() ?? null,
        pagarme_subscription_id: subscription.id,
        pagarme_customer_id: customer.id,
      })
      .select()
      .single();

    if (insertErr) {
      return new Response(JSON.stringify({
        success: false,
        error: `Subscription created on Pagar.me but DB insert failed: ${insertErr.message}`,
        pagarme_subscription_id: subscription.id,
        pagarme_customer_id: customer.id,
      }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    try {
      await sendManagedEmail({
        admin,
        restaurantId: restaurant.id,
        templateKey: "subscription_created",
        emailType: "transactional",
        to: body.customer.email,
        recipientName: body.customer.name,
        contextType: "subscription",
        contextId: inserted.id,
        variables: {
          customer_name: body.customer.name,
          plan_name: plan.name,
          status,
        },
        metadata: { source: "pagarme_create_boleto_pix", billing_cycle: body.billing_cycle },
      });
    } catch (emailError) {
      console.error("Failed to send subscription email:", emailError);
    }

    // 8) Extrai dados do boleto da última fatura/charge se disponível
    const latestInvoice = subscription?.current_cycle ?? null;
    const charge = latestInvoice?.charges?.[0]
      ?? subscription?.invoices?.[0]?.charges?.[0]
      ?? null;
    const lastTransaction = charge?.last_transaction ?? null;

    const paymentInfo: Record<string, unknown> = {};
    if (lastTransaction) {
      paymentInfo.boleto_url = lastTransaction.url ?? lastTransaction.pdf ?? null;
      paymentInfo.boleto_barcode = lastTransaction.barcode ?? null;
      paymentInfo.boleto_line = lastTransaction.line ?? null;
      paymentInfo.due_at = lastTransaction.due_at ?? null;
    }

    return new Response(JSON.stringify({
      success: true,
      subscription: inserted,
      payment: paymentInfo,
      pagarme: {
        subscription_id: subscription.id,
        customer_id: customer.id,
        status: subscription.status,
      },
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
