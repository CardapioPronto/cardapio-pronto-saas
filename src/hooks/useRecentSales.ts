
import { useState } from "react";
import { fetchRecentSales } from "@/services/dashboardService";

interface SaleItem {
  id: number;
  table: number;
  commandaNumber: string;
  time: string;
  value: number;
}

export const useRecentSales = () => {
  const [recentSales, setRecentSales] = useState<SaleItem[]>([]);

  const loadRecentSales = async (restaurantId: string) => {
    const sales = await fetchRecentSales(restaurantId);
    setRecentSales(sales);
  };

  return { recentSales, loadRecentSales };
};
