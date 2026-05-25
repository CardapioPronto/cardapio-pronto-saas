import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Clock, CreditCard, Settings, ShieldCheck } from "lucide-react";
import { MySubscription } from "@/hooks/useMySubscriptions";
import {
  buildScheduledPlanAlertCopy,
  getCustomerSubscriptionDisplay,
  isScheduledPaidHandoffInGrace,
  scheduledPaidGraceEndsAt,
  scheduledPaidHandoffDate,
} from "@/lib/subscriptionCustomerDisplay";
import { formatCurrentPlanValue } from "@/lib/planPricingDisplay";
import { getSubscriptionStatusMeta } from "@/lib/subscriptionStatusUi";

interface SubscriptionOverviewProps {
  subscription: MySubscription | null;
  scheduledPaidPlan?: MySubscription | null;
  onManage: (subscription: MySubscription) => void;
  onViewPlans: () => void;
  onActivatePlan?: () => void;
}

const BILLING_CYCLE_LABEL: Record<string, string> = {
  monthly: "Mensal",
  yearly: "Anual",
};

const formatDate = (value: string | null | undefined) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const SubscriptionOverview = ({
  subscription,
  scheduledPaidPlan,
  onManage,
  onViewPlans,
  onActivatePlan,
}: SubscriptionOverviewProps) => {
  if (!subscription) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sem assinatura ativa</CardTitle>
          <CardDescription>
            Nenhuma assinatura ativa, em teste, aguardando pagamento ou em atraso foi encontrada para este restaurante.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Escolha um plano sincronizado com o Pagar.me para liberar os recursos do Pubfy.
          </p>
        </CardContent>
        <CardFooter>
          <Button onClick={onViewPlans} className="bg-green hover:bg-green-dark">
            Ver planos disponíveis
          </Button>
        </CardFooter>
      </Card>
    );
  }

  const scheduledInGrace = scheduledPaidPlan
    ? isScheduledPaidHandoffInGrace(scheduledPaidPlan)
    : false;
  const overviewSubscription =
    scheduledInGrace && scheduledPaidPlan ? scheduledPaidPlan : subscription;
  const graceEndsAt = scheduledInGrace
    ? scheduledPaidGraceEndsAt(overviewSubscription)
    : null;
  const handoffAt = scheduledInGrace
    ? scheduledPaidHandoffDate(overviewSubscription)
    : null;
  const display = getCustomerSubscriptionDisplay(overviewSubscription);
  const paymentSubscription = scheduledPaidPlan ?? overviewSubscription;
  const paymentDisplay =
    paymentSubscription.id === overviewSubscription.id
      ? display
      : getCustomerSubscriptionDisplay(paymentSubscription);
  const periodStart = scheduledInGrace
    ? handoffAt?.toISOString() ?? overviewSubscription.current_period_start
    : overviewSubscription.current_period_start;
  const periodEnd = scheduledInGrace
    ? graceEndsAt?.toISOString() ?? overviewSubscription.current_period_end
    : overviewSubscription.current_period_end;

  const scheduledCopy = scheduledPaidPlan
    ? buildScheduledPlanAlertCopy({
        planName: scheduledPaidPlan.plan?.name ?? overviewSubscription.plan?.name,
        trialEndsAt: scheduledPaidPlan.current_period_end,
        firstChargeAt:
          scheduledPaidPlan.next_billing_at ?? scheduledPaidPlan.current_period_end,
        isHandoffInGrace: scheduledInGrace,
        graceEndsAt: graceEndsAt?.toISOString(),
      })
    : null;
  const statusMeta = scheduledPaidPlan
    ? scheduledInGrace
      ? display.statusMeta
      : { label: "Teste + plano confirmado", className: "bg-green/15 text-green border border-green/30", icon: ShieldCheck }
    : getSubscriptionStatusMeta(overviewSubscription.status);
  const StatusIcon = statusMeta.icon;
  const cycleLabel = overviewSubscription.billing_cycle
    ? BILLING_CYCLE_LABEL[overviewSubscription.billing_cycle] ?? overviewSubscription.billing_cycle
    : "-";
  const planPricing = overviewSubscription.plan
    ? formatCurrentPlanValue(
        overviewSubscription.billing_cycle,
        overviewSubscription.plan.price_monthly,
        overviewSubscription.plan.price_yearly,
      )
    : null;
  const pagarmeStatusLabel =
    paymentDisplay.paymentStatusLabel ??
    (paymentSubscription.last_payment_status
      ? `Último status: ${paymentSubscription.last_payment_status}`
      : "Aguardando eventos");

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Assinatura atual
                <Badge className={statusMeta.className}>
                  <StatusIcon className="mr-1 h-3.5 w-3.5" />
                  {statusMeta.label}
                </Badge>
              </CardTitle>
              <CardDescription className="mt-1">
                Dados vindos da tabela de assinaturas e sincronizados pelos eventos do Pagar.me.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              {overviewSubscription.status === "trialing" && onActivatePlan && !scheduledPaidPlan && (
                <Button
                  size="sm"
                  className="bg-green text-white hover:bg-green-dark"
                  onClick={onActivatePlan}
                >
                  Ativar plano pago
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={() => onManage(overviewSubscription)}>
                <Settings className="mr-2 h-4 w-4" />
                Gerenciar
              </Button>
            </div>
          </div>
        </CardHeader>

        {scheduledCopy && (
          <CardContent className="pt-0">
            <p className="rounded-md border border-green/30 bg-green/5 px-4 py-3 text-sm text-muted-foreground">
              {scheduledCopy.description}
            </p>
          </CardContent>
        )}

        {overviewSubscription.status === "trialing" &&
          !overviewSubscription.has_pagarme_subscription &&
          !scheduledPaidPlan && (
          <CardContent className="pt-0">
            <p className="rounded-md border border-orange/30 bg-orange/5 px-4 py-3 text-sm text-muted-foreground">
              Você está no teste gratuito. Use <strong>Ativar plano pago</strong> para contratar com cartão,
              boleto ou PIX.
            </p>
          </CardContent>
        )}

        {overviewSubscription.status === "pending" && !scheduledPaidPlan && (
          <CardContent className="pt-0">
            <p className="rounded-md border border-orange/30 bg-orange/5 px-4 py-3 text-sm text-muted-foreground">
              Pagamento (boleto ou PIX) em análise. Use <strong>Gerenciar</strong> para ver o QR Code, boleto ou
              acompanhar a confirmação.
            </p>
          </CardContent>
        )}

        <CardContent className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-md border bg-background p-4">
            <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-4 w-4" />
              Plano
            </div>
            <p className="font-semibold">{overviewSubscription.plan?.name ?? "Plano"}</p>
            <p className="text-sm text-muted-foreground">
              {planPricing?.value ?? "—"}
            </p>
            {planPricing?.helper && (
              <p className="text-xs text-muted-foreground">{planPricing.helper}</p>
            )}
          </div>

          <div className="rounded-md border bg-background p-4">
            <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
              <CreditCard className="h-4 w-4" />
              Cobrança
            </div>
            <p className="font-semibold">{cycleLabel}</p>
            <p className="text-sm text-muted-foreground">
              {scheduledInGrace
                ? `Sincronizar até: ${formatDate(graceEndsAt?.toISOString())}`
                : `Próxima: ${formatDate(overviewSubscription.next_billing_at ?? overviewSubscription.current_period_end)}`}
            </p>
          </div>

          <div className="rounded-md border bg-background p-4">
            <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="h-4 w-4" />
              Período atual
            </div>
            <p className="font-semibold">{formatDate(periodStart)}</p>
            <p className="text-sm text-muted-foreground">
              até {formatDate(periodEnd)}
            </p>
          </div>

          <div className="rounded-md border bg-background p-4">
            <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-4 w-4" />
              Pagar.me
            </div>
            <p className="text-sm font-medium">
              {scheduledInGrace
                ? "Primeira cobrança em sincronização"
                : scheduledPaidPlan
                  ? "Plano pago confirmado"
                  : overviewSubscription.has_pagarme_subscription
                  ? "Sincronizada"
                  : "Sem vínculo de checkout"}
            </p>
            <p className="text-sm text-muted-foreground">
              {scheduledInGrace ? "Aguardando evento de cobrança recorrente" : pagarmeStatusLabel}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SubscriptionOverview;
