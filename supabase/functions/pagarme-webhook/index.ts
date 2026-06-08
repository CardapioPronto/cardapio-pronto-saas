// Pagar.me Webhook Receiver
// URL: https://jyrfjvyeikhqpuwcvdff.supabase.co/functions/v1/pagarme-webhook
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { sendManagedEmail } from "../_shared/email-delivery.ts";
import { captureEdgeException } from "../_shared/observability.ts";
import {
  buildLocalSubscriptionFromPagarme,
  computeRemainingCreditMs,
  resolvePaidSubscriptionPeriod,
  subscriptionInsertRow,
  type BillingCycle,
  type PriorEntitlement,
} from "../_shared/pagarme-checkout-subscription.ts";
import { pagarmeErrorMessage } from "../_shared/pagarme-errors.ts";
import {
  createRecurringSubscriptionAfterCardOrder,
  needsRecurringSubscriptionFromOrderId,
  pagarmePlanIdForCycle,
  type PagarmeOrderForRecurring,
} from "../_shared/pagarme-recurring-subscription.ts";
import {
  SUBSCRIPTION_ENTITLEMENT_STATUSES,
  supersedePriorSubscriptions,
} from "../_shared/pagarme-subscription-status.ts";
import {
  buildPagarmeReference,
  extractPagarmePaidAmountCents,
  tryAccrueReferralCommission,
  tryReverseReferralCommission,
} from "../_shared/referral-commission.ts";
import {
  reconcileOrderPaymentFromPagarme,
  type PagarmeOrderPaymentData,
} from "../_shared/pagarme-order-payment-reconcile.ts";
import {
  applyRecipientStatusToRestaurant,
  normalizeRecipientStatus,
  resolveRestaurantForRecipient,
  type PagarmeRecipientSnapshot,
} from "../_shared/pagarme-recipient-status.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-hub-signature, x-pagarme-signature",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const WEBHOOK_SECRET = Deno.env.get("PAGARME_WEBHOOK_SECRET") ?? "";
const PAGARME_SECRET_KEY = Deno.env.get("PAGARME_SECRET_KEY") ?? "";
const PAGARME_API_URL = "https://api.pagar.me/core/v5";

function pagarmeAuthHeader() {
  if (!PAGARME_SECRET_KEY) throw new Error("PAGARME_SECRET_KEY not configured");
  return `Basic ${btoa(PAGARME_SECRET_KEY + ":")}`;
}

