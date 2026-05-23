import { useMemo } from "react";
import { useMySubscriptions } from "@/hooks/useMySubscriptions";
import {
  findScheduledPaidPlan,
  findTrialingSubscription,
  getVisibleSubscriptionsForCustomer,
} from "@/lib/subscriptionCustomerDisplay";

/** Contexto de UI para trial + plano agendado (sem alterar regras de cobrança). */
export function useSubscriptionDisplayContext() {
  const { subscriptions, loading, error, refetch } = useMySubscriptions();

  const scheduledPaidPlan = useMemo(
    () => findScheduledPaidPlan(subscriptions),
    [subscriptions],
  );
  const trialingSubscription = useMemo(
    () => findTrialingSubscription(subscriptions),
    [subscriptions],
  );
  const visibleSubscriptions = useMemo(
    () => getVisibleSubscriptionsForCustomer(subscriptions),
    [subscriptions],
  );
  const hasScheduledPaidAfterTrial = Boolean(scheduledPaidPlan);

  return {
    subscriptions,
    visibleSubscriptions,
    scheduledPaidPlan,
    trialingSubscription,
    hasScheduledPaidAfterTrial,
    loading,
    error,
    refetch,
  };
}
