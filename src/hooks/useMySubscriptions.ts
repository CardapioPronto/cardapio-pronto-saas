import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "./useCurrentUser";

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

const VISIBLE_STATUSES = ["active", "trialing", "past_due", "canceled"];

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
      const { data: subsData, error: subsErr } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("restaurant_id", user.restaurant_id)
        .in("status", VISIBLE_STATUSES)
        .order("created_at", { ascending: false });

      if (subsErr) throw subsErr;

      const planIds = Array.from(
        new Set((subsData ?? []).map((s) => s.plan_id).filter(Boolean))
      );

      let plansMap: Record<string, PlanSummary> = {};
      if (planIds.length > 0) {
        const { data: plansData } = await supabase
          .from("plans")
          .select("id, name, description, price_monthly, price_yearly, trial_days, pagarme_plan_id_monthly, pagarme_plan_id_yearly, pagarme_sync_status")
          .in("id", planIds as string[]);
        plansMap = Object.fromEntries(((plansData ?? []) as unknown as PlanSummary[]).map((p) => [p.id, p]));
      }

      setSubscriptions(
        ((subsData ?? []) as unknown as SubscriptionRow[]).map((s) =>
          normalizeSubscription(s, plansMap[s.plan_id] ?? null),
        )
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
