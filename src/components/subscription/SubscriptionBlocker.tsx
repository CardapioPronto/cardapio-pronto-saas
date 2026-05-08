import { ReactNode, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";

interface SubscriptionBlockerProps {
  children?: ReactNode;
  disabled?: boolean;
}

export const SubscriptionBlocker = ({ children, disabled = false }: SubscriptionBlockerProps) => {
  const navigate = useNavigate();
  const { hasActiveSubscription, isInTrial, daysLeftInTrial, isLoading } = useSubscriptionStatus();

  const shouldBlock = !disabled && !isLoading && !hasActiveSubscription && (!isInTrial || daysLeftInTrial <= 0);

  useEffect(() => {
    if (shouldBlock) {
      const timer = setTimeout(() => {
        navigate('/assinaturas');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [shouldBlock, navigate]);

  if (disabled) {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <span className="text-lg font-medium">Verificando assinatura...</span>
      </div>
    );
  }

  if (!shouldBlock) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-6 w-6 text-orange-500" />
            <CardTitle>Assinatura Necessária</CardTitle>
          </div>
          <CardDescription>
            Seu período de teste expirou ou você não possui uma assinatura ativa.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Para continuar usando o sistema, escolha um dos nossos planos.
            Redirecionando em 3 segundos...
          </p>
          <Button 
            onClick={() => navigate('/assinaturas')}
            className="w-full"
          >
            Ver Planos Disponíveis
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
