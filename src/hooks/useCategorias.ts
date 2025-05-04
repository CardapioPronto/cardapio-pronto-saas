
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Category } from "@/types";
import { toast } from "@/components/ui/sonner";
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
      setCategorias(data as Category[]);
    }
    setLoading(false);
  }, [restaurantId]);

  const adicionarCategoria = async (name: string): Promise<boolean> => {
    if (!name.trim()) {
      toast.error("O nome da categoria é obrigatório");
      return false;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("categories")
        .insert({
          name,
          restaurant_id: restaurantId
        })
        .select();

      if (error) {
        console.error("Erro ao adicionar categoria:", error);
        toast.error("Erro ao adicionar categoria");
        setLoading(false);
        return false;
      } else {
        setCategorias((prev) => [...prev, ...(data as Category[])]);
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
    if (!name.trim()) {
      toast.error("O nome da categoria é obrigatório");
      return false;
    }

    try {
      setLoading(true);
      const { error } = await supabase
        .from("categories")
        .update({ name })
        .eq("id", id)
        .eq("restaurant_id", restaurantId);

      if (error) {
        console.error("Erro ao editar categoria:", error);
        toast.error("Erro ao editar categoria");
        setLoading(false);
        return false;
      } else {
        setCategorias(
          categorias.map((cat) => (cat.id === id ? { ...cat, name } : cat))
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
        setCategorias(categorias.filter((cat) => cat.id !== id));
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
