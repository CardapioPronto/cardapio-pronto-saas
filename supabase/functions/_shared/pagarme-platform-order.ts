export type PagarmeOrderCharge = { status?: string | null };

export type PagarmeOrderSnapshot = {
  id?: string;
  charges?: PagarmeOrderCharge[] | null;
};

export function primaryOrderChargeStatus(order: PagarmeOrderSnapshot): string {
  return (order.charges?.[0]?.status ?? "").trim().toLowerCase();
}

export function isPlatformOrderExternalId(id: string | null | undefined): boolean {
  return typeof id === "string" && id.startsWith("ord_");
}

export function isPagarmeSubscriptionExternalId(id: string | null | undefined): boolean {
  return typeof id === "string" && id.startsWith("sub_");
}

export function localStatusFromOrderCharge(
  chargeStatus: string,
): "pending" | "active" | "canceled" | null {
  if (chargeStatus === "paid") return "active";
  if (chargeStatus === "failed" || chargeStatus === "canceled") return "canceled";
  if (chargeStatus === "pending" || chargeStatus === "processing") return "pending";
  return null;
}

export function pixChargeRejectedMessage(chargedAmountCents?: number): string {
  const amountHint = typeof chargedAmountCents === "number"
    ? ` (amount enviado: ${chargedAmountCents} centavos)`
    : "";
  return `Pagamento PIX não foi aprovado${amountHint}. Em homologação (sk_test), o simulador costuma falhar quando amount > 500 centavos (R$ 5,00). O Pubfy reduz automaticamente o valor de teste; se o erro persistir, use cartão/boleto ou tente novamente.`;
}
