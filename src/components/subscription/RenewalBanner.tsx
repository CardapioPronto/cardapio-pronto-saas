import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, CalendarClock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";

export const RenewalBanner = () => {
  const navigate = useNavigate();
  const {
    showRenewalAlert,
    daysUntilRenewal,
    renewalEndsAt,
    isLoading,
    isInTrial,
    subscriptionStatus,
  } = useSubscriptionStatus();

  if (isLoading || isInTrial || !showRenewalAlert || subscriptionStatus !== "active") {
    return null;
  }

  const isUrgent = daysUntilRenewal <= 3;
  const renewalLabel = renewalEndsAt
    ? renewalEndsAt.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : null;

  return (
    <Alert variant={isUrgent ? "destructive" : "default"} className="mb-4">
      {isUrgent ? (
        <AlertCircle className="h-4 w-4" />
      ) : (
        <CalendarClock className="h-4 w-4" />
      )}
      <AlertTitle className="font-semibold">
        {isUrgent ? "Renovação do plano em breve" : "Lembrete de renovação"}
      </AlertTitle>
      <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span>
          Sua assinatura renova em{" "}
          <strong>
            {daysUntilRenewal} {daysUntilRenewal === 1 ? "dia" : "dias"}
          </strong>
          {renewalLabel ? <> ({renewalLabel})</> : null}. Confira os dados de pagamento para evitar interrupção.
        </span>
        <Button
          variant={isUrgent ? "default" : "outline"}
          size="sm"
          className="shrink-0"
          onClick={() => navigate("/assinaturas?tab=my-subscriptions")}
        >
          Ver assinatura
        </Button>
      </AlertDescription>
    </Alert>
  );
};
