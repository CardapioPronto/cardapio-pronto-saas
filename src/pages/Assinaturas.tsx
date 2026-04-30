
import { useState, useEffect } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { toast } from "@/components/ui/sonner";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle, AlertTriangle, Clock } from "lucide-react";
import PaymentForm, { PaymentSuccessData } from "@/components/payment/PaymentForm";
import SubscriptionOverview from "@/components/assinaturas/SubscriptionOverview";
import PlansGrid from "@/components/assinaturas/PlansGrid";
import MySubscriptionsList from "@/components/assinaturas/MySubscriptionsList";
import ManageSubscriptionDialog from "@/components/assinaturas/ManageSubscriptionDialog";
import { fetchPlanos } from "@/services/planosService";
import { useMySubscriptions, MySubscription } from "@/hooks/useMySubscriptions";
import { Plano } from "@/types/plano";

const Assinaturas = () => {
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<string>("overview");
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

  const currentSubscription =
    mySubscriptions.find((sub) => ["active", "trialing", "past_due"].includes(sub.status)) ??
    null;
  const trialEndsAt = currentSubscription?.trial_ends_at
    ? new Date(currentSubscription.trial_ends_at)
    : null;
  const daysLeftInTrial = trialEndsAt
    ? Math.max(0, Math.ceil((trialEndsAt.getTime() - Date.now()) / 86400000))
    : 0;

  useEffect(() => {
    const loadPlanos = async () => {
      try {
        const planosData = await fetchPlanos();
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

  // Alterar plano
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
    setSelectedTab("overview");
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
        {currentSubscription?.status === "trialing" && (
          <Alert className="border-orange/40 bg-orange/5">
            <Clock className="h-4 w-4 text-orange" />
            <AlertTitle>Você está no período de teste gratuito (14 dias)</AlertTitle>
            <AlertDescription>
              Restam <strong>{daysLeftInTrial} dia(s)</strong> de teste. Ative seu plano para continuar usando o Pubfy sem interrupção.
            </AlertDescription>
          </Alert>
        )}
        {!mySubsLoading &&
          (!currentSubscription || currentSubscription.status === "past_due") && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>{currentSubscription?.status === "past_due" ? "Pagamento em atraso" : "Plano expirado ou inativo"}</AlertTitle>
              <AlertDescription>
                Ative o Plano Pubfy para voltar a usar todos os recursos.
              </AlertDescription>
            </Alert>
          )}
        {currentSubscription?.status === "active" && (
            <Alert className="border-green/40 bg-green/5">
              <CheckCircle className="h-4 w-4 text-green" />
              <AlertTitle>Plano ativo</AlertTitle>
              <AlertDescription>
                Sua assinatura do {currentSubscription.plan?.name ?? "Plano Pubfy"} está em dia.
              </AlertDescription>
            </Alert>
          )}
        
        <Tabs 
          value={selectedTab} 
          onValueChange={setSelectedTab} 
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
                onViewPlans={() => setSelectedTab("plans")}
              />
            )}
          </TabsContent>

          <TabsContent value="my-subscriptions">
            <MySubscriptionsList
              subscriptions={mySubscriptions}
              loading={mySubsLoading}
              error={mySubsError}
              onRefetch={refetchMySubs}
              onViewPlans={() => setSelectedTab("plans")}
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
        <DialogContent className="sm:max-w-[525px] p-0">
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
      />
    </DashboardLayout>
  );
};

export default Assinaturas;
