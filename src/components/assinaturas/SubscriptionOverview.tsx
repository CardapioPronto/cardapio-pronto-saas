
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import SubscriptionDetails from "@/components/payment/SubscriptionDetails";
import { Assinatura, PlanoFormatado } from "@/types/subscription";

interface SubscriptionOverviewProps {
  assinatura: Assinatura | null;
  planoFormatado: PlanoFormatado | null;
  onCancelSubscription: () => void;
  onViewPlans: () => void;
}

const SubscriptionOverview = ({ 
  assinatura, 
  planoFormatado, 
  onCancelSubscription, 
  onViewPlans 
}: SubscriptionOverviewProps) => {
  if (!assinatura) {
    return (
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
            onClick={onViewPlans}
            className="bg-green hover:bg-green-dark"
          >
            Ver planos disponíveis
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (!planoFormatado) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Erro ao carregar plano</CardTitle>
          <CardDescription>
            Não foi possível carregar os detalhes do seu plano atual.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <SubscriptionDetails 
      subscription={assinatura}
      plano={planoFormatado}
      onCancelSubscription={onCancelSubscription}
    />
  );
};

export default SubscriptionOverview;
