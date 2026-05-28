import { useEffect, useState } from "react";
import { fetchPublicPlanSummaries } from "@/services/publicPlansService";
import { selectMarketingPlan } from "@/lib/marketingPlan";
import { DEFAULT_TRIAL_DAYS, normalizeTrialDays } from "@/lib/trialDays";

export interface ActivePlan {
  id: string;
  name: string;
  description: string | null;
  price_monthly: number;
  price_yearly: number; // valor mensal cobrado dentro do plano anual
  trial_days: number;
}

export function useActivePlan() {
  const [plan, setPlan] = useState<ActivePlan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const data = selectMarketingPlan(await fetchPublicPlanSummaries());
      if (!mounted) return;
      if (data) {
        setPlan({
          id: data.id,
          name: data.name,
          description: data.description ?? null,
          price_monthly: Number(data.price_monthly),
          price_yearly: Number(data.price_yearly),
          trial_days: normalizeTrialDays(data.trial_days, DEFAULT_TRIAL_DAYS),
        });
      }
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return { plan, loading };
}
