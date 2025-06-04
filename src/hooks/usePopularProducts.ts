
import { useState } from "react";
import { getPopularProducts, PopularProduct } from "@/services/dashboardService";

export const usePopularProducts = () => {
  const [popularProducts, setPopularProducts] = useState<PopularProduct[]>([]);

  const loadPopularProducts = async () => {
    try {
      const products = await getPopularProducts();
      setPopularProducts(products);
    } catch (error) {
      console.error("Erro ao carregar produtos populares:", error);
      setPopularProducts([]);
    }
  };

  return { popularProducts, loadPopularProducts };
};
