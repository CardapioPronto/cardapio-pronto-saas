
import { useEffect, useState } from "react";
import { getDashboardStats } from "@/services/dashboardService";
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

    const fetchDashboardData = async () => {
      setLoading(true);
      
      try {
        const statsData = await getDashboardStats();
        updateStats(statsData);
        
        await loadRecentSales();
        await loadPopularProducts();
      } catch (error) {
        console.error("Erro ao buscar dados do dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [restaurantId, loadRecentSales, loadPopularProducts, updateStats]);

  return { stats, loading, recentSales, popularProducts };
};
