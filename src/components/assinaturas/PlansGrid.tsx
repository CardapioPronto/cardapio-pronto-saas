import { useState } from "react";
import { AlertTriangle, CheckCircle2, LayoutGrid, MessageCircle, ShoppingBag, Sparkles, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Plano } from "@/types/plano";
import { MySubscription } from "@/hooks/useMySubscriptions";

interface PlansGridProps {
  planos: Plano[];
  currentSubscription: MySubscription | null;
  onSelectPlan: (plano: Plano, billingCycle: "monthly" | "yearly") => void;
}

const benefits = [
  { icon: ShoppingBag, text: "Cardápio digital profissional" },
  { icon: MessageCircle, text: "Pedidos automatizados pelo WhatsApp" },
  { icon: LayoutGrid, text: "Gestão completa: PDV, mesas e relatórios" },
  { icon: Zap, text: "Atualizações e suporte incluídos" },
];

const formatCurrency = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const isPlanSyncedForCycle = (plano: Plano, cycle: "monthly" | "yearly") =>
  cycle === "monthly"
    ? Boolean(plano.pagarme_plan_id_monthly)
    : Boolean(plano.pagarme_plan_id_yearly);

const PlansGrid = ({ planos, currentSubscription, onSelectPlan }: PlansGridProps) => {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const isSinglePlanModel = planos.length <= 1;

  if (planos.length === 0) {
    return (
      <Alert className="border-orange/40 bg-orange/5">
        <AlertTriangle className="h-4 w-4 text-orange" />
        <AlertTitle>Plano Pubfy temporariamente indisponível</AlertTitle>
        <AlertDescription>
          O plano único ainda não está ativo para contratação online neste ambiente.
          Assim que a configuração do pagamento for concluída, a opção de adesão aparecerá aqui.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-center">
        <div className="inline-flex rounded-md border bg-background p-1">
          <button
            type="button"
            onClick={() => setBillingCycle("monthly")}
            className={`rounded px-4 py-2 text-sm font-medium transition ${
              billingCycle === "monthly" ? "bg-muted text-foreground" : "text-muted-foreground"
            }`}
          >
            Mensal
          </button>
          <button
            type="button"
            onClick={() => setBillingCycle("yearly")}
            className={`rounded px-4 py-2 text-sm font-medium transition ${
              billingCycle === "yearly" ? "bg-muted text-foreground" : "text-muted-foreground"
            }`}
          >
            Anual
          </button>
        </div>
      </div>

      <div
        className={
          isSinglePlanModel
            ? "mx-auto grid w-full max-w-xl gap-5"
            : "grid gap-5 lg:grid-cols-2 xl:grid-cols-3"
        }
      >
        {planos.map((plano) => {
          const price = billingCycle === "yearly" ? plano.price_yearly : plano.price_monthly;
          const isCurrentPlan =
            currentSubscription?.plan_id === plano.id &&
            currentSubscription?.status !== "canceled" &&
            currentSubscription?.billing_cycle === billingCycle;
          const isSynced = isPlanSyncedForCycle(plano, billingCycle);
          const paymentMethods = plano.pagarme_payment_methods ?? [];
          const hasSupportedPaymentMethod = paymentMethods.some((method) =>
            method === "credit_card" || method === "boleto" || method === "pix",
          );
          const canSubscribe = isSynced && hasSupportedPaymentMethod;
          const buttonLabel = isCurrentPlan
            ? "Plano atual"
            : !canSubscribe
              ? "Pagamento em configuração"
              : currentSubscription?.status === "past_due"
                ? "Regularizar plano"
                : "Começar agora";

          return (
            <Card key={plano.id} className="relative flex flex-col overflow-hidden border-2 border-green/50 shadow-sm">
              {isSinglePlanModel && (
                <div className="absolute left-1/2 top-0 -translate-x-1/2 rounded-b-md bg-green px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-white">
                  Plano único
                </div>
              )}

              <div className="border-b bg-muted/25 p-5 pt-10">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-semibold">{plano.name}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {plano.description ?? "Plano Pubfy para operação do restaurante"}
                    </p>
                  </div>
                  {isCurrentPlan && (
                    <Badge className="bg-green text-white hover:bg-green-dark">
                      <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                      Atual
                    </Badge>
                  )}
                </div>

                <div className="flex items-end gap-2">
                  <span className="text-3xl font-bold">{formatCurrency(price)}</span>
                  <span className="pb-1 text-sm text-muted-foreground">/mês</span>
                </div>
                {billingCycle === "yearly" && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    Cobrado {formatCurrency(price * 12)} por ano
                  </p>
                )}
                {(plano.trial_days ?? 0) > 0 && (
                  <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-orange/10 px-3 py-1 text-sm font-medium text-orange">
                    <Sparkles className="h-4 w-4" />
                    {plano.trial_days} dias grátis
                  </div>
                )}
              </div>

              <div className="flex flex-1 flex-col p-5">
                <ul className="space-y-3">
                  {benefits.map((benefit) => (
                    <li key={benefit.text} className="flex items-start gap-3 text-sm">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-green/10 text-green">
                        <benefit.icon className="h-4 w-4" />
                      </span>
                      <span className="pt-1">{benefit.text}</span>
                    </li>
                  ))}
                </ul>

                {!isSynced && (
                  <div className="mt-5 rounded-md border border-orange/30 bg-orange/5 p-3 text-sm text-orange">
                    Contratação online em configuração para cobrança{" "}
                    {billingCycle === "yearly" ? "anual" : "mensal"}.
                  </div>
                )}

                <Button
                  className="mt-5 h-11 w-full bg-green font-semibold text-white hover:bg-green-dark"
                  disabled={isCurrentPlan || !canSubscribe}
                  onClick={() => onSelectPlan(plano, billingCycle)}
                >
                  {buttonLabel}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default PlansGrid;
