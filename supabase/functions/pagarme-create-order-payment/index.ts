// Edge Function: pagarme-create-order-payment
// Creates a Pagar.me payment for a public menu order.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { captureEdgeException } from "../_shared/observability.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const PAGARME_SECRET_KEY = Deno.env.get("PAGARME_SECRET_KEY") ?? "";
const PLATFORM_RECIPIENT_ID = Deno.env.get("PAGARME_PLATFORM_RECIPIENT_ID") ?? "";

type Body = {
  order_id?: string;
  tracking_id?: string;
  payment_method?: "pix";
};

type PagarmeErrorPayload = {
  message?: string;
  errors?: Array<{ message?: string }>;
};

type PaymentSettings = {
  is_enabled?: boolean | null;
  onboarding_status?: string | null;
  enabled_methods?: string[] | null;
  marketplace_mode?: string | null;
  recipient_id?: string | null;
  commission_type?: "none" | "percentage" | "flat" | string | null;
  commission_value?: number | string | null;
};

type OrderItemRow = {
  id: string;
  product_name: string | null;
  quantity: number | null;
  price: number | string | null;
};

type PagarmeTransaction = {
  qr_code?: string | null;
  qrcode?: string | null;
  qr_code_url?: string | null;
  qrcode_url?: string | null;
  expires_at?: string | null;
};

type PagarmeCharge = {
  id?: string | null;
  status?: string | null;
  last_transaction?: PagarmeTransaction | null;
  lastTransaction?: PagarmeTransaction | null;
};