async function pagarmeApi<T>(path: string, method: string, body?: unknown): Promise<T> {
  const res = await fetch(`${PAGARME_API_URL}${path}`, {
    method,
    headers: {
      Authorization: pagarmeAuthHeader(),
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    throw new Error(`Pagar.me ${method} ${path}: ${pagarmeErrorMessage(data, res.status)}`);
  }
  return data as T;
}

type PlatformSubscriptionMetadata = {
  source?: string | null;
  subscription_id?: string | null;
  restaurant_id?: string | null;
  plan_id?: string | null;
  billing_cycle?: string | null;
  order_id?: string | null;
};

type PagarmeNestedObject = {
  id?: string | null;
  subscription_id?: string | null;
  metadata?: PlatformSubscriptionMetadata | null;
};

type PagarmeData = {
  id?: string | null;
  status?: string | null;
  subscription_id?: string | null;
  order_id?: string | null;
  next_billing_at?: string | null;
  current_period_start?: string | null;
  current_period_end?: string | null;
  interval?: string | null;
  amount?: number | null;
  paid_amount?: number | null;
  metadata?: PlatformSubscriptionMetadata | null;
  subscription?: PagarmeNestedObject | null;
  invoice?: PagarmeNestedObject | null;
  order?: PagarmeNestedObject | null;
  charge?: PagarmeNestedObject | null;
  charges?: PagarmeNestedObject[] | null;
  customer?: PagarmeNestedObject | null;
  customer_id?: string | null;
  [key: string]: unknown;
};

type PagarmeEvent = {
  id?: string | null;
  type?: string | null;
  data?: PagarmeData | null;
  [key: string]: unknown;
};

type SubscriptionWithRestaurant = {
  id: string;
  restaurant_id: string;
  plan_id: string;
  restaurants?: { owner_id?: string | null } | null;
};

function normalizeSignature(signatureHeader: string | null) {
  return (signatureHeader ?? "")
    .replace(/^sha1=/i, "")
    .replace(/^sha256=/i, "")
    .trim()
    .toLowerCase();
}

async function hmacHex(rawBody: string, secret: string, hash: "SHA-1" | "SHA-256") {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash },
    false,
    ["sign"],
  );
  const sigBuf = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  return Array.from(new Uint8Array(sigBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqualHex(computed: string, expected: string) {
  if (computed.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < computed.length; i++) {
    diff |= computed.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

async function verifySignature(rawBody: string, signatureHeader: string | null): Promise<boolean> {
  if (!signatureHeader) return false;

  const expected = normalizeSignature(signatureHeader);
  if (!expected) return false;

  const secrets = [WEBHOOK_SECRET, PAGARME_SECRET_KEY].filter(Boolean);
  if (secrets.length === 0) {
    console.warn("[pagarme-webhook] PAGARME_WEBHOOK_SECRET/PAGARME_SECRET_KEY not configured");
    return false;
  }

  for (const secret of secrets) {
    for (const hash of ["SHA-256", "SHA-1"] as const) {
      const computed = await hmacHex(rawBody, secret, hash);
      if (timingSafeEqualHex(computed, expected)) return true;
    }
  }

  return false;
}

function extractPagarmeSubscriptionId(type: string, data: PagarmeData) {
  if (type.startsWith("subscription.")) return data.id ?? data.subscription_id ?? null;
  return data.subscription_id ?? data.subscription?.id ?? data.invoice?.subscription_id ?? null;
}

function extractPagarmeOrderId(type: string, data: PagarmeData) {
  if (type.startsWith("order.")) return data.id ?? null;
  return data.order?.id ?? data.order_id ?? null;
}

const PLATFORM_SUBSCRIPTION_SOURCE = "pubfy_platform_subscription";

function getPlatformSubscriptionMetadata(
  data: PagarmeData,
): PlatformSubscriptionMetadata | null {
  const metadata = data.metadata ?? data.order?.metadata ?? null;
  if (!metadata || metadata.source !== PLATFORM_SUBSCRIPTION_SOURCE) return null;
  return metadata;
}

async function promoteOrderCheckoutToRecurringSubscription(input: {
  pagarmeOrderId: string;
  restaurantId: string;
  planId: string;
  billingCycle: BillingCycle;
  nextBillingAt: string;
}): Promise<{ subscriptionId: string; customerId: string | null } | null> {
  const { data: plan } = await supabase
    .from("plans")
    .select("pagarme_plan_id_monthly, pagarme_plan_id_yearly")
    .eq("id", input.planId)
    .maybeSingle();

  const pagarmePlanId = plan ? pagarmePlanIdForCycle(plan, input.billingCycle) : null;
  if (!pagarmePlanId) {
    console.error(
      "[pagarme-webhook] plan not synced for recurring promotion",
      input.planId,
      input.billingCycle,
    );
    return null;
  }

  const order = await pagarmeApi<PagarmeOrderForRecurring>(
    `/orders/${encodeURIComponent(input.pagarmeOrderId)}`,
    "GET",
  );

  const recurring = await createRecurringSubscriptionAfterCardOrder(pagarmeApi, {
    order,
    pagarmePlanId,
    billingCycle: input.billingCycle,
    restaurantId: input.restaurantId,
    planId: input.planId,
    startAt: input.nextBillingAt,
  });

  if (!recurring.subscription.id) return null;
  return {
    subscriptionId: recurring.subscription.id,
    customerId: recurring.customerId,
  };
}

async function healPaidPlatformOrderWithoutLocalRow(
  metadata: PlatformSubscriptionMetadata,
  pagarmeOrderId: string,
): Promise<void> {
  const restaurantId = metadata.restaurant_id;
  const planId = metadata.plan_id;
  if (!restaurantId || !planId) return;

  const billingCycle: BillingCycle = metadata.billing_cycle === "yearly"
    ? "yearly"
    : "monthly";

  const { data: priorSub } = await supabase
    .from("subscriptions")
    .select("status, is_trial, current_period_end, trial_ends_at")
    .eq("restaurant_id", restaurantId)
    .in("status", [...SUBSCRIPTION_ENTITLEMENT_STATUSES])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const now = new Date();
  const localSub = buildLocalSubscriptionFromPagarme({
    pagarme: { status: "active", start_at: now.toISOString() },
    billingCycle,
    paymentMethod: "credit_card",
    priorEntitlement: priorSub,
  });
  const insertRow = subscriptionInsertRow(localSub);

  const promoted = await promoteOrderCheckoutToRecurringSubscription({
    pagarmeOrderId,
    restaurantId,
    planId,
    billingCycle,
    nextBillingAt: insertRow.next_billing_at,
  });

  if (!promoted) {
    throw new Error("Failed to create recurring subscription for paid platform order");
  }

  const { error: insertErr } = await supabase.rpc("insert_paid_checkout_subscription", {
    p_restaurant_id: restaurantId,
    p_plan_id: planId,
    p_status: insertRow.status,
    p_is_trial: insertRow.is_trial,
    p_trial_start: insertRow.trial_start,
    p_trial_ends_at: insertRow.trial_ends_at,
    p_billing_cycle: insertRow.billing_cycle,
    p_start_date: insertRow.start_date,
    p_current_period_start: insertRow.current_period_start,
    p_current_period_end: insertRow.current_period_end,
    p_next_billing_at: insertRow.next_billing_at,
    p_pagarme_subscription_id: promoted.subscriptionId,
    p_pagarme_customer_id: promoted.customerId,
    p_last_payment_status: "paid",
    p_last_payment_at: now.toISOString(),
  });

  if (insertErr) {
    throw new Error(`insert_paid_checkout_subscription: ${insertErr.message}`);
  }

  const { data: insertedSub } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("restaurant_id", restaurantId)
    .eq("pagarme_subscription_id", promoted.subscriptionId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const reference = buildPagarmeReference("order", { id: pagarmeOrderId }, promoted.subscriptionId);
  if (insertedSub?.id && reference) {
    await tryAccrueReferralCommission(supabase, {
      localSubscriptionId: insertedSub.id,
      pagarmeReference: reference,
      grossAmountCents: extractPagarmePaidAmountCents({ id: pagarmeOrderId }),
    });
  }
}

async function processPlatformSubscriptionOrderPayment(
  type: string,
  data: PagarmeData,
): Promise<boolean> {
  const metadata = getPlatformSubscriptionMetadata(data);
  const pagarmeOrderId = extractPagarmeOrderId(type, data);

  let subscriptionId = metadata?.subscription_id ?? null;
  if (!subscriptionId && pagarmeOrderId) {
    const { data: localSub } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("pagarme_subscription_id", pagarmeOrderId)
      .maybeSingle();
    subscriptionId = localSub?.id ?? null;
  }

  const newPaymentStatus = mapOrderPaymentStatus(type, data.status);

  if (!subscriptionId && metadata && newPaymentStatus === "paid" && pagarmeOrderId) {
    await healPaidPlatformOrderWithoutLocalRow(metadata, pagarmeOrderId);
    return true;
  }

  if (!subscriptionId && !metadata) return false;
  if (!subscriptionId) return true;

  if (!newPaymentStatus) return true;
  const update: Record<string, unknown> = {
    last_payment_status: data.status ?? type,
    updated_at: new Date().toISOString(),
  };

  if (newPaymentStatus === "paid") {
    update.status = "active";
    update.last_payment_at = new Date().toISOString();
    update.is_trial = false;
    update.trial_start = null;
    update.trial_ends_at = null;

    const { data: localSub } = await supabase
      .from("subscriptions")
      .select(
        "pagarme_subscription_id, billing_cycle, restaurant_id, plan_id, status, is_trial, trial_ends_at, current_period_start, current_period_end",
      )
      .eq("id", subscriptionId)
      .maybeSingle();

    const orderRef = pagarmeOrderId ?? localSub?.pagarme_subscription_id ?? null;

    if (
      orderRef &&
      needsRecurringSubscriptionFromOrderId(localSub?.pagarme_subscription_id) &&
      localSub?.restaurant_id &&
      localSub?.plan_id
    ) {
      const billingCycle: BillingCycle = localSub.billing_cycle === "yearly"
        ? "yearly"
        : "monthly";
      const periodStart = localSub.status === "pending"
        ? new Date()
        : localSub.current_period_start
          ? new Date(localSub.current_period_start)
          : new Date();
      const prior: PriorEntitlement = {
        status: localSub.status,
        is_trial: localSub.is_trial,
        current_period_end: localSub.current_period_end,
        trial_ends_at: localSub.trial_ends_at,
      };
      const { nextBilling } = resolvePaidSubscriptionPeriod({
        billingCycle,
        periodStart,
        remainingCreditMs: computeRemainingCreditMs(new Date(), prior),
      });

      const promoted = await promoteOrderCheckoutToRecurringSubscription({
        pagarmeOrderId: orderRef,
        restaurantId: localSub.restaurant_id,
        planId: localSub.plan_id,
        billingCycle,
        nextBillingAt: nextBilling.toISOString(),
      });

      if (promoted) {
        update.pagarme_subscription_id = promoted.subscriptionId;
        if (promoted.customerId) update.pagarme_customer_id = promoted.customerId;
      }
    }

    const lookupId = (update.pagarme_subscription_id as string | undefined) ??
      orderRef ??
      localSub?.pagarme_subscription_id ??
      null;
    if (lookupId) {
      await applyPaidPeriodToUpdate(lookupId, update);
    }
  } else if (newPaymentStatus === "failed") {
    update.status = "canceled";
    update.end_date = new Date().toISOString();
  } else if (newPaymentStatus === "canceled") {
    update.status = "canceled";
    update.end_date = new Date().toISOString();
  }

  await supabase
    .from("subscriptions")
    .update(update)
    .eq("id", subscriptionId);

  if (update.status === "active") {
    await supersedeSubscriptionById(subscriptionId);
    const reference = buildPagarmeReference(type, data, pagarmeOrderId ?? undefined);
    if (reference) {
      await tryAccrueReferralCommission(supabase, {
        localSubscriptionId: subscriptionId,
        pagarmeReference: reference,
        grossAmountCents: extractPagarmePaidAmountCents(data),
      });
    }
  }

  return true;
}

function mapStatus(pagarmeStatus: string): string {
  switch (pagarmeStatus) {
    case "active":
    case "paid":
      return "active";
    case "trialing":
      return "trialing";
    case "future":
    case "scheduled":
      return "pending";
    case "past_due":
    case "unpaid":
      return "past_due";
    case "failed":
      return "canceled";
    case "canceled":
    case "ended":
      return "canceled";
    case "pending":
      return "pending";
    default:
      return pagarmeStatus;
  }
}

async function applyPaidPeriodToUpdate(
  pagarmeSubId: string,
  update: Record<string, unknown>,
  pagarmePeriodStart?: string | null,
  pagarmePeriodEnd?: string | null,
  pagarmeNextBilling?: string | null,
  pagarmeInterval?: string | null,
) {
  const { data: localSub } = await supabase
    .from("subscriptions")
    .select(
      "billing_cycle, current_period_start, current_period_end, trial_ends_at, status, is_trial",
    )
    .eq("pagarme_subscription_id", pagarmeSubId)
    .maybeSingle();

  const billingCycle: BillingCycle =
    pagarmeInterval === "year" || localSub?.billing_cycle === "yearly"
      ? "yearly"
      : "monthly";

  const now = new Date();
  const periodStart = pagarmePeriodStart
    ? new Date(pagarmePeriodStart)
    : localSub?.status === "pending"
      ? now
      : localSub?.current_period_start
      ? new Date(localSub.current_period_start)
      : now;

  const prior: PriorEntitlement | null = localSub
    ? {
        status: localSub.status,
        is_trial: localSub.is_trial,
        current_period_end: localSub.current_period_end,
        trial_ends_at: localSub.trial_ends_at,
      }
    : null;

  const { periodEnd, nextBilling } = resolvePaidSubscriptionPeriod({
    billingCycle,
    periodStart,
    pagarmePeriodEnd,
    pagarmeNextBilling,
    remainingCreditMs: computeRemainingCreditMs(now, prior),
  });

  update.billing_cycle = billingCycle;
  update.current_period_start = periodStart.toISOString();
  update.current_period_end = periodEnd.toISOString();
  update.next_billing_at = nextBilling.toISOString();
}

async function supersedeSubscriptionById(subscriptionId: string) {
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("id, restaurant_id")
    .eq("id", subscriptionId)
    .maybeSingle();

  if (sub?.restaurant_id) {
    await supersedePriorSubscriptions(supabase, sub.restaurant_id, sub.id);
  }
}

async function supersedeSubscriptionByPagarmeId(pagarmeSubId: string) {
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("id, restaurant_id")
    .eq("pagarme_subscription_id", pagarmeSubId)
    .maybeSingle();

  if (sub?.restaurant_id) {
    await supersedePriorSubscriptions(supabase, sub.restaurant_id, sub.id);
  }
}

function recipientConfigUrl(): string {
  const base = (Deno.env.get("PUBLIC_SITE_URL") || Deno.env.get("SITE_URL") || "").replace(/\/+$/, "");
  return base ? `${base}/pagarme-config` : "/pagarme-config";
}

async function sendRecipientStatusEmail(
  restaurantId: string,
  templateKey: "recipient_activated" | "recipient_refused",
  variables: Record<string, unknown>,
) {
  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("id, name, owner_id")
    .eq("id", restaurantId)
    .maybeSingle();

  if (!restaurant?.owner_id) return;

  const { data: owner } = await supabase
    .from("users")
    .select("email, name")
    .eq("id", restaurant.owner_id)
    .maybeSingle();

  if (!owner?.email) return;

  await sendManagedEmail({
    admin: supabase,
    restaurantId,
    templateKey,
    emailType: "transactional",
    to: owner.email,
    recipientName: owner.name,
    contextType: "recipient_onboarding",
    contextId: restaurantId,
    variables: {
      customer_name: owner.name || "Cliente",
      restaurant_name: restaurant.name || "Restaurante",
      config_url: recipientConfigUrl(),
      ...variables,
    },
    metadata: { source: "pagarme_webhook", template_key: templateKey },
  });
}

async function processRecipientEvent(type: string, data: PagarmeData): Promise<void> {
  const recipient = data as PagarmeRecipientSnapshot;
  const recipientId = recipient.id;
  if (!recipientId) return;

  const resolved = await resolveRestaurantForRecipient(
    supabase,
    recipientId,
    recipient.metadata,
  );
  if (!resolved) return;

  const previousStatus = normalizeRecipientStatus(resolved.previous_status);

  if (type === "recipient.deleted") {
    await applyRecipientStatusToRestaurant(
      supabase,
      resolved.restaurant_id,
      { ...recipient, status: "inactive" },
      data as Record<string, unknown>,
    );
    return;
  }

  const result = await applyRecipientStatusToRestaurant(
    supabase,
    resolved.restaurant_id,
    recipient,
    data as Record<string, unknown>,
  );

  if (result.recipient_status === "active" && previousStatus !== "active") {
    await sendRecipientStatusEmail(resolved.restaurant_id, "recipient_activated", {
      recipient_status: "Ativo",
      status_message: "Seu recebedor foi aprovado. Você já pode ligar o PIX online.",
    }).catch((error) => console.error("[pagarme-webhook] recipient activated email failed:", error));
  }

  if (result.recipient_status === "refused" && previousStatus !== "refused") {
    const reason = recipient.kyc_details?.status_reason;
    await sendRecipientStatusEmail(resolved.restaurant_id, "recipient_refused", {
      recipient_status: "Recusado",
      status_message: reason
        ? `Motivo informado pelo Pagar.me: ${reason}. Revise os dados ou contate o suporte.`
        : "Revise os dados cadastrados ou contate o suporte Pubfy.",
    }).catch((error) => console.error("[pagarme-webhook] recipient refused email failed:", error));
  }
}

async function processEvent(event: PagarmeEvent): Promise<void> {
  const type: string = event.type ?? "";
  const data = event.data ?? {};

  if (type.startsWith("recipient.")) {
    await processRecipientEvent(type, data);
    return;
  }

  // Subscription events
  if (type.startsWith("subscription.")) {
    const subscription = data;
    const pagarmeSubId = subscription.id;
    if (!pagarmeSubId) return;

    const newStatus = type === "subscription.canceled"
      ? "canceled"
      : mapStatus(subscription.status ?? "active");

    const update: Record<string, unknown> = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    };
    if (subscription.customer?.id) update.pagarme_customer_id = subscription.customer.id;
    if (newStatus === "canceled") update.end_date = new Date().toISOString();
    if (newStatus === "active") {
      update.is_trial = false;
      update.trial_start = null;
      update.trial_ends_at = null;
      await applyPaidPeriodToUpdate(
        pagarmeSubId,
        update,
        subscription.current_period_start,
        subscription.current_period_end,
        subscription.next_billing_at,
        subscription.interval,
      );
    } else {
      if (subscription.next_billing_at) update.next_billing_at = subscription.next_billing_at;
      if (subscription.current_period_start) {
        update.current_period_start = subscription.current_period_start;
      }
      if (subscription.current_period_end) update.current_period_end = subscription.current_period_end;
      if (subscription.interval === "month") update.billing_cycle = "monthly";
      else if (subscription.interval === "year") update.billing_cycle = "yearly";
    }

    await supabase
      .from("subscriptions")
      .update(update)
      .eq("pagarme_subscription_id", pagarmeSubId);

    if (newStatus === "active") {
      await supersedeSubscriptionByPagarmeId(pagarmeSubId);
    }
    return;
  }

  // Charge / invoice events
  if (type.startsWith("charge.") || type.startsWith("invoice.")) {
    const charge = data;
    if (await processPlatformSubscriptionOrderPayment(type, charge)) {
      return;
    }
    const pagarmeSubId = charge.subscription_id ?? charge.subscription?.id ?? charge.invoice?.subscription_id;
    if (!pagarmeSubId) {
      await processOrderPaymentEvent(type, charge);
      return;
    }

    let newStatus: string | null = null;
    if (type === "charge.paid" || type === "invoice.paid") newStatus = "active";
    else if (type === "charge.payment_failed" || type === "invoice.payment_failed") newStatus = "past_due";
    else if (type === "charge.refunded") newStatus = "canceled";

    const update: Record<string, unknown> = {
      last_payment_at: new Date().toISOString(),
      last_payment_status: charge.status ?? type,
      updated_at: new Date().toISOString(),
    };
    if (newStatus) update.status = newStatus;
    if (newStatus === "active") {
      update.is_trial = false;
      update.trial_start = null;
      update.trial_ends_at = null;
      await applyPaidPeriodToUpdate(
        pagarmeSubId,
        update,
        charge.current_period_start ?? charge.subscription?.current_period_start,
        charge.current_period_end ?? charge.subscription?.current_period_end,
        charge.next_billing_at ?? charge.subscription?.next_billing_at,
        charge.subscription?.interval,
      );
    }

    await supabase
      .from("subscriptions")
      .update(update)
      .eq("pagarme_subscription_id", pagarmeSubId);

    if (newStatus === "active") {
      await supersedeSubscriptionByPagarmeId(pagarmeSubId);
      await sendSubscriptionReceipt(pagarmeSubId, charge).catch((error) =>
        console.error("[pagarme-webhook] receipt email failed:", error),
      );

      const { data: localSub } = await supabase
        .from("subscriptions")
        .select("id")
        .eq("pagarme_subscription_id", pagarmeSubId)
        .maybeSingle();

      const reference = buildPagarmeReference(type, charge, pagarmeSubId);
      if (localSub?.id && reference) {
        await tryAccrueReferralCommission(supabase, {
          localSubscriptionId: localSub.id,
          pagarmeReference: reference,
          grossAmountCents: extractPagarmePaidAmountCents(charge),
        });
      }
    } else if (type === "charge.refunded") {
      const reference = buildPagarmeReference(type, charge, pagarmeSubId);
      await tryReverseReferralCommission(supabase, reference);
    }
  }

  if (type.startsWith("order.")) {
    await processOrderPaymentEvent(type, data);
  }
}


async function processOrderPaymentEvent(type: string, data: PagarmeData) {
  if (await processPlatformSubscriptionOrderPayment(type, data)) {
    return;
  }

  await reconcileOrderPaymentFromPagarme(supabase, type, data as PagarmeOrderPaymentData);
}

function mapOrderPaymentStatus(type: string, status?: string): string | null {
  if (type === "order.paid" || type === "charge.paid") return "paid";
  if (type === "order.payment_failed" || type === "charge.payment_failed") return "failed";
  if (type === "order.canceled" || type === "charge.canceled") return "canceled";
  if (type === "charge.refunded") return "refunded";

  switch (status) {
    case "paid":
      return "paid";
    case "failed":
      return "failed";
    case "canceled":
      return "canceled";
    case "refunded":
      return "refunded";
    case "pending":
      return "pending";
    default:
      return null;
  }
}

async function sendSubscriptionReceipt(pagarmeSubId: string, charge: PagarmeData) {
  const { data: subData } = await supabase
    .from("subscriptions")
    .select("id, restaurant_id, plan_id, restaurants:restaurant_id(owner_id)")
    .eq("pagarme_subscription_id", pagarmeSubId)
    .maybeSingle();

  const sub = subData as SubscriptionWithRestaurant | null;
  if (!sub?.restaurant_id) return;

  const { data: plan } = await supabase
    .from("plans")
    .select("name")
    .eq("id", sub.plan_id)
    .maybeSingle();

  const ownerId = sub.restaurants?.owner_id;
  if (!ownerId) return;

  const { data: owner } = await supabase
    .from("users")
    .select("email, name")
    .eq("id", ownerId)
    .maybeSingle();

  if (!owner?.email) return;

  const amount = Number(charge.amount || charge.paid_amount || 0) / 100;
  await sendManagedEmail({
    admin: supabase,
    restaurantId: sub.restaurant_id,
    templateKey: "subscription_receipt",
    emailType: "transactional",
    to: owner.email,
    recipientName: owner.name,
    contextType: "subscription",
    contextId: sub.id,
    variables: {
      plan_name: plan?.name || "Plano Pubfy",
      amount: amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
      status: charge.status || "paid",
      paid_at: new Date().toLocaleString("pt-BR"),
    },
    metadata: { source: "pagarme_webhook", pagarme_subscription_id: pagarmeSubId },
  });
}


type WebhookLogFields = {
  event_id: string | null;
  event_type: string;
  pagarme_subscription_id: string | null;
  pagarme_order_id: string | null;
  order_id: string | null;
  pagarme_customer_id: string | null;
  payload: PagarmeEvent;
};

type WebhookLogAcquire = {
  shouldProcess: boolean;
  logId: string | null;
  duplicate?: boolean;
};

function isUniqueViolation(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  if (error.code === "23505") return true;
  return (error.message ?? "").toLowerCase().includes("duplicate");
}

async function acquireWebhookEventLog(fields: WebhookLogFields): Promise<WebhookLogAcquire> {
  const { event_id: eventId } = fields;

  if (!eventId) {
    return { shouldProcess: true, logId: null };
  }

  const { data: existing } = await supabase
    .from("pagarme_webhook_events")
    .select("id, processed, processing_error")
    .eq("event_id", eventId)
    .maybeSingle();

  if (existing?.processed) {
    return { shouldProcess: false, logId: existing.id, duplicate: true };
  }

  if (existing?.id) {
    if (!existing.processing_error) {
      return { shouldProcess: false, logId: existing.id, duplicate: true };
    }
    await supabase
      .from("pagarme_webhook_events")
      .update({ processing_error: null })
      .eq("id", existing.id);
    return { shouldProcess: true, logId: existing.id };
  }

  const { data: inserted, error } = await supabase
    .from("pagarme_webhook_events")
    .insert({
      ...fields,
      signature_valid: true,
    })
    .select("id")
    .maybeSingle();

  if (!error && inserted?.id) {
    return { shouldProcess: true, logId: inserted.id };
  }

  if (!isUniqueViolation(error)) {
    throw error ?? new Error("Failed to log Pagar.me webhook event");
  }

  const { data: raced } = await supabase
    .from("pagarme_webhook_events")
    .select("id, processed, processing_error")
    .eq("event_id", eventId)
    .maybeSingle();

  if (raced?.processed) {
    return { shouldProcess: false, logId: raced.id, duplicate: true };
  }

  return { shouldProcess: false, logId: raced?.id ?? null, duplicate: true };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const rawBody = await req.text();
  const signatureHeader =
    req.headers.get("x-hub-signature") ??
    req.headers.get("x-pagarme-signature") ??
    req.headers.get("X-Hub-Signature");

  const signatureValid = await verifySignature(rawBody, signatureHeader);

  // B3 — Validamos a assinatura ANTES de persistir o payload. Em
  // assinatura inválida apenas registramos um snapshot mínimo (sem
  // payload bruto) para auditoria e respondemos 401. Isso evita gravar
  // dados de chamadas não confiáveis na tabela `pagarme_webhook_events`.
  if (!signatureValid) {
    try {
      await supabase.from("pagarme_webhook_events").insert({
        event_id: null,
        event_type: "rejected.invalid_signature",
        payload: { reason: "invalid_signature", received_at: new Date().toISOString() },
        signature_valid: false,
        processing_error: "Invalid signature - payload not persisted",
      });
    } catch (logError) {
      console.error("[pagarme-webhook] failed to log invalid signature attempt:", logError);
    }
    await captureEdgeException(new Error("Invalid Pagar.me webhook signature"), {
      functionName: "pagarme-webhook",
      req,
      level: "warning",
      tags: { stage: "verify_signature" },
    });
    return new Response(JSON.stringify({ error: "Invalid signature" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let event: PagarmeEvent;
  try {
    event = JSON.parse(rawBody) as PagarmeEvent;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const eventId = event.id ?? null;
  const eventType = event.type ?? "unknown";
  const data = event.data ?? {};
  const pagarmeSubId = extractPagarmeSubscriptionId(eventType, data);
  const pagarmeOrderId = extractPagarmeOrderId(eventType, data);
  const metadataOrderId = data.metadata?.order_id ?? data.order?.metadata?.order_id ?? null;
  const pagarmeCustomerId = data.customer?.id ?? data.customer_id ?? null;

  let acquire: WebhookLogAcquire;
  try {
    acquire = await acquireWebhookEventLog({
      event_id: eventId,
      event_type: eventType,
      pagarme_subscription_id: pagarmeSubId,
      pagarme_order_id: pagarmeOrderId,
      order_id: metadataOrderId,
      pagarme_customer_id: pagarmeCustomerId,
      payload: event,
    });
  } catch (acquireErr) {
    console.error("[pagarme-webhook] failed to acquire event log:", acquireErr);
    return new Response(JSON.stringify({ error: "Failed to log event" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!acquire.shouldProcess) {
    return new Response(
      JSON.stringify({ received: true, duplicate: !!acquire.duplicate }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const logId = acquire.logId;

  try {
    await processEvent(event);
    if (logId) {
      await supabase
        .from("pagarme_webhook_events")
        .update({ processed: true, processed_at: new Date().toISOString() })
        .eq("id", logId);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[pagarme-webhook] processing error:", msg);
    await captureEdgeException(err, {
      functionName: "pagarme-webhook",
      req,
      tags: { stage: "process_event", event_type: eventType },
      extra: {
        event_id: eventId,
        pagarme_subscription_id: pagarmeSubId,
        pagarme_order_id: pagarmeOrderId,
        order_id: metadataOrderId,
      },
    });
    if (logId) {
      await supabase
        .from("pagarme_webhook_events")
        .update({ processing_error: msg })
        .eq("id", logId);
    }
    // Return 200 anyway so Pagar.me does not retry indefinitely on processing bugs
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
