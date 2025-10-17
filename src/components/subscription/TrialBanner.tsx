import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";

export const TrialBanner = () => {
  const navigate = useNavigate();
  const { isInTrial, daysLeftInTrial, hasActiveSubscription, isLoading } = useSubscriptionStatus();

  if (isLoading || !isInTrial || !hasActiveSubscription) {
    return null;
  }

  const isExpiringSoon = daysLeftInTrial <= 3;

  return (
    <Alert variant={isExpiringSoon ? "destructive" : "default"} className="mb-4">
      {isExpiringSoon ? (
        <AlertCircle className="h-4 w-4" />
      ) : (
        <Clock className="h-4 w-4" />
      )}
      <AlertTitle className="font-semibold">
        {isExpiringSoon 
          ? "⚠️ Seu período de teste está acabando!" 
          : "🎉 Você está no período de teste"}
      </AlertTitle>
      <AlertDescription className="flex items-center justify-between">
        <span>
          Restam <strong>{daysLeftInTrial} {daysLeftInTrial === 1 ? 'dia' : 'dias'}</strong> do seu período de teste gratuito.
          {isExpiringSoon && " Escolha um plano para continuar usando o sistema sem interrupções."}
        </span>
        <Button 
          variant={isExpiringSoon ? "default" : "outline"}
          size="sm"
          onClick={() => navigate('/assinaturas')}
          className="ml-4"
        >
          Ver Planos
        </Button>
      </AlertDescription>
    </Alert>
  );
};
