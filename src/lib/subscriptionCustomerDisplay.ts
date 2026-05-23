import type { MySubscription } from "@/hooks/useMySubscriptions";
import {
  getSubscriptionStatusMeta,
  type SubscriptionStatusMeta,
} from "@/lib/subscriptionStatusUi";
import { CheckCircle2, Clock } from "lucide-react";

export type SubscriptionDisplaySlice = Pick<
  MySubscription,
  | "id"
  | "status"
  | "is_trial"
  | "trial_start"
  | "trial_ends_at"
  | "current_period_start"
  | "current_period_end"
  | "next_billing_at"
  | "last_payment_status"
  | "has_pagarme_subscription"
  | "pagarme_subscription_id"
>;

const MS_PER_DAY = 86400000;

export function isPagarmeScheduledStatus(status: string | null | undefined): boolean {
  const normalized = (status ?? "").toLowerCase();
  return normalized === "future" || normalized === "scheduled";
}

/** Cartão aceito: assinatura no Pagar.me agendada para após o trial (status future/scheduled). */
export function isScheduledPaidAfterTrial(
  sub: SubscriptionDisplaySlice | null | undefined,
): boolean {
  if (!sub || sub.status !== "pending") return false;
  if (!sub.has_pagarme_subscription) return false;
  if (isPagarmeScheduledStatus(sub.last_payment_status)) return true;
  return Boolean(sub.pagarme_subscription_id) && !isAwaitingOfflinePayment(sub);
}

/** Boleto/PIX ainda aguardando confirmação do pagamento. */
export function isAwaitingOfflinePayment(
  sub: SubscriptionDisplaySlice | null | undefined,
): boolean {
  if (!sub || sub.status !== "pending") return false;
  if (isScheduledPaidAfterTrial(sub)) return false;
  return true;
}

export function findScheduledPaidPlan<T extends SubscriptionDisplaySlice>(
  subscriptions: T[],
): T | null {
  return subscriptions.find(isScheduledPaidAfterTrial) ?? null;
}

export function findTrialingSubscription<T extends SubscriptionDisplaySlice>(
  subscriptions: T[],
): T | null {
  return (
    subscriptions.find((s) => s.status === "trialing" || Boolean(s.is_trial)) ?? null
  );
}

function isTrialCoveredByScheduledPlan(
  trial: SubscriptionDisplaySlice,
  scheduled: SubscriptionDisplaySlice,
): boolean {
  const trialEnd = trial.trial_ends_at ?? trial.current_period_end;
  const planStart =
    scheduled.next_billing_at ?? scheduled.current_period_end ?? scheduled.current_period_start;
  if (!trialEnd || !planStart) return true;
  const diff = Math.abs(new Date(trialEnd).getTime() - new Date(planStart).getTime());
  return diff <= 2 * MS_PER_DAY;
}

/** Evita dois cards quase iguais (trial + plano agendado). */
export function getVisibleSubscriptionsForCustomer<T extends SubscriptionDisplaySlice>(
  subscriptions: T[],
): T[] {
  const scheduled = findScheduledPaidPlan(subscriptions);
  if (!scheduled) return subscriptions;

  return subscriptions.filter((sub) => {
    if (sub.id === scheduled.id) return true;
    if (sub.status === "trialing" || sub.is_trial) {
      return !isTrialCoveredByScheduledPlan(sub, scheduled);
    }
    return true;
  });
}

/** Visão geral: mostra o trial em curso, não o registro técnico pending. */
export function pickPrimarySubscriptionForDisplay<T extends SubscriptionDisplaySlice>(
  subscriptions: T[],
): T | null {
  const scheduled = findScheduledPaidPlan(subscriptions);
  const trialing = findTrialingSubscription(subscriptions);
  if (scheduled && trialing && isTrialCoveredByScheduledPlan(trialing, scheduled)) {
    return trialing;
  }

  const visible = getVisibleSubscriptionsForCustomer(subscriptions);
  if (!visible.length) return null;

  const priority: Record<string, number> = {
    active: 0,
    past_due: 1,
    trialing: 2,
    pending: 3,
  };
  return [...visible].sort(
    (a, b) => (priority[a.status] ?? 99) - (priority[b.status] ?? 99),
  )[0];
}

