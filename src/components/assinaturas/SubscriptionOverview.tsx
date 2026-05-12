import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, CheckCircle2, Clock, CreditCard, Settings, ShieldCheck, XCircle, type LucideIcon } from "lucide-react";
import { MySubscription } from "@/hooks/useMySubscriptions";

interface SubscriptionOverviewProps {
  subscription: MySubscription | null;
  onManage: (subscription: MySubscription) => void;
  onViewPlans: () => void;
}

const STATUS_META: Record<string, { label: string; className: string; icon: LucideIcon }> = {
  active: { label: "Ativa", className: "bg-green text-white hover:bg-green-dark", icon: CheckCircle2 },
  trialing: { label: "Em teste", className: "bg-orange/15 text-orange border border-orange/30", icon: Clock },
  past_due: { label: "Em atraso", className: "bg-destructive text-destructive-foreground", icon: XCircle },
  canceled: { label: "Cancelada", className: "bg-muted text-muted-foreground", icon: XCircle },
};

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

const formatCurrency = (value: number | null | undefined) =>
  typeof value === "number"
    ? value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
    : "-";

const getPlanPrice = (subscription: MySubscription) => {
  if (!subscription.plan) return null;
  return subscription.billing_cycle === "yearly"
    ? subscription.plan.price_yearly
    : subscription.plan.price_monthly;
};

const SubscriptionOverview = ({
  subscription,
  onManage,
  onViewPlans,
}: SubscriptionOverviewProps) => {
  if (!subscription) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sem assinatura ativa</CardTitle>
          <CardDescription>
            Nenhuma assinatura ativa, em teste ou em atraso foi encontrada para este restaurante.
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

  const statusMeta = STATUS_META[subscription.status] ?? {
    label: subscription.status,
    className: "bg-muted text-muted-foreground",
    icon: Clock,
  };
  const StatusIcon = statusMeta.icon;
  const cycleLabel = subscription.billing_cycle
    ? BILLING_CYCLE_LABEL[subscription.billing_cycle] ?? subscription.billing_cycle
    : "-";
  const price = getPlanPrice(subscription);

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
            <Button size="sm" variant="outline" onClick={() => onManage(subscription)}>
              <Settings className="mr-2 h-4 w-4" />
              Gerenciar
            </Button>
          </div>
        </CardHeader>

        <CardContent className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-md border bg-background p-4">
            <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-4 w-4" />
              Plano
            </div>
            <p className="font-semibold">{subscription.plan?.name ?? "Plano"}</p>
            <p className="text-sm text-muted-foreground">
              {formatCurrency(price)}
              {subscription.billing_cycle === "yearly" ? "/ano" : "/mês"}
            </p>
          </div>

          <div className="rounded-md border bg-background p-4">
            <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
              <CreditCard className="h-4 w-4" />
              Cobrança
            </div>
            <p className="font-semibold">{cycleLabel}</p>
            <p className="text-sm text-muted-foreground">
              Próxima: {formatDate(subscription.next_billing_at ?? subscription.current_period_end)}
            </p>
          </div>

          <div className="rounded-md border bg-background p-4">
            <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="h-4 w-4" />
              Período atual
            </div>
            <p className="font-semibold">{formatDate(subscription.current_period_start)}</p>
            <p className="text-sm text-muted-foreground">
              até {formatDate(subscription.current_period_end)}
            </p>
          </div>

          <div className="rounded-md border bg-background p-4">
            <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-4 w-4" />
              Pagar.me
            </div>
            <p className="text-sm font-medium">
              {subscription.has_pagarme_subscription ? "Sincronizada" : "Sem vínculo de checkout"}
            </p>
            <p className="text-sm text-muted-foreground">
              {subscription.last_payment_status
                ? `Último status: ${subscription.last_payment_status}`
                : "Aguardando eventos"}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SubscriptionOverview;
