
import { useCallback, useState } from "react";
import { getRecentSales, RecentSale } from "@/services/dashboardService";

export const useRecentSales = () => {
  const [recentSales, setRecentSales] = useState<RecentSale[]>([]);

  const loadRecentSales = useCallback(async (restaurantId: string, includeFinancials = false) => {
    try {
      const sales = await getRecentSales(restaurantId, includeFinancials);
      setRecentSales(sales);
    } catch (error) {
      console.error("Erro ao carregar vendas recentes:", error);
      setRecentSales([]);
    }
  }, []);

  return { recentSales, loadRecentSales };
};
