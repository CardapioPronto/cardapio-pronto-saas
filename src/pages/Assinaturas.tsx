
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { toast } from "@/components/ui/sonner-toast";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CheckCircle, AlertTriangle, Clock, FileText } from "lucide-react";
import { pickCurrentSubscription } from "@/lib/pickCurrentSubscription";
import { computeRenewalAlert, computeSubscriptionAccess } from "@/lib/subscriptionAccess";
import PaymentForm, { PaymentSuccessData } from "@/components/payment/PaymentForm";
import SubscriptionOverview from "@/components/assinaturas/SubscriptionOverview";
import PlansGrid from "@/components/assinaturas/PlansGrid";
import MySubscriptionsList from "@/components/assinaturas/MySubscriptionsList";
import ManageSubscriptionDialog from "@/components/assinaturas/ManageSubscriptionDialog";
import { fetchCheckoutPlanos } from "@/services/planosService";
import { useMySubscriptions, MySubscription } from "@/hooks/useMySubscriptions";
import { usePendingSubscriptionPoll } from "@/hooks/usePendingSubscriptionPoll";
import { Plano } from "@/types/plano";

const VALID_TABS = ["overview", "my-subscriptions", "plans"] as const;

const Assinaturas = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get("tab");
  const initialTab =
    tabFromUrl && VALID_TABS.includes(tabFromUrl as (typeof VALID_TABS)[number])
      ? tabFromUrl
      : "overview";

  const [planos, setPlanos] = useState<Plano[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState(initialTab);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedPlanForPayment, setSelectedPlanForPayment] = useState<Plano | null>(null);
  const [selectedBillingCycle, setSelectedBillingCycle] = useState<"monthly" | "yearly">("monthly");
  
  const {
    subscriptions: mySubscriptions,
    loading: mySubsLoading,
    error: mySubsError,
    refetch: refetchMySubs,
  } = useMySubscriptions();
  const [manageSub, setManageSub] = useState<MySubscription | null>(null);

  const currentSubscription = pickCurrentSubscription(mySubscriptions);
  const renewalAlert = currentSubscription
    ? computeRenewalAlert({
        status: currentSubscription.status,
        is_trial: currentSubscription.is_trial,
        current_period_end: currentSubscription.current_period_end,
        next_billing_at: currentSubscription.next_billing_at,
      })
    : null;
  const hasPendingPayment = currentSubscription?.status === "pending";
  const effectiveStatus =
    !hasPendingPayment &&
    currentSubscription?.status === "canceled" &&
    currentSubscription.is_trial &&
    currentSubscription.trial_ends_at &&
    new Date(currentSubscription.trial_ends_at).getTime() >= Date.now()
      ? "trialing"
      : currentSubscription?.status;

  const subscriptionAccess = currentSubscription
    ? computeSubscriptionAccess({
        status: effectiveStatus ?? currentSubscription.status,
        is_trial: currentSubscription.is_trial,
        trial_ends_at: currentSubscription.trial_ends_at,
        current_period_end: currentSubscription.current_period_end,
        next_billing_at: currentSubscription.next_billing_at,
      })
    : null;
  const trialEndsAt = currentSubscription?.trial_ends_at
    ? new Date(currentSubscription.trial_ends_at)
    : null;
  const daysLeftInTrial = trialEndsAt
    ? Math.max(0, Math.ceil((trialEndsAt.getTime() - Date.now()) / 86400000))
    : 0;

  usePendingSubscriptionPoll(currentSubscription?.status, refetchMySubs);

  useEffect(() => {
    if (
      tabFromUrl &&
      VALID_TABS.includes(tabFromUrl as (typeof VALID_TABS)[number]) &&
      tabFromUrl !== selectedTab
    ) {
      setSelectedTab(tabFromUrl);
    }
  }, [tabFromUrl, selectedTab]);

  useEffect(() => {
    const loadPlanos = async () => {
      try {
        const planosData = await fetchCheckoutPlanos();
        setPlanos(planosData);
      } catch (error) {
        console.error("Erro ao carregar planos:", error);
        toast.error("Erro ao carregar planos disponíveis");
      } finally {
        setLoading(false);
      }
    };

    loadPlanos();
  }, []);

  const handleTabChange = (tab: string) => {
    setSelectedTab(tab);
    const next = new URLSearchParams(searchParams);
    if (tab === "overview") next.delete("tab");
    else next.set("tab", tab);
    setSearchParams(next, { replace: true });
  };

  const alterarPlano = (plano: Plano, billingCycle: "monthly" | "yearly") => {
    setSelectedPlanForPayment(plano);
    setSelectedBillingCycle(billingCycle);
    setShowPaymentDialog(true);
  };

  // Processar nova assinatura
  const onSubscriptionSuccess = async (_subscriptionData: PaymentSuccessData) => {
    setShowPaymentDialog(false);
    setSelectedPlanForPayment(null);
    await refetchMySubs();
    handleTabChange("overview");
  };

  const startCheckout = (billingCycle: "monthly" | "yearly" = "monthly") => {
    const plan =
      planos.find((p) => p.id === currentSubscription?.plan_id) ?? planos[0] ?? null;
    if (!plan) {
      handleTabChange("plans");
      toast.error("Nenhum plano disponível para checkout. Sincronize o Plano Pubfy no admin.");
      return;
    }
    const pagarmePlanId =
      billingCycle === "monthly"
        ? plan.pagarme_plan_id_monthly
        : plan.pagarme_plan_id_yearly;
    if (!pagarmePlanId) {
      handleTabChange("plans");
      toast.error(
        "Plano ainda não sincronizado no Pagar.me. Em Admin → Planos, clique em Sincronizar no Plano Pubfy.",
      );
      return;
    }
    alterarPlano(plan, billingCycle);
  };

  if (loading) {
    return (
      <DashboardLayout title="Assinaturas">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Carregando planos...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Assinaturas">
      <div className="space-y-6">
        {effectiveStatus === "trialing" && (
          <Alert className="border-orange/40 bg-orange/5">
            <Clock className="h-4 w-4 text-orange" />
            <AlertTitle>Você está no período de teste gratuito (14 dias)</AlertTitle>
            <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span>
                Restam <strong>{daysLeftInTrial} dia(s)</strong> de teste. Ative seu plano para continuar usando o Pubfy sem interrupção.
              </span>
              <Button
                size="sm"
                className="shrink-0 bg-green text-white hover:bg-green-dark"
                onClick={() => startCheckout("monthly")}
              >
                Ativar plano pago
              </Button>
            </AlertDescription>
          </Alert>
        )}
        {currentSubscription?.status === "pending" && (
          <Alert className="border-orange/40 bg-orange/5">
            <FileText className="h-4 w-4 text-orange" />
            <AlertTitle>Aguardando confirmação do pagamento</AlertTitle>
            <AlertDescription>
              Sua assinatura do {currentSubscription.plan?.name ?? "Plano Pubfy"} foi registrada.
              O acesso completo será liberado após a confirmação do boleto ou PIX.
              Abra <strong>Gerenciar assinatura</strong> para ver o comprovante ou QR Code.
            </AlertDescription>
          </Alert>
        )}
        {subscriptionAccess?.showPastDueGraceAlert && (
          <Alert variant={subscriptionAccess.daysUntilBlock <= 3 ? "destructive" : "default"}>
            <Clock className="h-4 w-4" />
            <AlertTitle>
              {currentSubscription?.status === "past_due"
                ? "Pagamento em atraso"
                : "Renovação pendente"}
            </AlertTitle>
            <AlertDescription>
              Você ainda tem acesso por{" "}
              <strong>
                {subscriptionAccess.daysUntilBlock}{" "}
                {subscriptionAccess.daysUntilBlock === 1 ? "dia" : "dias"}
              </strong>
              . Depois disso, a conta será bloqueada até a renovação do plano. Regularize o
              pagamento em <strong>Gerenciar assinatura</strong> ou escolha um plano abaixo.
            </AlertDescription>
          </Alert>
        )}
        {!mySubsLoading &&
          !hasPendingPayment &&
          !subscriptionAccess?.hasActiveSubscription &&
          !subscriptionAccess?.showPastDueGraceAlert && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Plano expirado ou inativo</AlertTitle>
              <AlertDescription>
                Ative o Plano Pubfy para voltar a usar todos os recursos.
              </AlertDescription>
            </Alert>
          )}
        {currentSubscription?.status === "active" && !renewalAlert?.showRenewalAlert && (
            <Alert className="border-green/40 bg-green/5">
              <CheckCircle className="h-4 w-4 text-green" />
              <AlertTitle>Plano ativo</AlertTitle>
              <AlertDescription>
                Sua assinatura do {currentSubscription.plan?.name ?? "Plano Pubfy"} está em dia.
                {currentSubscription.current_period_end && (
                  <> Próxima renovação em{" "}
                    {new Date(currentSubscription.current_period_end).toLocaleDateString("pt-BR")}.
                  </>
                )}
              </AlertDescription>
            </Alert>
          )}
        {renewalAlert?.showRenewalAlert && currentSubscription?.status === "active" && (
          <Alert variant={renewalAlert.daysUntilRenewal <= 3 ? "destructive" : "default"}>
            <Clock className="h-4 w-4" />
            <AlertTitle>Renovação em {renewalAlert.daysUntilRenewal} dia(s)</AlertTitle>
            <AlertDescription>
              Sua assinatura do {currentSubscription.plan?.name ?? "Plano Pubfy"} renova em breve.
              Mantenha o cartão ou forma de pagamento atualizada no Pagar.me.
            </AlertDescription>
          </Alert>
        )}
        
        <Tabs 
          value={selectedTab} 
          onValueChange={handleTabChange} 
          className="w-full"
        >
          <TabsList className="w-full md:w-auto grid grid-cols-3 md:inline-flex mb-4">
            <TabsTrigger value="overview">Visão geral</TabsTrigger>
            <TabsTrigger value="my-subscriptions">Minhas assinaturas</TabsTrigger>
            <TabsTrigger value="plans">Planos disponíveis</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview">
            {mySubsLoading ? (
              <div className="flex h-48 items-center justify-center rounded-md border bg-card text-sm text-muted-foreground">
                Carregando assinatura...
              </div>
            ) : (
              <SubscriptionOverview
                subscription={currentSubscription}
                onManage={(sub) => setManageSub(sub)}
                onViewPlans={() => handleTabChange("plans")}
                onActivatePlan={() => startCheckout("monthly")}
              />
            )}
          </TabsContent>

          <TabsContent value="my-subscriptions">
            <MySubscriptionsList
              subscriptions={mySubscriptions}
              loading={mySubsLoading}
              error={mySubsError}
              onRefetch={refetchMySubs}
              onViewPlans={() => handleTabChange("plans")}
              onManage={(sub) => setManageSub(sub)}
            />
          </TabsContent>

          <TabsContent value="plans">
            <PlansGrid
              planos={planos}
              currentSubscription={currentSubscription}
              onSelectPlan={alterarPlano}
            />
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="left-[50%] top-[max(0.5rem,env(safe-area-inset-top))] flex max-h-[90dvh] w-[calc(100%-2rem)] -translate-x-1/2 translate-y-0 flex-col overflow-y-auto overscroll-contain p-0 sm:max-w-[525px]">
          <DialogTitle className="sr-only">Ativar plano</DialogTitle>
          <DialogDescription className="sr-only">
            Formulário de pagamento para assinatura do plano selecionado.
          </DialogDescription>
          {selectedPlanForPayment && (
            <PaymentForm
              planId={selectedPlanForPayment.id}
              planName={selectedPlanForPayment.name}
              planPriceMonthly={selectedPlanForPayment.price_monthly}
              planPriceYearly={selectedPlanForPayment.price_yearly}
              initialBillingType={selectedBillingCycle}
              allowedPaymentMethods={selectedPlanForPayment.pagarme_payment_methods}
              onSuccess={onSubscriptionSuccess}
              onCancel={() => setShowPaymentDialog(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      <ManageSubscriptionDialog
        open={manageSub !== null}
        subscription={manageSub}
        onClose={() => setManageSub(null)}
        onUpdated={() => refetchMySubs()}
        onActivatePlan={() => startCheckout("monthly")}
      />
    </DashboardLayout>
  );
};

export default Assinaturas;
