import { useMemo } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";
import { useSubscriptionDisplayContext } from "@/hooks/useSubscriptionDisplayContext";
import { usePendingSubscriptionPoll } from "@/hooks/usePendingSubscriptionPoll";
import { PAST_DUE_GRACE_DAYS } from "@/lib/subscriptionAccess";

export const PastDueGraceBanner = () => {
  const navigate = useNavigate();
  const {
    showPastDueGraceAlert,
    daysUntilBlock,
    graceEndsAt,
    isLoading,
    subscriptionStatus,
  } = useSubscriptionStatus();
  const {
    hasScheduledPaidAfterTrial,
    loading: displayLoading,
    scheduledPaidPlan,
    refetch,
  } =
    useSubscriptionDisplayContext();
  const scheduledPendingIds = useMemo(
    () =>
      hasScheduledPaidAfterTrial && scheduledPaidPlan?.status === "pending"
        ? [scheduledPaidPlan.id]
        : [],
    [hasScheduledPaidAfterTrial, scheduledPaidPlan?.id, scheduledPaidPlan?.status],
  );
  usePendingSubscriptionPoll(scheduledPendingIds, refetch);

  if (isLoading || displayLoading || !showPastDueGraceAlert) {
    return null;
  }

  const isUrgent = daysUntilBlock <= 3;
  const blockLabel = graceEndsAt
    ? graceEndsAt.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : null;
  const title =
    hasScheduledPaidAfterTrial
      ? "Primeira cobrança em sincronização"
      : subscriptionStatus === "past_due"
      ? "Pagamento em atraso"
      : "Renovação pendente";
  const description = hasScheduledPaidAfterTrial
    ? "Seu plano pago já foi agendado, mas a primeira cobrança ainda não foi sincronizada pelo Pagar.me."
    : subscriptionStatus === "past_due"
      ? "Identificamos falha na cobrança da sua assinatura."
      : "O período da sua assinatura terminou e a renovação ainda não foi confirmada.";

  return (
    <Alert variant={isUrgent ? "destructive" : "default"} className="mb-4">
      {isUrgent ? (
        <AlertCircle className="h-4 w-4" />
      ) : (
        <Clock className="h-4 w-4" />
      )}
      <AlertTitle className="font-semibold">{title}</AlertTitle>
      <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span>
          {description}{" "}
          Você continua com acesso por mais{" "}
          <strong>
            {daysUntilBlock} {daysUntilBlock === 1 ? "dia" : "dias"}
          </strong>
          {blockLabel ? <> (até {blockLabel})</> : null}. Após esse prazo de{" "}
          {PAST_DUE_GRACE_DAYS} dias, o acesso será bloqueado até a renovação do plano.
        </span>
        <Button
          variant={isUrgent ? "default" : "outline"}
          size="sm"
          className="shrink-0"
          onClick={() => navigate("/assinaturas?tab=my-subscriptions")}
        >
          {hasScheduledPaidAfterTrial ? "Ver assinatura" : "Regularizar pagamento"}
        </Button>
      </AlertDescription>
    </Alert>
  );
};
