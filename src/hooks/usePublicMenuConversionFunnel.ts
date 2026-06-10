import { useCallback, useEffect, useState } from "react";
import {
  getPublicMenuConversionFunnelComparison,
  type PublicMenuConversionComparison,
  type PublicMenuConversionFunnel,
} from "@/services/publicMenuAnalyticsService";

type Params = {
  dateFrom: Date;
  dateTo: Date;
};

export const usePublicMenuConversionFunnel = ({ dateFrom, dateTo }: Params) => {
  const [data, setData] = useState<PublicMenuConversionFunnel | null>(null);
  const [comparison, setComparison] = useState<PublicMenuConversionComparison | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await getPublicMenuConversionFunnelComparison(dateFrom, dateTo);
      setData(result.current);
      setComparison(result);
    } catch (err) {
      console.error("Erro ao carregar funil do cardápio:", err);
      setError(err instanceof Error ? err.message : "Erro ao carregar funil do cardápio.");
      setComparison(null);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { data, comparison, loading, error, refetch };
};
