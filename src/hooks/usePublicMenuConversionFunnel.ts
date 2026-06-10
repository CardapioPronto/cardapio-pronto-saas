import { useCallback, useEffect, useState } from "react";
import {
  getPublicMenuConversionFunnel,
  type PublicMenuConversionFunnel,
} from "@/services/publicMenuAnalyticsService";

type Params = {
  dateFrom: Date;
  dateTo: Date;
};

export const usePublicMenuConversionFunnel = ({ dateFrom, dateTo }: Params) => {
  const [data, setData] = useState<PublicMenuConversionFunnel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await getPublicMenuConversionFunnel(dateFrom, dateTo);
      setData(result);
    } catch (err) {
      console.error("Erro ao carregar funil do cardápio:", err);
      setError(err instanceof Error ? err.message : "Erro ao carregar funil do cardápio.");
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { data, loading, error, refetch };
};
