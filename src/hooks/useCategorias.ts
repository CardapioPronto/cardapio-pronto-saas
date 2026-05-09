
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Category } from "@/types";
import { toast } from "@/components/ui/sonner-toast";
import { useCurrentUser } from "@/hooks/useCurrentUser";

export function useCategorias() {
  const [categorias, setCategorias] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useCurrentUser();
  const restaurantId = user?.restaurant_id ?? "";

  const fetchCategorias = useCallback(async () => {
    if (!restaurantId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .order("name");

    if (error) {
      console.error("Erro ao buscar categorias:", error);
      toast.error("Erro ao carregar categorias");
    } else {
      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select("category_id")
        .eq("restaurant_id", restaurantId)
        .not("category_id", "is", null);

      if (productsError) {
        console.error("Erro ao buscar produtos por categoria:", productsError);
      }

      const productCountByCategory = (productsData ?? []).reduce<Record<string, number>>(
        (acc, product) => {
          if (product.category_id) {
            acc[product.category_id] = (acc[product.category_id] ?? 0) + 1;
          }
          return acc;
        },
        {}
      );

      setCategorias(
        (data as Category[]).map((category) => ({
          ...category,
          products_count: productCountByCategory[category.id] ?? 0,
        }))
      );
    }
    setLoading(false);
  }, [restaurantId]);

  const adicionarCategoria = async (name: string): Promise<boolean> => {
    const normalizedName = name.trim();

    if (!normalizedName) {
      toast.error("O nome da categoria é obrigatório");
      return false;
    }

    if (!restaurantId) {
      toast.error("Restaurante não identificado");
      return false;
    }

    if (categorias.some((cat) => cat.name.trim().toLowerCase() === normalizedName.toLowerCase())) {
      toast.error("Já existe uma categoria com esse nome");
      return false;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("categories")
        .insert({
          name: normalizedName,
          restaurant_id: restaurantId
        })
        .select();

      if (error) {
        console.error("Erro ao adicionar categoria:", error);
        toast.error("Erro ao adicionar categoria");
        setLoading(false);
        return false;
      } else {
        setCategorias((prev) =>
          [...prev, ...(data as Category[]).map((category) => ({ ...category, products_count: 0 }))]
            .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
        );
        toast.success("Categoria adicionada com sucesso!");
        setLoading(false);
        return true;
      }
    } catch (error) {
      console.error("Erro ao adicionar categoria:", error);
      toast.error("Erro ao adicionar categoria");
      setLoading(false);
      return false;
    }
  };

  const editarCategoria = async (id: string, name: string): Promise<boolean> => {
    const normalizedName = name.trim();

    if (!normalizedName) {
      toast.error("O nome da categoria é obrigatório");
      return false;
    }

    if (
      categorias.some(
        (cat) =>
          cat.id !== id &&
          cat.name.trim().toLowerCase() === normalizedName.toLowerCase()
      )
    ) {
      toast.error("Já existe uma categoria com esse nome");
      return false;
    }

    try {
      setLoading(true);
      const { error } = await supabase
        .from("categories")
        .update({ name: normalizedName, updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("restaurant_id", restaurantId);

      if (error) {
        console.error("Erro ao editar categoria:", error);
        toast.error("Erro ao editar categoria");
        setLoading(false);
        return false;
      } else {
        setCategorias((prev) =>
          prev
            .map((cat) => (cat.id === id ? { ...cat, name: normalizedName } : cat))
            .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
        );
        toast.success("Categoria atualizada com sucesso!");
        setLoading(false);
        return true;
      }
    } catch (error) {
      console.error("Erro ao editar categoria:", error);
      toast.error("Erro ao editar categoria");
      setLoading(false);
      return false;
    }
  };

  const excluirCategoria = async (id: string): Promise<boolean> => {
    const categoria = categorias.find((cat) => cat.id === id);

    if ((categoria?.products_count ?? 0) > 0) {
      toast.error("Mova ou exclua os produtos dessa categoria antes de removê-la");
      return false;
    }

    try {
      setLoading(true);
      const { error } = await supabase
        .from("categories")
        .delete()
        .eq("id", id)
        .eq("restaurant_id", restaurantId);

      if (error) {
        console.error("Erro ao excluir categoria:", error);
        toast.error("Erro ao excluir categoria");
        setLoading(false);
        return false;
      } else {
        setCategorias((prev) => prev.filter((cat) => cat.id !== id));
        toast.success("Categoria excluída com sucesso!");
        setLoading(false);
        return true;
      }
    } catch (error) {
      console.error("Erro ao excluir categoria:", error);
      toast.error("Erro ao excluir categoria");
      setLoading(false);
      return false;
    }
  };

  useEffect(() => {
    if (restaurantId) {
      fetchCategorias();
    }
  }, [restaurantId, fetchCategorias]);

  return {
    categorias,
    loading,
    fetchCategorias,
    adicionarCategoria,
    editarCategoria,
    excluirCategoria,
  };
}
