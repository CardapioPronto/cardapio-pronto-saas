import type { BillingCycle } from "./pagarme-checkout-subscription.ts";
import { isPlatformOrderExternalId } from "./pagarme-platform-order.ts";

export const PLATFORM_SUBSCRIPTION_SOURCE = "pubfy_platform_subscription";

export type PagarmePlanIds = {
  pagarme_plan_id_monthly: string | null;
  pagarme_plan_id_yearly: string | null;
};

export type PagarmeOrderCardCharge = {
  id?: string;
  status?: string | null;
  payment_method?: string | null;
  customer?: { id?: string | null } | null;
  last_transaction?: {
    card?: { id?: string | null } | null;
    credit_card?: { card?: { id?: string | null } | null } | null;
  } | null;
};

export type PagarmeOrderForRecurring = {
  id?: string;
  customer?: { id?: string | null } | null;
  charges?: PagarmeOrderCardCharge[] | null;
};

export type PagarmeSubscriptionCharge = {
  id?: string;
  status?: string | null;
  last_transaction?: {
    status?: string | null;
    success?: boolean | null;
    acquirer_message?: string | null;
    acquirer_return_code?: string | null;
    response_code?: string | null;
    gateway_response?: unknown;
    antifraud_response?: unknown;
  } | null;
};

export type PagarmeSubscriptionCreated = {
  id?: string;
  status?: string | null;
  customer?: { id?: string | null } | null;
  start_at?: string | null;
  next_billing_at?: string | null;
  current_period_start?: string | null;
  current_period_end?: string | null;
  current_cycle?: { charges?: PagarmeSubscriptionCharge[] } | null;
  invoices?: Array<{ charges?: PagarmeSubscriptionCharge[] }> | null;
};

export function pagarmePlanIdForCycle(
  plan: PagarmePlanIds,
  billingCycle: BillingCycle,
): string | null {
  return billingCycle === "yearly"
    ? plan.pagarme_plan_id_yearly
    : plan.pagarme_plan_id_monthly;
}

function primaryCreditCardCharge(order: PagarmeOrderForRecurring): PagarmeOrderCardCharge | null {
  return order.charges?.find((c) => c.payment_method === "credit_card") ??
    order.charges?.[0] ??
    null;
}

/** Customer/card saved by a successful card order (may require GET /orders/:id). */
export function extractCustomerAndCardFromOrder(order: PagarmeOrderForRecurring): {
  customerId: string | null;
  cardId: string | null;
} {
  const charge = primaryCreditCardCharge(order);
  const customerId = order.customer?.id ?? charge?.customer?.id ?? null;
  const cardId = charge?.last_transaction?.card?.id ??
    charge?.last_transaction?.credit_card?.card?.id ??
    null;
  return { customerId, cardId };
}

export function buildCreditCardSubscriptionPayload(input: {
  pagarmePlanId: string;
  customerId: string;
  cardId: string;
  /** Evita segunda cobrança imediata após o pedido inicial. */
  startAt: string;
  restaurantId: string;
  planId: string;
  billingCycle: BillingCycle;
  initialOrderId: string;
}) {
  return {
    plan_id: input.pagarmePlanId,
    customer_id: input.customerId,
    card_id: input.cardId,
    payment_method: "credit_card",
    start_at: input.startAt,
    metadata: {
      source: PLATFORM_SUBSCRIPTION_SOURCE,
      integration_model: "recurring_after_initial_card_order",
      restaurant_id: input.restaurantId,
      plan_id: input.planId,
      billing_cycle: input.billingCycle,
      initial_order_id: input.initialOrderId,
    },
  };
}

export type PagarmeFetch = <T>(path: string, method: string, body?: unknown) => Promise<T>;

type CustomerCardsList = {
  data?: Array<{ id?: string | null }> | null;
};

/** Resolve card on customer when the order payload omits card.id. */
export async function resolveCardIdForCustomer(
  pagarme: PagarmeFetch,
  customerId: string,
): Promise<string | null> {
  const list = await pagarme<CustomerCardsList>(
    `/customers/${encodeURIComponent(customerId)}/cards`,
    "GET",
  );
  return list.data?.[0]?.id ?? null;
}

export async function loadOrderForRecurring(
  pagarme: PagarmeFetch,
  order: PagarmeOrderForRecurring,
): Promise<PagarmeOrderForRecurring> {
  if (!order.id) return order;
  const { customerId, cardId } = extractCustomerAndCardFromOrder(order);
  if (customerId && cardId) return order;
  return pagarme<PagarmeOrderForRecurring>(
    `/orders/${encodeURIComponent(order.id)}`,
    "GET",
  );
}

/**
 * Creates exactly one Pagar.me recurring subscription after a paid initial order.
 * `startAt` must be the next local billing date so the order charge is not duplicated.
 */
export async function createRecurringSubscriptionAfterCardOrder(
  pagarme: PagarmeFetch,
  input: {
    order: PagarmeOrderForRecurring;
    pagarmePlanId: string;
    billingCycle: BillingCycle;
    restaurantId: string;
    planId: string;
    startAt: string;
  },
): Promise<{ subscription: PagarmeSubscriptionCreated; customerId: string }> {
  if (!input.order.id) {
    throw new Error("Pagar.me order response missing id");
  }

  const refreshed = await loadOrderForRecurring(pagarme, input.order);
  const { customerId, cardId: initialCardId } = extractCustomerAndCardFromOrder(refreshed);
  let cardId = initialCardId;

  if (!customerId) {
    throw new Error(
      "Pagamento aprovado, mas o Pagar.me não retornou customer_id para criar a assinatura recorrente.",
    );
  }

  if (!cardId) {
    cardId = await resolveCardIdForCustomer(pagarme, customerId);
  }
  if (!cardId) {
    throw new Error(
      "Pagamento aprovado, mas o cartão não foi salvo no cliente Pagar.me para renovação automática.",
    );
  }

  const created = await pagarme<PagarmeSubscriptionCreated>(
    "/subscriptions",
    "POST",
    buildCreditCardSubscriptionPayload({
      pagarmePlanId: input.pagarmePlanId,
      customerId,
      cardId,
      startAt: input.startAt,
      restaurantId: input.restaurantId,
      planId: input.planId,
      billingCycle: input.billingCycle,
      initialOrderId: input.order.id,
    }),
  );

  if (!created.id) {
    throw new Error("Pagar.me subscription response missing id");
  }

  const subscription = await pagarme<PagarmeSubscriptionCreated>(
    `/subscriptions/${encodeURIComponent(created.id)}`,
    "GET",
  );

  return {
    subscription,
    customerId: subscription.customer?.id ?? customerId,
  };
}

/** True when local row still points at the initial checkout order, not sub_. */
export function needsRecurringSubscriptionFromOrderId(
  pagarmeSubscriptionId: string | null | undefined,
): boolean {
  return isPlatformOrderExternalId(pagarmeSubscriptionId);
}
