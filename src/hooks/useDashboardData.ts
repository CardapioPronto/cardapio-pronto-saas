
import { useEffect, useState } from "react";
import { fetchOrdersData } from "@/services/dashboardService";
import { useStatsData } from "./useStatsData";
import { useRecentSales } from "./useRecentSales";
import { usePopularProducts } from "./usePopularProducts";

export const useDashboardData = (restaurantId: string | null) => {
  const [loading, setLoading] = useState<boolean>(true);
  const { stats, updateStats } = useStatsData();
  const { recentSales, loadRecentSales } = useRecentSales();
  const { popularProducts, loadPopularProducts } = usePopularProducts();

  useEffect(() => {
    if (!restaurantId) {
      setLoading(false);
      return;
    }

    const fetchStats = async () => {
      setLoading(true);
      
      try {
        const ordersData = await fetchOrdersData(restaurantId);
        updateStats(ordersData);
        
        await loadRecentSales(restaurantId);
        await loadPopularProducts(restaurantId);
      } catch (error) {
        console.error("Erro ao buscar dados do dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [restaurantId]);

  return { stats, loading, recentSales, popularProducts };
};
