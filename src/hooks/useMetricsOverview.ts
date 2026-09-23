import { useCallback, useEffect, useState } from "react";
import {
  fetchMetricsOverview,
  type MetricsFilters,
  type MetricsOverview,
} from "@/services/metricsService";

export const useMetricsOverview = (restaurantId: string | null, filters: MetricsFilters) => {
  const [data, setData] = useState<MetricsOverview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { startDate, endDate, categoryId, tableId } = filters;

  const load = useCallback(async () => {
    if (!restaurantId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchMetricsOverview(restaurantId, {
        startDate,
        endDate,
        categoryId,
        tableId,
      });
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar as métricas.");
    } finally {
      setLoading(false);
    }
  }, [restaurantId, startDate, endDate, categoryId, tableId]);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, loading, error, reload: load };
};
