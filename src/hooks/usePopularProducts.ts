
import { useCallback, useState } from "react";
import { getPopularProducts, PopularProduct } from "@/services/dashboardService";

export const usePopularProducts = () => {
  const [popularProducts, setPopularProducts] = useState<PopularProduct[]>([]);

  const loadPopularProducts = useCallback(async (restaurantId: string, includeFinancials = false) => {
    try {
      const products = await getPopularProducts(restaurantId, includeFinancials);
      setPopularProducts(products);
    } catch (error) {
      console.error("Erro ao carregar produtos populares:", error);
      setPopularProducts([]);
    }
  }, []);

  return { popularProducts, loadPopularProducts };
};
