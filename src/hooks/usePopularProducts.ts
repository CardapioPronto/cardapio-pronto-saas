
import { useState } from "react";
import { fetchPopularProducts } from "@/services/dashboardService";

interface PopularProduct {
  id: number;
  name: string;
  popularity: number;
  units: number;
}

export const usePopularProducts = () => {
  const [popularProducts, setPopularProducts] = useState<PopularProduct[]>([]);

  const loadPopularProducts = async (restaurantId: string) => {
    const products = await fetchPopularProducts(restaurantId);
    setPopularProducts(products);
  };

  return { popularProducts, loadPopularProducts };
};
