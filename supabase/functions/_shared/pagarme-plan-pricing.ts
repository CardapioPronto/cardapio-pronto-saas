import type { BillingCycle } from "./pagarme-checkout-subscription.ts";

function envGet(key: string): string | undefined {
  if (typeof Deno !== "undefined" && Deno.env?.get) {
    return Deno.env.get(key);
  }
  if (typeof process !== "undefined" && process.env) {
    return process.env[key];
  }
  return undefined;
}

/**
 * Limite prático do simulador PIX em `sk_test_…`.
 * A documentação fala em R$ 500,00, mas o sandbox costuma comparar o campo `amount`
 * (já em centavos) com 500 — ou seja, falha se amount > 500 (~R$ 5,00).
 */
export const PAGARME_HOMOLOG_PIX_SIMULATOR_MAX_CENTS = 500;

export type PlanPriceRow = {
  price_monthly: number | null;
  price_yearly: number | null;
};

export type PlanAmountBreakdown = {
  billing_cycle: BillingCycle;
  /** Valor de catálogo (o que o plano cobra de fato). */
  catalog_amount_reais: number;
  catalog_amount_cents: number;
  /** Valor enviado ao Pagar.me nesta cobrança (pode ser menor em homologação). */
  amount_reais: number;
  amount_cents: number;
  /** true quando o valor de teste foi reduzido (cap 500 centavos ou secret). */
  homolog_test_override: boolean;
};

/**
 * Preços no banco (`plans.price_monthly` / `price_yearly`) estão em REAIS (ex.: 59.90).
 * A API Pagar.me exige `amount` em CENTAVOS inteiros (ex.: 5990 = R$ 59,90).
 */
export function planAmountCents(
  plan: PlanPriceRow,
  billingCycle: BillingCycle,
): number {
  const breakdown = planAmountBreakdown(plan, billingCycle);
  return breakdown.amount_cents;
}

export type PlanAmountOptions = {
  /** Checkout PIX em homologação: limita amount enviado ao simulador (≤ 500 centavos). */
  applyHomologPixCap?: boolean;
};

/** Mínimo observado na API de planos/assinaturas Pagar.me (R$ 5,00). */
export const PAGARME_SUBSCRIPTION_PLAN_MIN_CENTS = 500;

export function planAmountBreakdown(
  plan: PlanPriceRow,
  billingCycle: BillingCycle,
  options: PlanAmountOptions = {},
): PlanAmountBreakdown {
  const rawMonthly = Number(plan.price_monthly);
  const rawYearly = Number(plan.price_yearly);

  if (billingCycle === "monthly") {
    if (!Number.isFinite(rawMonthly) || rawMonthly <= 0) {
      throw new Error("Preço mensal do plano inválido ou ausente no banco.");
    }
    if (rawMonthly > 500) {
      throw new Error(
        `price_monthly (${rawMonthly}) parece estar em centavos, não em reais. No Admin use 59.90 (reais), não 5990.`,
      );
    }
  } else {
    if (!Number.isFinite(rawYearly) || rawYearly <= 0) {
      throw new Error("Preço anual (mensal equivalente) do plano inválido ou ausente no banco.");
    }
    if (rawYearly > 500) {
      throw new Error(
        `price_yearly (${rawYearly}) parece estar em centavos, não em reais. No Admin use valores em reais (ex.: 49.00).`,
      );
    }
  }

  const amountReais = billingCycle === "monthly"
    ? rawMonthly
    : rawYearly * 12;
  const amountCents = reaisToCents(amountReais);

  if (!Number.isFinite(amountCents) || amountCents < 100) {
    const label = billingCycle === "monthly" ? "mensal" : "anual (12× mensal do plano anual)";
    throw new Error(
      `Preço ${label} inválido para cobrança (R$ ${amountReais}). Mínimo R$ 1,00.`,
    );
  }

  const catalogCents = amountCents;
  const { cents: resolved, homologTestOverride } = options.applyHomologPixCap
    ? resolveHomologPixAmountCents(catalogCents)
    : { cents: catalogCents, homologTestOverride: false };

  return {
    billing_cycle: billingCycle,
    catalog_amount_reais: Math.round(amountReais * 100) / 100,
    catalog_amount_cents: catalogCents,
    amount_reais: Math.round(resolved) / 100,
    amount_cents: resolved,
    homolog_test_override: homologTestOverride,
  };
}

