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
  } | null;
}

const VISIBLE_STATUSES = ["active", "trialing", "past_due", "canceled"];

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
      const { data, error: fetchError } = await supabase
        .from("subscriptions")
        .select(`
          *,
          plan:plans!subscriptions_plan_id_fkey (
            id,
            name,
            description,
            price_monthly,
            price_yearly
          )
        `)
        .eq("restaurant_id", user.restaurant_id)
        .in("status", VISIBLE_STATUSES)
        .order("created_at", { ascending: false });

      if (fetchError) {
        // Fallback sem foreign key relationship (plan_id é texto)
        const { data: fallbackData, error: fallbackErr } = await supabase
          .from("subscriptions")
          .select("*")
          .eq("restaurant_id", user.restaurant_id)
          .in("status", VISIBLE_STATUSES)
          .order("created_at", { ascending: false });

        if (fallbackErr) throw fallbackErr;

        const planIds = Array.from(
          new Set((fallbackData ?? []).map((s) => s.plan_id).filter(Boolean))
        );

        let plansMap: Record<string, any> = {};
        if (planIds.length > 0) {
          const { data: plansData } = await supabase
            .from("plans")
            .select("id, name, description, price_monthly, price_yearly")
            .in("id", planIds);
          plansMap = Object.fromEntries((plansData ?? []).map((p) => [p.id, p]));
        }

        setSubscriptions(
          (fallbackData ?? []).map((s) => ({
            ...(s as any),
            plan: plansMap[s.plan_id] ?? null,
          }))
        );
      } else {
        setSubscriptions((data as any) ?? []);
      }
      setError(null);
    } catch (err: any) {
      console.error("Erro ao buscar assinaturas:", err);
      setError(err.message ?? "Erro ao buscar assinaturas");
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