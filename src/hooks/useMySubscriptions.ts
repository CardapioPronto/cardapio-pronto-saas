import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "./useCurrentUser";
import { normalizeSubscriptionStatus } from "@/lib/subscriptionStatusUi";

export interface MySubscription {
  id: string;
  restaurant_id: string;
  plan_id: string;
  status: string;
  billing_cycle: string | null;
  is_trial: boolean | null;
  trial_start: string | null;
  trial_ends_at: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  next_billing_at: string | null;
  last_payment_at: string | null;
  last_payment_status: string | null;
  start_date: string;
  end_date: string | null;
  has_pagarme_subscription: boolean;
  pagarme_subscription_id: string | null;
  pagarme_customer_id: string | null;
  created_at: string;
  plan?: {
    id: string;
    name: string;
    description: string | null;
    price_monthly: number;
    price_yearly: number;
    trial_days?: number | null;
    pagarme_plan_id_monthly?: string | null;
    pagarme_plan_id_yearly?: string | null;
    pagarme_sync_status?: string | null;
    pagarme_payment_methods?: string[] | null;
  } | null;
}

const VISIBLE_STATUSES = ["active", "trialing", "past_due", "pending"];

type PlanSummary = NonNullable<MySubscription["plan"]>;
type SubscriptionRow = Omit<MySubscription, "plan"> & {
  plan?: PlanSummary | PlanSummary[] | null;
};

const normalizeSubscription = (
  subscription: SubscriptionRow,
  plan?: PlanSummary | null,
): MySubscription => {
  const joinedPlan = Array.isArray(subscription.plan)
    ? subscription.plan[0] ?? null
    : subscription.plan ?? null;

  return {
    ...subscription,
    status: normalizeSubscriptionStatus(subscription.status),
    plan: plan ?? joinedPlan,
  };
};

export const useMySubscriptions = () => {
  const { user } = useCurrentUser();
  const [subscriptions, setSubscriptions] = useState<MySubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscriptions = useCallback(async () => {
    if (!user?.restaurant_id) {
      setSubscriptions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data: subsData, error: subsErr } = await supabase.rpc("get_my_subscription_summaries", {
        p_restaurant_id: user.restaurant_id,
      });

      if (subsErr) throw subsErr;

      setSubscriptions(
        ((subsData ?? []) as unknown as SubscriptionRow[]).map((s) =>
          normalizeSubscription({
            ...s,
            pagarme_subscription_id: null,
            pagarme_customer_id: null,
          }),
        )
        .filter((subscription) => VISIBLE_STATUSES.includes(subscription.status))
      );
      setError(null);
    } catch (err) {
      console.error("Erro ao buscar assinaturas:", err);
      setError(err instanceof Error ? err.message : "Erro ao buscar assinaturas");
      setSubscriptions([]);
    } finally {
      setLoading(false);
    }
  }, [user?.restaurant_id]);

  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  return { subscriptions, loading, error, refetch: fetchSubscriptions };
};
