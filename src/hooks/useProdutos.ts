
import { useState, useEffect } from "react";
import { Product } from "@/types";
import { supabase } from "@/lib/supabase";
import { formatProductFromSupabase } from "@/utils/formatProductFromSupabase";
import { toast } from "@/components/ui/sonner";

export const useProdutos = (restaurantId: string) => {
  const [produtos, setProdutos] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  const fetchProdutos = async () => {
    setLoading(true);

    if (!restaurantId) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("products")
      .select(
        `
        id,
        name,
        description,
        price,
        available,
        restaurant_id,
        category:categories!products_category_id_fkey (
          id,
          name,
          restaurant_id
        )
      `
      )
      .eq("restaurant_id", restaurantId);

    if (error) {
      console.error("Erro ao buscar produtos:", error);
    } else {
      setProdutos(formatProductFromSupabase(data));
    }

    setLoading(false);
  };

  const adicionarProduto = async (novoProduto: Partial<Product>) => {
    if (!novoProduto.name || !novoProduto.description || !(novoProduto.price && novoProduto.price > 0)) {
      toast.error("Preencha todos os campos obrigatórios");
      return false;
    }

    try {
      // Fix TypeScript error by ensuring price is a number
      const { data, error } = await supabase
        .from("products")
        .insert({
          name: novoProduto.name,
          description: novoProduto.description,
          price: novoProduto.price,
          category_id: novoProduto.category?.id,
          available: novoProduto.available ?? true,
          restaurant_id: restaurantId
        })
        .select(`
          id,
          name,
          description,
          price,
          available,
          restaurant_id,
          category:categories!products_category_id_fkey (
            id,
            name,
            restaurant_id
          )
        `);
      
      if (error) {
        console.error("Erro ao adicionar produto:", error);
        toast.error("Erro ao adicionar produto");
        return false;
      } else {
        const novosProdutos = formatProductFromSupabase(data);
        setProdutos([...produtos, ...novosProdutos]);
        toast.success("Produto adicionado com sucesso!");
        return true;
      }
    } catch (error) {
      console.error("Erro ao adicionar produto:", error);
      toast.error("Erro ao adicionar produto");
      return false;
    }
  };

  const atualizarProduto = async (produtoAtualizado: Product) => {
    try {
      const { error } = await supabase
        .from("products")
        .update({
          name: produtoAtualizado.name,
          description: produtoAtualizado.description,
          price: produtoAtualizado.price,
          category_id: produtoAtualizado.category?.id,
          available: produtoAtualizado.available
        })
        .eq("id", produtoAtualizado.id);
      
      if (error) {
        console.error("Erro ao atualizar produto:", error);
        toast.error("Erro ao atualizar produto");
        return false;
      } else {
        setProdutos(
          produtos.map((p) => (p.id === produtoAtualizado.id ? produtoAtualizado : p))
        );
        toast.success("Produto atualizado com sucesso!");
        return true;
      }
    } catch (error) {
      console.error("Erro ao atualizar produto:", error);
      toast.error("Erro ao atualizar produto");
      return false;
    }
  };

  const removerProduto = async (id: string) => {
    try {
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", id);
      
      if (error) {
        console.error("Erro ao remover produto:", error);
        toast.error("Erro ao remover produto");
        return false;
      } else {
        setProdutos(produtos.filter((p) => p.id !== id));
        toast.success("Produto removido com sucesso!");
        return true;
      }
    } catch (error) {
      console.error("Erro ao remover produto:", error);
      toast.error("Erro ao remover produto");
      return false;
    }
  };

  useEffect(() => {
    if (restaurantId) {
      fetchProdutos();
    }
  }, [restaurantId]);

  return {
    produtos,
    loading,
    adicionarProduto,
    atualizarProduto,
    removerProduto,
    fetchProdutos
  };
};
