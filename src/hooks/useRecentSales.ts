
import { useState } from "react";
import { getRecentSales, RecentSale } from "@/services/dashboardService";

export const useRecentSales = () => {
  const [recentSales, setRecentSales] = useState<RecentSale[]>([]);

  const loadRecentSales = async () => {
    try {
      const sales = await getRecentSales();
      setRecentSales(sales);
    } catch (error) {
      console.error("Erro ao carregar vendas recentes:", error);
      setRecentSales([]);
    }
  };

  return { recentSales, loadRecentSales };
};