type PagarmeOrder = {
  id?: string | null;
  status?: string | null;
  charges?: PagarmeCharge[] | null;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function cents(value: number) {
  return Math.max(0, Math.round(Number(value || 0) * 100));
}

function onlyDigits(value?: string | null) {
  return String(value || "").replace(/\D/g, "");
}

function phoneObject(phone?: string | null) {
  const digits = onlyDigits(phone);
  if (digits.length < 10) return undefined;
  const withoutCountry = digits.startsWith("55") && digits.length > 11 ? digits.slice(2) : digits;
  const areaCode = withoutCountry.slice(0, 2);
  const number = withoutCountry.slice(2);
  return {
    mobile_phone: {
      country_code: "55",
      area_code: areaCode,
      number,
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function pagarmeErrorMessage(data: unknown) {
  const payload = isRecord(data) ? data as PagarmeErrorPayload : null;
  return payload?.message || payload?.errors?.[0]?.message || JSON.stringify(data);
}

async function pagarme<T>(path: string, method: string, body?: unknown): Promise<T> {
  if (!PAGARME_SECRET_KEY) throw new Error("PAGARME_SECRET_KEY is not configured");

  const res = await fetch(`https://api.pagar.me/core/v5${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${btoa(`${PAGARME_SECRET_KEY}:`)}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data: unknown = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = pagarmeErrorMessage(data);
    throw new Error(`Pagar.me ${method} ${path}: ${msg}`);
  }

  return data as T;
}

function buildSplit(settings: PaymentSettings, amountInCents: number) {
  if (!settings?.recipient_id) return undefined;

  const restaurantRecipient = String(settings.recipient_id);
  const commissionType = settings.commission_type || "none";
  const commissionValue = Number(settings.commission_value || 0);

  if (commissionType === "percentage" && commissionValue > 0 && PLATFORM_RECIPIENT_ID) {
    const platformPercentage = Math.min(100, Math.max(0, commissionValue));
    return [
      {
        type: "percentage",
        amount: 100 - platformPercentage,
        recipient_id: restaurantRecipient,
        options: {
          liable: true,
          charge_processing_fee: true,
          charge_remainder_fee: true,
        },
      },
      {
        type: "percentage",
        amount: platformPercentage,
        recipient_id: PLATFORM_RECIPIENT_ID,
        options: {
          liable: false,
          charge_processing_fee: false,
          charge_remainder_fee: false,
        },
      },
    ];
  }

  if (commissionType === "flat" && commissionValue > 0 && PLATFORM_RECIPIENT_ID) {
    const platformAmount = Math.min(amountInCents, cents(commissionValue));
    return [
      {
        type: "flat",
        amount: amountInCents - platformAmount,
        recipient_id: restaurantRecipient,
        options: {
          liable: true,
          charge_processing_fee: true,
          charge_remainder_fee: true,
        },
      },
      {
        type: "flat",
        amount: platformAmount,
        recipient_id: PLATFORM_RECIPIENT_ID,
        options: {
          liable: false,
          charge_processing_fee: false,
          charge_remainder_fee: false,
        },
      },
    ];
  }

  return [
    {
      type: "percentage",
      amount: 100,
      recipient_id: restaurantRecipient,
      options: {
        liable: true,
        charge_processing_fee: true,
        charge_remainder_fee: true,
      },
    },
  ];
}

function mapPaymentStatus(status?: string) {
  switch (status) {
    case "paid":
      return "paid";
    case "failed":
    case "canceled":
      return "failed";
    case "refunded":
      return "refunded";
    default:
      return "pending";
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const body = await req.json() as Body;
    if (!body.order_id) return json({ error: "order_id is required" }, 400);
    if (!body.tracking_id) return json({ error: "tracking_id is required" }, 400);
    if (body.payment_method !== "pix") {
      return json({ error: "Only PIX online is available for public order payments" }, 400);
    }

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, restaurant_id, order_number, customer_name, customer_phone, customer_email, total, payment_method, payment_status, source, created_at")
      .eq("id", body.order_id)
      .maybeSingle();

    if (orderError) throw orderError;
    if (!order) return json({ error: "Order not found" }, 404);
    if (order.source !== "cardapio") return json({ error: "Only public menu orders can use this payment flow" }, 400);
    if (order.payment_method !== "pix_online") return json({ error: "Order is not configured for PIX online" }, 400);

    let trackingMatchesOrder = body.tracking_id === order.id;
    if (!trackingMatchesOrder) {
      const { data: deliveryTracking, error: trackingError } = await supabase
        .from("delivery_orders")
        .select("id")
        .eq("id", body.tracking_id)
        .eq("order_id", order.id)
        .maybeSingle();

      if (trackingError) throw trackingError;
      trackingMatchesOrder = !!deliveryTracking;
    }

    if (!trackingMatchesOrder) {
      return json({ error: "Invalid order tracking token" }, 403);
    }

    const createdAt = new Date(order.created_at).getTime();
    if (Number.isFinite(createdAt) && Date.now() - createdAt > 30 * 60 * 1000) {
      return json({ error: "Payment creation window expired for this order" }, 400);
    }

    const { data: existingPayment } = await supabase
      .from("order_payments")
      .select("*")
      .eq("order_id", order.id)
      .eq("payment_method", "pix")
      .in("status", ["pending", "paid"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingPayment) {
      return json({
        status: existingPayment.status,
        payment_method: "pix",
        qr_code: existingPayment.qr_code,
        qr_code_url: existingPayment.qr_code_url,
        expires_at: existingPayment.expires_at,
        amount: Number(existingPayment.amount || 0),
      });
    }

    const { data: settingsData, error: settingsError } = await supabase
      .from("restaurant_payment_settings")
      .select("*")
      .eq("restaurant_id", order.restaurant_id)
      .maybeSingle();

    if (settingsError) throw settingsError;
    const settings = settingsData as PaymentSettings | null;
    if (!settings?.is_enabled || settings.onboarding_status !== "approved") {
      return json({ error: "Online payments are not enabled for this restaurant" }, 400);
    }
    if (!settings.enabled_methods?.includes("pix")) {
      return json({ error: "PIX online is not enabled for this restaurant" }, 400);
    }
    if (settings.marketplace_mode === "split" && !settings.recipient_id) {
      return json({ error: "Restaurant Pagar.me recipient is not configured" }, 400);
    }

    const { data: items, error: itemsError } = await supabase
      .from("order_items")
      .select("id, product_name, quantity, price")
      .eq("order_id", order.id)
      .order("created_at", { ascending: true });

    if (itemsError) throw itemsError;
    if (!items?.length) return json({ error: "Order has no items" }, 400);

    const { data: deliveryOrder, error: deliveryError } = await supabase
      .from("delivery_orders")
      .select("delivery_fee")
      .eq("order_id", order.id)
      .maybeSingle();

    if (deliveryError) throw deliveryError;

    let pagarmeLineItems;
    try {
      pagarmeLineItems = buildPagarmeOrderLineItems({
        items: items as OrderItemRow[],
        orderTotal: Number(order.total || 0),
        deliveryFee: Number(deliveryOrder?.delivery_fee ?? 0),
      });
    } catch (reconcileError) {
      const msg = reconcileError instanceof Error ? reconcileError.message : String(reconcileError);
      return json({ error: `Order total does not match billable items: ${msg}` }, 400);
    }

    const amountInCents = pagarmeLineItems.reduce(
      (sum, li) => sum + li.amount * li.quantity,
      0,
    );
    if (amountInCents !== toCents(Number(order.total || 0))) {
      return json({ error: "Order total does not match billable items" }, 400);
    }

    const split = settings.marketplace_mode === "split" ? buildSplit(settings, amountInCents) : undefined;
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const phone = phoneObject(order.customer_phone);

    const payment: Record<string, unknown> = {
      payment_method: "pix",
      pix: {
        expires_in: 1800,
      },
    };
    if (split) payment.split = split;

    const pagarmeOrder = await pagarme<PagarmeOrder>("/orders", "POST", {
      code: order.order_number || order.id,
      closed: true,
      items: pagarmeLineItems,
      customer: {
        name: order.customer_name || "Cliente",
        email: order.customer_email || `pedido-${order.id}@pubfy.local`,
        type: "individual",
        ...(phone ? { phones: phone } : {}),
      },
      payments: [payment],
      metadata: {
        source: "pubfy_public_menu",
        order_id: order.id,
        restaurant_id: order.restaurant_id,
        tracking_id: body.tracking_id || null,
      },
    });

    const charge = pagarmeOrder.charges?.[0] ?? null;
    const tx = charge?.last_transaction ?? charge?.lastTransaction ?? {};
    const status = mapPaymentStatus(charge?.status ?? pagarmeOrder.status ?? undefined);
    const paidAt = status === "paid" ? new Date().toISOString() : null;

    const { data: savedPayment, error: paymentError } = await supabase
      .from("order_payments")
      .insert({
        restaurant_id: order.restaurant_id,
        order_id: order.id,
        provider: "pagarme",
        provider_order_id: pagarmeOrder.id ?? null,
        provider_charge_id: charge?.id ?? null,
        status,
        payment_method: "pix",
        amount: Number(order.total || 0),
        qr_code: tx.qr_code ?? tx.qrcode ?? null,
        qr_code_url: tx.qr_code_url ?? tx.qrcode_url ?? null,
        expires_at: tx.expires_at ?? expiresAt,
        paid_at: paidAt,
        raw_response: pagarmeOrder,
      })
      .select("*")
      .single();

    if (paymentError) throw paymentError;

    await supabase
      .from("orders")
      .update({
        payment_status: status,
        payment_provider: "pagarme",
        payment_reference: pagarmeOrder.id ?? charge?.id ?? null,
        paid_at: paidAt,
        status: status === "paid" ? "pendente" : "aguardando_pagamento",
      })
      .eq("id", order.id);

    await supabase
      .from("delivery_orders")
      .update({
        payment_status: status,
        payment_provider: "pagarme",
        payment_reference: pagarmeOrder.id ?? charge?.id ?? null,
        paid_at: paidAt,
        status: status === "paid" ? "pending" : "awaiting_payment",
      })
      .eq("order_id", order.id);

    return json({
      status: savedPayment.status,
      payment_method: "pix",
      qr_code: savedPayment.qr_code,
      qr_code_url: savedPayment.qr_code_url,
      expires_at: savedPayment.expires_at,
      amount: Number(savedPayment.amount || 0),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[pagarme-create-order-payment]", message);
    await captureEdgeException(error, {
      functionName: "pagarme-create-order-payment",
      req,
    });
    return json({ error: message }, 400);
  }
});
