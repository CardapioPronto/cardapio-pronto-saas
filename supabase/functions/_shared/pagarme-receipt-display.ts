/**
 * Status exibido no comprovante. Assinatura `future` no Pagar.me pode ter
 * charge `failed` na API — cobrança só ocorre em start_at (cartão já validado).
 */
export function resolveReceiptChargeDisplayStatus(input: {
  chargeStatus?: string | null;
  subscriptionStatus?: string | null;
  transactionSuccess?: boolean | null;
  transactionStatus?: string | null;
  hasCardOnFile?: boolean;
}): string {
  const chargeStatus = (input.chargeStatus ?? "").toLowerCase();
  const subStatus = (input.subscriptionStatus ?? "").toLowerCase();
  const txStatus = (input.transactionStatus ?? "").toLowerCase();

  const subscriptionScheduled =
    subStatus === "future" || subStatus === "scheduled" || subStatus === "pending";

  const transactionApproved =
    input.transactionSuccess === true ||
    ["authorized", "captured", "paid", "capture_pending"].includes(txStatus);

  if (subscriptionScheduled) {
    if (
      transactionApproved ||
      chargeStatus === "authorized" ||
      chargeStatus === "paid" ||
      chargeStatus === "captured" ||
      input.hasCardOnFile
    ) {
      return "scheduled";
    }
    if (chargeStatus === "failed" || chargeStatus === "canceled") {
      return "scheduled";
    }
  }

  if (chargeStatus === "paid" || chargeStatus === "captured") return "paid";
  if (chargeStatus === "authorized" || transactionApproved) return "authorized";
  return chargeStatus || "pending";
}

export type ReceiptBillingPhase =
  | "first_scheduled"
  | "renewal_scheduled"
  | "paid"
  | "failed"
  | "pending"
  | "other";

export function isPaidChargeStatus(status: string | null | undefined): boolean {
  const normalized = (status ?? "").toLowerCase();
  return normalized === "paid" || normalized === "captured";
}

export function resolveReceiptBillingPhase(input: {
  displayStatus: string;
  paidChargesCount: number;
}): ReceiptBillingPhase {
  const status = input.displayStatus.toLowerCase();

  if (status === "scheduled") {
    return input.paidChargesCount > 0 ? "renewal_scheduled" : "first_scheduled";
  }
  if (status === "paid" || status === "authorized") return "paid";
  if (status === "failed") return "failed";
  if (status === "pending" || status === "processing") return "pending";
  return "other";
}

export function getReceiptStatusBadgeLabel(
  displayStatus: string,
  phase: ReceiptBillingPhase,
): string {
  if (phase === "renewal_scheduled") return "Próxima cobrança";
  if (phase === "first_scheduled" || displayStatus === "scheduled") {
    return "Cobrança agendada";
  }
  if (displayStatus === "paid") return "Pago";
  if (displayStatus === "failed") return "Não aprovado";
  if (displayStatus === "pending" || displayStatus === "processing") return "Pendente";
  if (displayStatus === "authorized") return "Cartão validado";
  return displayStatus || "—";
}

export function getReceiptCardCopy(
  phase: ReceiptBillingPhase,
  input: { amountFormatted: string; scheduleDate: string | null },
): { title: string; note: string | null } {
  switch (phase) {
    case "first_scheduled":
      return {
        title: "Primeira cobrança",
        note: input.scheduleDate
          ? `Cartão registrado. Primeira cobrança de ${input.amountFormatted} em ${input.scheduleDate}.`
          : `Cartão registrado. Primeira cobrança de ${input.amountFormatted} após o teste gratuito.`,
      };
    case "renewal_scheduled":
      return {
        title: "Próxima cobrança",
        note: input.scheduleDate
          ? `Cobrança de ${input.amountFormatted} prevista para ${input.scheduleDate}.`
          : `Próxima cobrança de ${input.amountFormatted} conforme seu ciclo.`,
      };
    case "failed":
      return {
        title: "Última cobrança",
        note:
          "Pagamento não aprovado. Atualize o cartão em Gerenciar assinatura para a próxima tentativa.",
      };
    case "pending":
      return { title: "Cobrança em andamento", note: null };
    case "paid":
      return { title: "Última cobrança", note: null };
    default:
      return { title: "Última cobrança", note: null };
  }
}

/** Data exibida: próxima fatura usa next_billing_at; primeira usa start_at. */
export function resolveReceiptScheduleDate(input: {
  phase: ReceiptBillingPhase;
  subscriptionStartAt?: string | null;
  nextBillingAt?: string | null;
  chargeDueAt?: string | null;
}): string | null {
  const raw =
    input.phase === "renewal_scheduled"
      ? input.nextBillingAt ?? input.chargeDueAt ?? input.subscriptionStartAt
      : input.subscriptionStartAt ?? input.nextBillingAt ?? input.chargeDueAt;
  if (!raw) return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
