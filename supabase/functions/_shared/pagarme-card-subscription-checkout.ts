import type { BillingCycle } from "./pagarme-checkout-subscription.ts";
import {
  PLATFORM_SUBSCRIPTION_SOURCE,
  type PagarmeFetch,
  type PagarmeSubscriptionCreated,
} from "./pagarme-recurring-subscription.ts";

export type PagarmeAddress = {
  country: string;
  state: string;
  city: string;
  zip_code: string;
  line_1: string;
  line_2?: string;
};

export type ParsedCard = {
  number: string;
  holder_name: string;
  exp_month: number;
  exp_year: number;
  cvv: string;
};

/** Pagar.me aceita yy ou yyyy; em homologação o exemplo oficial usa yy (ex.: 30). */
export function pagarmeCardExpYear(expYear: number): number {
  return expYear >= 2000 ? expYear % 100 : expYear;
}

/** Nome no cartão: só letras e espaços (regra da API). */
export function sanitizeCardHolderName(name: string): string {
  const cleaned = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 64);
  return cleaned.length >= 3 ? cleaned : "Titular Cartao";
}

export function buildCustomerPayload(input: {
  name: string;
  email: string;
  docDigits: string;
  docType: "cpf" | "cnpj";
  phoneDigits: string;
  address: PagarmeAddress;
}) {
  const areaCode = input.phoneDigits.slice(0, 2);
  const phoneNumber = input.phoneDigits.slice(2);
  return {
    name: input.name,
    email: input.email,
    document: input.docDigits,
    document_type: input.docType,
    type: input.docType === "cnpj" ? "company" : "individual",
    address: input.address,
    phones: {
      mobile_phone: {
        country_code: "55",
        area_code: areaCode,
        number: phoneNumber,
      },
    },
  };
}

export function buildCardPayload(card: ParsedCard, address: PagarmeAddress) {
  return {
    number: card.number,
    holder_name: sanitizeCardHolderName(card.holder_name),
    exp_month: card.exp_month,
    exp_year: pagarmeCardExpYear(card.exp_year),
    cvv: card.cvv,
    billing_address: address,
  };
}

export function buildCardSubscriptionPayload(input: {
  pagarmePlanId: string;
  customerId: string;
  cardId: string;
  restaurantId: string;
  planId: string;
  billingCycle: BillingCycle;
  /** Agenda cobrança após trial local (evita status Futura com data desalinhada). */
  startAt?: string;
}) {
  return {
    plan_id: input.pagarmePlanId,
    customer_id: input.customerId,
    card_id: input.cardId,
    payment_method: "credit_card",
    ...(input.startAt ? { start_at: input.startAt } : {}),
    metadata: {
      source: PLATFORM_SUBSCRIPTION_SOURCE,
      integration_model: "card_subscription_checkout",
      restaurant_id: input.restaurantId,
      plan_id: input.planId,
      billing_cycle: input.billingCycle,
    },
  };
}

export type CardSubscriptionCheckoutResult = {
  customerId: string;
  cardId: string;
  subscription: PagarmeSubscriptionCreated;
};

export async function createCardPlatformSubscription(
  pagarme: PagarmeFetch,
  input: {
    pagarmePlanId: string;
    billingCycle: BillingCycle;
    restaurantId: string;
    planId: string;
    startAt?: string;
    customer: ReturnType<typeof buildCustomerPayload>;
    card: ReturnType<typeof buildCardPayload>;
  },
): Promise<CardSubscriptionCheckoutResult> {
  const customer = await pagarme<{ id?: string }>("/customers", "POST", input.customer);
  if (!customer.id) throw new Error("Pagar.me customer response missing id");

  const card = await pagarme<{ id?: string }>(
    `/customers/${encodeURIComponent(customer.id)}/cards`,
    "POST",
    input.card,
  );
  if (!card.id) throw new Error("Pagar.me card response missing id");

  const created = await pagarme<PagarmeSubscriptionCreated>(
    "/subscriptions",
    "POST",
    buildCardSubscriptionPayload({
      pagarmePlanId: input.pagarmePlanId,
      customerId: customer.id,
      cardId: card.id,
      restaurantId: input.restaurantId,
      planId: input.planId,
      billingCycle: input.billingCycle,
      startAt: input.startAt,
    }),
  );
  if (!created.id) throw new Error("Pagar.me subscription response missing id");

  const subscription = await pagarme<PagarmeSubscriptionCreated>(
    `/subscriptions/${encodeURIComponent(created.id)}`,
    "GET",
  );

  return {
    customerId: subscription.customer?.id ?? customer.id,
    cardId: card.id,
    subscription,
  };
}

export function resolveCardCheckoutPaymentStatus(
  subscription: PagarmeSubscriptionCreated,
): "active" | "pending" | "canceled" {
  const charge = subscription.current_cycle?.charges?.[0] ??
    subscription.invoices?.[0]?.charges?.[0] ??
    null;
  const tx = charge?.last_transaction ?? null;
  const chargeStatus = (charge?.status ?? "").toLowerCase();
  const txStatus = (tx?.status ?? "").toLowerCase();

  if (tx?.success === true) {
    if (
      txStatus === "captured" ||
      txStatus === "paid" ||
      txStatus === "authorized" ||
      txStatus === "capture_pending"
    ) {
      return "active";
    }
    if (txStatus === "pending" || txStatus === "processing" || txStatus === "waiting_payment") {
      return "pending";
    }
  }

  if (chargeStatus === "paid" || chargeStatus === "captured" || chargeStatus === "authorized") {
    return "active";
  }
  if (chargeStatus === "pending" || chargeStatus === "processing") return "pending";

  const remoteStatus = (subscription.status ?? "").toLowerCase();
  if (remoteStatus === "active" || remoteStatus === "paid") return "active";
  if (
    remoteStatus === "pending" ||
    remoteStatus === "future" ||
    remoteStatus === "scheduled"
  ) {
    return "pending";
  }
  return "canceled";
}

export function subscriptionPaymentDiagnostics(
  subscription: PagarmeSubscriptionCreated,
): Record<string, unknown> | null {
  const charge = subscription.current_cycle?.charges?.[0] ??
    subscription.invoices?.[0]?.charges?.[0] ??
    null;
  const tx = charge?.last_transaction ?? null;
  if (!charge && !tx) {
    return { subscription_status: subscription.status ?? null };
  }
  return {
    subscription_status: subscription.status ?? null,
    charge_id: charge?.id ?? null,
    charge_status: charge?.status ?? null,
    transaction_status: tx?.status ?? null,
    transaction_success: tx?.success ?? null,
    acquirer_message: tx?.acquirer_message ?? null,
    acquirer_return_code: tx?.acquirer_return_code ?? null,
    response_code: tx?.response_code ?? null,
    gateway_response: tx?.gateway_response ?? null,
    antifraud_response: tx?.antifraud_response ?? null,
  };
}