export function formatSubscriptionDate(value: string | null | undefined): string {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

export function formatPagarmePaymentStatusLabel(
  status: string | null | undefined,
): string | null {
  if (!status) return null;
  const labels: Record<string, string> = {
    future: "Início agendado após o teste",
    scheduled: "Início agendado após o teste",
    active: "Ativo no Pagar.me",
    paid: "Pago",
    pending: "Processando",
    processing: "Processando",
    authorized: "Autorizado",
    captured: "Capturado",
    waiting_payment: "Aguardando pagamento",
    failed: "Não aprovado",
    canceled: "Cancelado",
  };
  return labels[status.toLowerCase()] ?? null;
}

export type CustomerSubscriptionDisplay = {
  mode: "default" | "scheduled_after_trial" | "awaiting_offline";
  statusMeta: SubscriptionStatusMeta;
  periodPrimaryLabel: string;
  periodPrimaryValue: string;
  periodSecondaryLabel: string;
  periodSecondaryValue: string;
  footerNote: string | null;
  showRawPaymentStatus: boolean;
  paymentStatusLabel: string | null;
};

export function getCustomerSubscriptionDisplay(
  sub: SubscriptionDisplaySlice,
): CustomerSubscriptionDisplay {
  if (isScheduledPaidAfterTrial(sub)) {
    const trialEnd = sub.current_period_end ?? sub.next_billing_at ?? sub.trial_ends_at;
    const paidStarts = sub.next_billing_at ?? sub.current_period_end ?? trialEnd;
    const trialStart = sub.current_period_start ?? sub.trial_start;

    return {
      mode: "scheduled_after_trial",
      statusMeta: {
        label: "Plano confirmado",
        className: "bg-green/15 text-green border border-green/30",
        icon: CheckCircle2,
      },
      periodPrimaryLabel: "Teste gratuito",
      periodPrimaryValue: trialStart
        ? `${formatSubscriptionDate(trialStart)} → ${formatSubscriptionDate(trialEnd)}`
        : `até ${formatSubscriptionDate(trialEnd)}`,
      periodSecondaryLabel: "Primeira cobrança do plano",
      periodSecondaryValue: formatSubscriptionDate(paidStarts),
      footerNote:
        "Pagamento confirmado. Você continua no teste gratuito até essa data; a cobrança do plano pago começa automaticamente depois, sem nova ação sua.",
      showRawPaymentStatus: false,
      paymentStatusLabel: "Pagamento confirmado",
    };
  }

  if (isAwaitingOfflinePayment(sub)) {
    return {
      mode: "awaiting_offline",
      statusMeta: {
        label: "Aguardando pagamento",
        className: "bg-orange/15 text-orange border border-orange/30",
        icon: Clock,
      },
      periodPrimaryLabel: "Período atual",
      periodPrimaryValue: `${formatSubscriptionDate(sub.current_period_start)} → ${formatSubscriptionDate(sub.current_period_end)}`,
      periodSecondaryLabel: "Confirmação esperada até",
      periodSecondaryValue: formatSubscriptionDate(
        sub.next_billing_at ?? sub.current_period_end,
      ),
      footerNote:
        "Assim que o boleto ou PIX for confirmado, o plano pago será ativado. Enquanto isso, o acesso segue pelo período vigente.",
      showRawPaymentStatus: false,
      paymentStatusLabel: formatPagarmePaymentStatusLabel(sub.last_payment_status),
    };
  }

  const isTrial = sub.status === "trialing" || Boolean(sub.is_trial);
  const statusMeta = getSubscriptionStatusMeta(sub.status);
  return {
    mode: "default",
    statusMeta,
    periodPrimaryLabel: "Período atual",
    periodPrimaryValue: `${formatSubscriptionDate(sub.current_period_start)} → ${formatSubscriptionDate(sub.current_period_end)}`,
    periodSecondaryLabel: isTrial ? "Fim do teste" : "Próxima cobrança",
    periodSecondaryValue: formatSubscriptionDate(
      isTrial
        ? sub.trial_ends_at
        : sub.next_billing_at ?? sub.current_period_end,
    ),
    footerNote: null,
    showRawPaymentStatus: true,
    paymentStatusLabel: formatPagarmePaymentStatusLabel(sub.last_payment_status),
  };
}

/** Validade do boleto no checkout offline (espelha `boleto_due_days` no Pagar.me). */
export const OFFLINE_PAYMENT_BOLETO_VALID_DAYS = 3;

export type SubscriptionCancelCopy = {
  buttonLabel: string;
  dialogTitle: string;
  dialogDescription: string;
  confirmLabel: string;
  successTitle: string;
  successDescription: string;
};

function accessUntilDate(sub: SubscriptionDisplaySlice): string {
  return formatSubscriptionDate(
    sub.current_period_end ?? sub.next_billing_at ?? sub.trial_ends_at,
  );
}

/** Textos de cancelamento por cenário (cartão agendado, boleto/PIX, ativo, etc.). */
export function getSubscriptionCancelCopy(
  sub: SubscriptionDisplaySlice,
): SubscriptionCancelCopy {
  const until = accessUntilDate(sub);

  if (isScheduledPaidAfterTrial(sub)) {
    return {
      buttonLabel: "Cancelar renovação automática",
      dialogTitle: "Cancelar renovação automática?",
      dialogDescription:
        `A assinatura recorrente será cancelada no Pagar.me e não haverá cobrança em ${until}. ` +
        `Você continua no teste gratuito até essa data e pode contratar o plano novamente quando quiser.`,
      confirmLabel: "Sim, cancelar renovação",
      successTitle: "Renovação automática cancelada",
      successDescription:
        `Nenhuma cobrança será realizada. Seu acesso pelo teste gratuito permanece até ${until}.`,
    };
  }

  if (isAwaitingOfflinePayment(sub)) {
    return {
      buttonLabel: "Cancelar cobrança pendente",
      dialogTitle: "Cancelar cobrança pendente?",
      dialogDescription:
        `A cobrança em aberto será cancelada no Pagar.me. O boleto costuma valer por ${OFFLINE_PAYMENT_BOLETO_VALID_DAYS} dias; ` +
        `o PIX, por tempo limitado. Seu acesso vigente segue até ${until}. ` +
        `Você pode gerar uma nova cobrança depois, se desejar.`,
      confirmLabel: "Sim, cancelar cobrança",
      successTitle: "Cobrança pendente cancelada",
      successDescription:
        `A tentativa de pagamento foi encerrada. O acesso atual permanece até ${until}.`,
    };
  }

  if (sub.status === "active") {
    return {
      buttonLabel: "Cancelar assinatura",
      dialogTitle: "Cancelar assinatura?",
      dialogDescription:
        `A recorrência será encerrada no Pagar.me. Você mantém acesso ao Pubfy até ${until}, ` +
        `fim do período já pago, sem novas cobranças após essa data.`,
      confirmLabel: "Sim, cancelar assinatura",
      successTitle: "Assinatura cancelada",
      successDescription:
        `A renovação automática foi desativada. Seu acesso continua até ${until}.`,
    };
  }

  if (sub.status === "trialing" || sub.is_trial) {
    return {
      buttonLabel: "Encerrar período de teste",
      dialogTitle: "Encerrar período de teste?",
      dialogDescription:
        "O teste gratuito será encerrado antes da data prevista. Para usar o Pubfy depois, será necessário contratar um plano pago.",
      confirmLabel: "Sim, encerrar teste",
      successTitle: "Período de teste encerrado",
      successDescription: "Você pode contratar um plano na aba Planos disponíveis quando quiser.",
    };
  }

  return {
    buttonLabel: "Cancelar assinatura",
    dialogTitle: "Cancelar assinatura?",
    dialogDescription:
      `A assinatura será cancelada no Pagar.me. Quando houver período vigente, o acesso permanece até ${until}.`,
    confirmLabel: "Sim, cancelar",
    successTitle: "Assinatura cancelada",
    successDescription: "O cancelamento foi registrado. Você pode contratar novamente quando quiser.",
  };
}

export function buildScheduledPlanAlertCopy(input: {
  planName?: string | null;
  trialEndsAt?: string | null;
  firstChargeAt?: string | null;
}): { title: string; description: string } {
  const plan = input.planName ?? "Plano Pubfy";
  const trialEnd = formatSubscriptionDate(input.trialEndsAt);
  const charge = formatSubscriptionDate(input.firstChargeAt);

  return {
    title: "Plano pago confirmado — teste gratuito em andamento",
    description: `Seu pagamento do ${plan} foi aceito. Você continua no teste gratuito até ${trialEnd}. A primeira cobrança será em ${charge}, automaticamente, sem precisar fazer nada de novo.`,
  };
}
