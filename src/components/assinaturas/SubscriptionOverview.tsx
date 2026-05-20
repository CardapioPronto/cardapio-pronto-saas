import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Clock, CreditCard, Settings, ShieldCheck } from "lucide-react";
import { MySubscription } from "@/hooks/useMySubscriptions";
import { getSubscriptionStatusMeta } from "@/lib/subscriptionStatusUi";

interface SubscriptionOverviewProps {
  subscription: MySubscription | null;
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

  const statusMeta = getSubscriptionStatusMeta(subscription.status);
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
            <div className="flex flex-wrap gap-2">
              {subscription.status === "trialing" && onActivatePlan && (
                <Button
                  size="sm"
                  className="bg-green text-white hover:bg-green-dark"
                  onClick={onActivatePlan}
                >
                  Ativar plano pago
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={() => onManage(subscription)}>
                <Settings className="mr-2 h-4 w-4" />
                Gerenciar
              </Button>
            </div>
          </div>
        </CardHeader>

        {subscription.status === "trialing" && !subscription.has_pagarme_subscription && (
          <CardContent className="pt-0">
            <p className="rounded-md border border-orange/30 bg-orange/5 px-4 py-3 text-sm text-muted-foreground">
              Você está no teste gratuito. Use <strong>Ativar plano pago</strong> para contratar com cartão,
              boleto ou PIX e validar a integração com o Pagar.me em homologação.
            </p>
          </CardContent>
        )}

        {subscription.status === "pending" && (
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
