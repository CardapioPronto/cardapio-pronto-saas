import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Category } from "@/types";

export function useCategorias(restaurantId: string, isOpen: boolean) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && restaurantId) {
      setLoading(true);
      supabase
        .from("categories")
        .select("id, name, restaurant_id")
        .eq("restaurant_id", restaurantId)
        .then(({ data, error }) => {
          if (error) {
            console.error("Erro ao carregar categorias:", error);
          } else {
            setCategories(
              (data || []).filter(
                (category): category is Category => category.restaurant_id !== null
              )
            );
          }
          setLoading(false);
        });
    }
  }, [isOpen, restaurantId]);

  return { categories, loading };
}
