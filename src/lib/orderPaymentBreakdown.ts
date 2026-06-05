export type SplitRule = {
  type?: string;
  amount?: number;
  recipient_id?: string;
};

export type CommissionSettings = {
  recipient_id: string | null;
  commission_type: "none" | "percentage" | "flat";
  commission_value: number;
};

export type PaymentBreakdown = {
  gross: number;
  platform_commission: number;
  pagarme_fee: number | null;
  net_repasse: number | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toReaisFromCents(value: unknown): number | null {
  const cents = Number(value);
  if (!Number.isFinite(cents)) return null;
  return cents / 100;
}

export function extractSplitRules(raw: unknown): SplitRule[] {
  if (!isRecord(raw)) return [];

  const fromPayments = Array.isArray(raw.payments) ? raw.payments[0] : null;
  if (isRecord(fromPayments) && Array.isArray(fromPayments.split)) {
    return fromPayments.split.filter(isRecord).map(rule => ({
      type: rule.type ? String(rule.type) : undefined,
      amount: Number(rule.amount),
      recipient_id: rule.recipient_id ? String(rule.recipient_id) : undefined,
    }));
  }

  const charges = Array.isArray(raw.charges) ? raw.charges : [];
  const charge = isRecord(charges[0]) ? charges[0] : null;
  if (charge && Array.isArray(charge.split)) {
    return charge.split.filter(isRecord).map(rule => ({
      type: rule.type ? String(rule.type) : undefined,
      amount: Number(rule.amount),
      recipient_id: rule.recipient_id ? String(rule.recipient_id) : undefined,
    }));
  }

  return [];
}

export function extractPagarmeFee(raw: unknown): number | null {
  if (!isRecord(raw)) return null;

  const charges = Array.isArray(raw.charges) ? raw.charges : [];
  const charge = isRecord(charges[0]) ? charges[0] : null;
  if (!charge) return null;

  const tx = isRecord(charge.last_transaction)
    ? charge.last_transaction
    : isRecord(charge.lastTransaction)
      ? charge.lastTransaction
      : null;

  const feeCandidate = tx?.fee ?? tx?.gateway_fee ?? charge.fee;
  if (feeCandidate == null) return null;

  return toReaisFromCents(feeCandidate);
}

function commissionFromSplit(
  gross: number,
  grossCents: number,
  split: SplitRule[],
  restaurantRecipientId: string | null,
): number | null {
  if (!split.length) return null;

  const restaurantId = restaurantRecipientId?.trim() || null;
  const platformRules = restaurantId
    ? split.filter(rule => rule.recipient_id && rule.recipient_id !== restaurantId)
    : split.length > 1
      ? split.slice(1)
      : [];

  if (!platformRules.length) return 0;

  return platformRules.reduce((sum, rule) => {
    const amount = Number(rule.amount || 0);
    if (rule.type === "percentage") return sum + gross * (amount / 100);
    if (rule.type === "flat") return sum + amount / 100;
    return sum;
  }, 0);
}

function commissionFromSettings(
  gross: number,
  grossCents: number,
  settings: CommissionSettings,
): number {
  const type = settings.commission_type;
  const value = Number(settings.commission_value || 0);
  if (type === "percentage" && value > 0) return gross * (Math.min(100, value) / 100);
  if (type === "flat" && value > 0) return Math.min(gross, value);
  return 0;
}

export function buildPaymentBreakdown(
  gross: number,
  raw: unknown,
  settings: CommissionSettings,
): PaymentBreakdown {
  const grossCents = Math.round(gross * 100);
  const split = extractSplitRules(raw);
  const fromSplit = commissionFromSplit(gross, grossCents, split, settings.recipient_id);
  const platform_commission = fromSplit ?? commissionFromSettings(gross, grossCents, settings);
  const pagarme_fee = extractPagarmeFee(raw);
  const restaurant_share = Math.max(0, gross - platform_commission);

  let net_repasse: number | null = null;
  if (pagarme_fee != null) {
    net_repasse = Math.max(0, restaurant_share - pagarme_fee);
  }

  return {
    gross,
    platform_commission,
    pagarme_fee,
    net_repasse,
  };
}
