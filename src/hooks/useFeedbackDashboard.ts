import { useCallback, useEffect, useState } from "react";
import { endOfDay, startOfDay } from "date-fns";
import { assertMaxReportRange } from "@/lib/reportLimits";
import {
  orderFeedbackService,
  type FeedbackDashboardData,
} from "@/services/orderFeedbackService";

type FeedbackDashboardParams = {
  dateFrom: Date;
  dateTo: Date;
};

export const useFeedbackDashboard = ({ dateFrom, dateTo }: FeedbackDashboardParams) => {
  const [data, setData] = useState<FeedbackDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const from = startOfDay(dateFrom);
      const to = endOfDay(dateTo);
      if (from > to) throw new Error("A data inicial não pode ser maior que a data final.");
      assertMaxReportRange(from, to);

      const result = await orderFeedbackService.getDashboard({
        dateFrom: from,
        dateTo: to,
      });
      setData(result);
    } catch (err) {
      console.error("Erro ao carregar avaliacoes:", err);
      setError(err instanceof Error ? err.message : "Erro ao carregar avaliacoes.");
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return {
    data,
    loading,
    error,
    refetch,
  };
};
