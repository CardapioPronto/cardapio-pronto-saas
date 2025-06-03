
import { useState } from "react";
import { toast } from "@/components/ui/sonner";
import { cancelSubscription } from "@/services/paymentService";
import { Assinatura } from "@/types/subscription";

export const useAssinatura = () => {
  // Estado da assinatura atual (simular assinatura ativa)
  const [assinatura, setAssinatura] = useState<Assinatura>({
    id: "sub_12345678",
    planoId: "standard",
    status: "ativa",
    dataInicio: new Date(2023, 2, 15),
    dataProximaCobranca: new Date(2023, 5, 15),
    metodoPagamento: "Cartão de crédito terminado em 4589"
  });

  // Processar nova assinatura
  const handleSubscriptionSuccess = (subscriptionData: any, selectedPlanId?: string) => {
    if (selectedPlanId) {
      setAssinatura({
        ...subscriptionData,
        planoId: selectedPlanId,
        status: "ativa",
        metodoPagamento: "Cartão de crédito terminado em 4589" // Simplificado para este exemplo
      });
    }
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

  return {
    assinatura,
    handleSubscriptionSuccess,
    handleCancelSubscription,
    reativarAssinatura
  };
};