function validatePagarmePlanMinimum(breakdown: PlanAmountBreakdown, billingCycle: BillingCycle) {
  if (breakdown.catalog_amount_cents < PAGARME_SUBSCRIPTION_PLAN_MIN_CENTS) {
    const cycleLabel = billingCycle === "monthly" ? "mensal" : "anual";
    throw new Error(
      `Preço ${cycleLabel} abaixo do mínimo do Pagar.me (R$ ${(PAGARME_SUBSCRIPTION_PLAN_MIN_CENTS / 100).toFixed(2)}). Valor atual: R$ ${breakdown.catalog_amount_reais.toFixed(2)}. Ajuste o plano no Admin — para homologação PIX use R$ 5,00/mês.`,
    );
  }
}

/** Valores para criar/atualizar planos no Pagar.me (exige mínimo de R$ 5,00). */
export function planAmountBreakdownForPagarmePlan(
  plan: PlanPriceRow,
  billingCycle: BillingCycle,
): PlanAmountBreakdown {
  const breakdown = planAmountBreakdown(plan, billingCycle);
  validatePagarmePlanMinimum(breakdown, billingCycle);
  return breakdown;
}

/**
 * Primeira cobrança com cartão: usa o valor de catálogo completo em homologação.
 * O teto de 500 centavos é só para PIX (`applyHomologPixCap`), não para simulador de cartão.
 * Opcional: `PAGARME_CARD_TEST_AMOUNT_CENTS` força um valor fixo em sk_test (debug).
 */
export function planAmountBreakdownForCardCheckout(
  plan: PlanPriceRow,
  billingCycle: BillingCycle,
): PlanAmountBreakdown {
  const catalog = planAmountBreakdown(plan, billingCycle);
  validatePagarmePlanMinimum(catalog, billingCycle);

  const secret = envGet("PAGARME_SECRET_KEY") ?? "";
  const overrideRaw = envGet("PAGARME_CARD_TEST_AMOUNT_CENTS");
  if (!secret.includes("test") || !overrideRaw?.trim()) {
    return catalog;
  }

  const override = Math.round(Number(overrideRaw));
  if (
    !Number.isFinite(override) ||
    override < PAGARME_SUBSCRIPTION_PLAN_MIN_CENTS
  ) {
    return catalog;
  }

  return {
    ...catalog,
    amount_cents: override,
    amount_reais: Math.round(override) / 100,
    homolog_test_override: override !== catalog.catalog_amount_cents,
  };
}

/** Converte reais → centavos sem perder os centavos do decimal (59.90 → 5990). */
export function reaisToCents(amountReais: number): number {
  const normalized = Math.round(amountReais * 100) / 100;
  return Math.round(normalized * 100);
}

/**
 * Em homologação (`sk_test_…`), envia no máximo 500 centavos (R$ 5) para o simulador PIX aprovar.
 * Secret opcional: PAGARME_PIX_TEST_AMOUNT_CENTS=100 → força R$ 1,00 (mín. 100 centavos).
 */
function resolveHomologPixAmountCents(catalogCents: number): {
  cents: number;
  homologTestOverride: boolean;
} {
  const secret = envGet("PAGARME_SECRET_KEY") ?? "";
  if (!secret.includes("test")) {
    return { cents: catalogCents, homologTestOverride: false };
  }

  const overrideRaw = envGet("PAGARME_PIX_TEST_AMOUNT_CENTS");
  if (overrideRaw?.trim()) {
    const override = Math.round(Number(overrideRaw));
    if (
      Number.isFinite(override)
      && override >= 100
      && override <= PAGARME_HOMOLOG_PIX_SIMULATOR_MAX_CENTS
    ) {
      return { cents: override, homologTestOverride: true };
    }
  }

  if (catalogCents > PAGARME_HOMOLOG_PIX_SIMULATOR_MAX_CENTS) {
    return {
      cents: PAGARME_HOMOLOG_PIX_SIMULATOR_MAX_CENTS,
      homologTestOverride: true,
    };
  }

  return { cents: catalogCents, homologTestOverride: false };
}
