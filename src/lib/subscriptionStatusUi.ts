import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  type LucideIcon,
} from "lucide-react";

export type SubscriptionDisplayStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "pending"
  | "canceled";

export type SubscriptionStatusMeta = {
  label: string;
  className: string;
  icon: LucideIcon;
};

export const SUBSCRIPTION_STATUS_META: Record<string, SubscriptionStatusMeta> = {
  active: {
    label: "Ativa",
    className: "bg-green text-white hover:bg-green-dark",
    icon: CheckCircle2,
  },
  trialing: {
    label: "Em teste",
    className: "bg-orange/15 text-orange border border-orange/30",
    icon: Clock,
  },
  pending: {
    label: "Aguardando pagamento",
    className: "bg-orange/15 text-orange border border-orange/30",
    icon: Clock,
  },
  past_due: {
    label: "Em atraso",
    className: "bg-destructive text-destructive-foreground",
    icon: AlertTriangle,
  },
  canceled: {
    label: "Cancelada",
    className: "bg-muted text-muted-foreground",
    icon: XCircle,
  },
};

export function getSubscriptionStatusMeta(status: string): SubscriptionStatusMeta {
  return (
    SUBSCRIPTION_STATUS_META[status] ?? {
      label: status,
      className: "bg-muted text-muted-foreground",
      icon: Clock,
    }
  );
}

/** Assinatura exibida como “atual” na UI (inclui pending; não implica acesso ao produto). */
export const DISPLAYABLE_SUBSCRIPTION_STATUSES = [
  "active",
  "trialing",
  "past_due",
  "pending",
] as const;

export function isDisplayableSubscriptionStatus(status: string): boolean {
  return (DISPLAYABLE_SUBSCRIPTION_STATUSES as readonly string[]).includes(status);
}

export function getLocalSubscriptionStatus(
  subscription: { status?: string } | null | undefined,
): string | null {
  if (!subscription || typeof subscription !== "object") return null;
  const status = (subscription as { status?: string }).status;
  return typeof status === "string" ? status : null;
}

export function isPendingPaymentSubscription(
  result: { subscription?: unknown; payment?: Record<string, unknown> },
): boolean {
  const status = getLocalSubscriptionStatus(
    result.subscription as { status?: string } | undefined,
  );
  const payment = result.payment ?? {};
  const hasOfflinePayment =
    Boolean(payment.boleto_url) ||
    Boolean(payment.boleto_line) ||
    Boolean(payment.boleto_barcode) ||
    Boolean(payment.pix_qr_code) ||
    Boolean(payment.pix_qr_code_url);
  return status === "pending" || hasOfflinePayment;
}

/** @deprecated Use isPendingPaymentSubscription */
export const isPendingBoletoSubscription = isPendingPaymentSubscription;
