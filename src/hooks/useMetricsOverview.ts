import { useCallback, useEffect, useState } from "react";
import { fetchMetricsOverview, type MetricsOverview } from "@/services/metricsService";

export const useMetricsOverview = (restaurantId: string | null, periodDays: number) => {
  const [data, setData] = useState<MetricsOverview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!restaurantId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchMetricsOverview(restaurantId, periodDays);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar as métricas.");
    } finally {
      setLoading(false);
    }
  }, [restaurantId, periodDays]);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, loading, error, reload: load };
};
