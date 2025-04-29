
import { useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { CheckCircle, XCircle, CreditCard } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PaymentForm from "@/components/payment/PaymentForm";
import SubscriptionDetails from "@/components/payment/SubscriptionDetails";
import { cancelSubscription } from "@/services/paymentService";

// Tipos e interfaces
interface Plano {
  id: string;
  nome: string;
  preco: number;
  periodo: string;
  recursos: string[];
  popular?: boolean;
}

interface Assinatura {
  id: string;
  planoId: string;
  status: "ativa" | "inativa";
  dataInicio: Date;
  dataProximaCobranca: Date;
  metodoPagamento: string;
  historicoPagamentos?: {
    id: string;
    data: Date;
    valor: number;
    status: "aprovado" | "recusado" | "pendente";
  }[];
}

const Assinaturas = () => {
  // Planos disponíveis
  const planos: Plano[] = [
    {
      id: "basic",
      nome: "Básico",
      preco: 49.90,
      periodo: "mensal",
      recursos: [
        "1 Cardápio Digital",
        "Até 30 produtos",
        "PDV básico",
        "Suporte por e-mail"
      ]
    },
    {
      id: "standard",
      nome: "Padrão",
      preco: 99.90,
      periodo: "mensal",
      popular: true,
      recursos: [
        "1 Cardápio Digital personalizado",
        "Até 100 produtos",
        "PDV completo",
        "Gestão de mesas e comandas",
        "Relatórios básicos",
        "Suporte por chat"
      ]
    },
    {
      id: "premium",
      nome: "Premium",
      preco: 149.90,
      periodo: "mensal",
      recursos: [
        "3 Cardápios Digitais personalizáveis",
        "Produtos ilimitados",
        "PDV completo",
        "Gestão de mesas e comandas",
        "Relatórios avançados",
        "Integração com delivery",
        "Suporte prioritário"
      ]
    }
  ];

  // Estado da assinatura atual (simular assinatura ativa)
  const [assinatura, setAssinatura] = useState<Assinatura>({
    id: "sub_12345678",
    planoId: "standard",
    status: "ativa",
    dataInicio: new Date(2023, 2, 15),
    dataProximaCobranca: new Date(2023, 5, 15),
    metodoPagamento: "Cartão de crédito terminado em 4589"
  });

  const [selectedTab, setSelectedTab] = useState<string>("overview");
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedPlanForPayment, setSelectedPlanForPayment] = useState<Plano | null>(null);

  // Alternar plano
  const alterarPlano = (plano: Plano) => {
    setSelectedPlanForPayment(plano);
    setShowPaymentDialog(true);
  };

  // Processar nova assinatura
  const handleSubscriptionSuccess = (subscriptionData: any) => {
    if (selectedPlanForPayment) {
      setAssinatura({
        ...subscriptionData,
        planoId: selectedPlanForPayment.id,
        status: "ativa",
        metodoPagamento: "Cartão de crédito terminado em 4589" // Simplificado para este exemplo
      });
    }
    setShowPaymentDialog(false);
    setSelectedTab("overview");
  };

  // Cancelar assinatura
  const handleCancelSubscription = async () => {
    try {
      await cancelSubscription(assinatura.id);
      setAssinatura({
        ...assinatura,
        status: "inativa"
      });
      
      toast.success("Assinatura cancelada!", {
        description: "Você ainda tem acesso até o final do período já pago."
      });
    } catch (error) {
      toast.error("Erro ao cancelar assinatura. Tente novamente mais tarde.");
    }
  };

  // Reativar assinatura
  const reativarAssinatura = () => {
    setAssinatura({
      ...assinatura,
      status: "ativa"
    });
    
    toast.success("Assinatura reativada com sucesso!");
  };

  // Encontrar plano atual
  const planoAtual = planos.find(plano => plano.id === assinatura.planoId);

  return (
    <DashboardLayout title="Assinaturas">
      <div className="space-y-6">
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
            {assinatura ? (
              <SubscriptionDetails 
                subscription={assinatura}
                plano={planoAtual || planos[0]}
                onCancelSubscription={handleCancelSubscription}
              />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Sem assinatura ativa</CardTitle>
                  <CardDescription>
                    Você não possui uma assinatura ativa no momento.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Escolha um plano para começar a utilizar todos os recursos do CardápioPronto.
                  </p>
                </CardContent>
                <CardFooter>
                  <Button 
                    onClick={() => setSelectedTab("plans")}
                    className="bg-green hover:bg-green-dark"
                  >
                    Ver planos disponíveis
                  </Button>
                </CardFooter>
              </Card>
            )}
          </TabsContent>
          
          <TabsContent value="plans">
            <div className="grid md:grid-cols-3 gap-6">
              {planos.map((plano) => {
                const isAtivo = assinatura.planoId === plano.id && assinatura.status === "ativa";
                
                return (
                  <Card key={plano.id} className={`relative overflow-hidden ${plano.popular ? 'border-green' : ''}`}>
                    {plano.popular && (
                      <div className="absolute top-0 right-0 bg-green text-white px-3 py-1 text-xs">
                        Popular
                      </div>
                    )}
                    
                    <CardHeader>
                      <CardTitle>{plano.nome}</CardTitle>
                      <CardDescription>
                        <span className="text-2xl font-bold">R$ {plano.preco.toFixed(2)}</span>
                        <span className="text-sm">/{plano.periodo}</span>
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {plano.recursos.map((recurso, index) => (
                          <li key={index} className="flex items-start">
                            <CheckCircle className="h-4 w-4 text-green mr-2 mt-1" />
                            <span>{recurso}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                    <CardFooter>
                      {isAtivo ? (
                        <Button disabled className="w-full bg-green text-white">
                          Plano Atual
                        </Button>
                      ) : (
                        <Button 
                          className="w-full"
                          variant={plano.popular ? "default" : "outline"}
                          onClick={() => alterarPlano(plano)}
                        >
                          {assinatura.status === "ativa" ? "Mudar para este plano" : "Assinar plano"}
                        </Button>
                      )}
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="sm:max-w-[525px] p-0">
          {selectedPlanForPayment && (
            <PaymentForm
              planId={selectedPlanForPayment.id}
              planName={selectedPlanForPayment.nome}
              planPrice={selectedPlanForPayment.preco}
              onSuccess={handleSubscriptionSuccess}
              onCancel={() => setShowPaymentDialog(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Assinaturas;
