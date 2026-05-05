
import { useEffect, useState } from "react";
import { DashboardOverview, getDashboardOverview, getDashboardStats } from "@/services/dashboardService";
import { useStatsData } from "./useStatsData";
import { useRecentSales } from "./useRecentSales";
import { usePopularProducts } from "./usePopularProducts";

export const useDashboardData = (restaurantId: string | null, canViewFinancials = false) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
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
        const [statsData, overviewData] = await Promise.all([
          getDashboardStats(restaurantId, canViewFinancials),
          getDashboardOverview(restaurantId),
          loadRecentSales(restaurantId, canViewFinancials),
          loadPopularProducts(restaurantId, canViewFinancials),
        ]);
        updateStats(statsData, canViewFinancials);
        setOverview(overviewData);
      } catch (error) {
        console.error("Erro ao buscar dados do dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [restaurantId, canViewFinancials]);

  return { stats, loading, recentSales, popularProducts, overview };
};
