
import { useState, useEffect } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { toast } from "@/components/ui/sonner";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle } from "lucide-react";
import PaymentForm from "@/components/payment/PaymentForm";
import SubscriptionOverview from "@/components/assinaturas/SubscriptionOverview";
import PlansGrid from "@/components/assinaturas/PlansGrid";
import { fetchPlanos } from "@/services/planosService";
import { useAssinatura } from "@/hooks/useAssinatura";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";
import { Plano } from "@/types/plano";
import { PlanoFormatado } from "@/types/subscription";

const Assinaturas = () => {
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<string>("overview");
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedPlanForPayment, setSelectedPlanForPayment] = useState<Plano | null>(null);

  const { 
    assinatura, 
    handleSubscriptionSuccess, 
    handleCancelSubscription 
  } = useAssinatura();
  
  const subscriptionStatus = useSubscriptionStatus();

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
  const alterarPlano = (plano: Plano) => {
    setSelectedPlanForPayment(plano);
    setShowPaymentDialog(true);
  };

  // Processar nova assinatura
  const onSubscriptionSuccess = (subscriptionData: any) => {
    handleSubscriptionSuccess(subscriptionData, selectedPlanForPayment?.id);
    setShowPaymentDialog(false);
    setSelectedTab("overview");
  };

  // Encontrar plano atual e formatar
  const planoAtual = planos.find(plano => plano.id === assinatura.planoId) || planos[0];
  const planoFormatado: PlanoFormatado | null = planoAtual ? {
    id: planoAtual.id,
    nome: planoAtual.name,
    preco: planoAtual.price_monthly,
    periodo: "/mês"
  } : null;

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
        {subscriptionStatus.isInTrial && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertTitle>Período de Teste Ativo</AlertTitle>
            <AlertDescription>
              Você tem <strong>{subscriptionStatus.daysLeftInTrial} dias</strong> restantes de teste gratuito do plano {subscriptionStatus.planName}.
            </AlertDescription>
          </Alert>
        )}
        
        <Tabs 
          value={selectedTab} 
          onValueChange={setSelectedTab} 
          className="w-full"
        >
          <TabsList className="w-full md:w-auto grid grid-cols-2 md:inline-flex mb-4">
            <TabsTrigger value="overview">Visão geral</TabsTrigger>
            <TabsTrigger value="plans">Planos disponíveis</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview">
            <SubscriptionOverview
              assinatura={assinatura}
              planoFormatado={planoFormatado}
              onCancelSubscription={handleCancelSubscription}
              onViewPlans={() => setSelectedTab("plans")}
            />
          </TabsContent>
          
          <TabsContent value="plans">
            <PlansGrid
              planos={planos}
              assinatura={assinatura}
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
              planPrice={selectedPlanForPayment.price_monthly}
              onSuccess={onSubscriptionSuccess}
              onCancel={() => setShowPaymentDialog(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Assinaturas;
