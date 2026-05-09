import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

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
      const { data } = await supabase
        .from("plans")
        .select("id, name, description, price_monthly, price_yearly, trial_days")
        .eq("is_active", true)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (!mounted) return;
      if (data) {
        setPlan({
          id: data.id,
          name: data.name,
          description: data.description ?? null,
          price_monthly: Number(data.price_monthly),
          price_yearly: Number(data.price_yearly),
          trial_days: data.trial_days ?? 14,
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
