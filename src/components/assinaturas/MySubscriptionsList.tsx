import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Calendar, Clock, CreditCard, RefreshCw, Settings } from "lucide-react";
import { MySubscription } from "@/hooks/useMySubscriptions";
import {
  getCustomerSubscriptionDisplay,
  getVisibleSubscriptionsForCustomer,
} from "@/lib/subscriptionCustomerDisplay";
import { formatYearlyBillingShort } from "@/lib/planPricingDisplay";

interface MySubscriptionsListProps {
  subscriptions: MySubscription[];
  loading: boolean;
  error: string | null;
  onRefetch: () => void;
  onViewPlans: () => void;
  onManage: (subscription: MySubscription) => void;
}

const formatDate = (value: string | null | undefined) => {
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
};

const formatCurrency = (value: number | null | undefined) =>
  typeof value === "number"
    ? value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
    : "—";

const BILLING_CYCLE_LABEL: Record<string, string> = {
  monthly: "Mensal",
  yearly: "Anual",
};

const MySubscriptionsList = ({
  subscriptions,
  loading,
  error,
  onRefetch,
  onViewPlans,
  onManage,
}: MySubscriptionsListProps) => {
  if (loading) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          Carregando suas assinaturas...
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" /> Erro ao carregar assinaturas
          </CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={onRefetch} size="sm">
            <RefreshCw className="h-4 w-4 mr-2" /> Tentar novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (subscriptions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Nenhuma assinatura ativa</CardTitle>
          <CardDescription>
            Você não possui assinaturas ativas, em teste, aguardando pagamento ou em atraso no momento.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={onViewPlans} className="bg-green hover:bg-green-dark">
            Ver planos disponíveis
          </Button>
        </CardContent>
      </Card>
    );
  }

  const visibleSubscriptions = getVisibleSubscriptionsForCustomer(subscriptions);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {visibleSubscriptions.length} assinatura(s) encontrada(s)
        </p>
        <Button variant="ghost" size="sm" onClick={onRefetch}>
          <RefreshCw className="h-4 w-4 mr-2" /> Atualizar
        </Button>
      </div>

      {visibleSubscriptions.map((sub) => {
        const display = getCustomerSubscriptionDisplay(sub);
        const statusMeta = display.statusMeta;
        const StatusIcon = statusMeta.icon;
        const cycleLabel = sub.billing_cycle
          ? BILLING_CYCLE_LABEL[sub.billing_cycle] ?? sub.billing_cycle
          : "—";
        const planPrice =
          sub.billing_cycle === "yearly" && sub.plan?.price_yearly != null
            ? sub.plan.price_yearly * 12
            : sub.plan?.price_monthly;
        const planPriceHint =
          sub.billing_cycle === "yearly" && sub.plan?.price_yearly != null
            ? formatYearlyBillingShort(sub.plan.price_yearly)
            : null;

        return (
          <Card key={sub.id} className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <CardTitle className="text-lg">
                    {sub.plan?.name ?? "Plano"}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {sub.plan?.description ?? "Assinatura Pubfy"}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={statusMeta.className}>
                    <StatusIcon className="h-3.5 w-3.5 mr-1" />
                    {statusMeta.label}
                  </Badge>
                  <Button size="sm" variant="outline" onClick={() => onManage(sub)}>
                    <Settings className="h-4 w-4 mr-1" />
                    Gerenciar
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                <div className="flex items-start gap-2">
                  <CreditCard className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-muted-foreground text-xs">Ciclo de cobrança</p>
                    <p className="font-medium">{cycleLabel}</p>
                    {planPrice != null && (
                      <p className="text-xs text-muted-foreground">
                        {planPriceHint ?? (
                          <>
                            {formatCurrency(planPrice)}
                            {sub.billing_cycle === "yearly" ? "/ano" : "/mês"}
                          </>
                        )}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-muted-foreground text-xs">
                      {display.periodPrimaryLabel}
                    </p>
                    <p className="font-medium">{display.periodPrimaryValue}</p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-muted-foreground text-xs">
                      {display.periodSecondaryLabel}
                    </p>
                    <p className="font-medium">{display.periodSecondaryValue}</p>
                  </div>
                </div>
              </div>

              {display.footerNote && (
                <p className="rounded-md border border-green/30 bg-green/5 px-3 py-2 text-xs text-muted-foreground">
                  {display.footerNote}
                </p>
              )}

              {(sub.last_payment_at || display.paymentStatusLabel) && (
                <div className="border-t pt-3 text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
                  {sub.last_payment_at && (
                    <span>
                      Último pagamento: <strong>{formatDate(sub.last_payment_at)}</strong>
                    </span>
                  )}
                  {display.paymentStatusLabel && (
                    <span>
                      Pagamento: <strong>{display.paymentStatusLabel}</strong>
                    </span>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default MySubscriptionsList;
