import { useState, useEffect, useCallback } from "react";
import { Product } from "@/types";
import { supabase } from "@/lib/supabase";
import { formatProductFromSupabase } from "@/utils/formatProductFromSupabase";
import { toast } from "@/components/ui/sonner";

export const useProdutos = (restaurantId: string) => {
  const [produtos, setProdutos] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  // ✅ Estados de loading independentes por operação
  const [operationsLoading, setOperationsLoading] = useState({
    fetching: false,
    adding: false,
    updating: false,
    deleting: false
  });

  const fetchProdutos = useCallback(async () => {
    setOperationsLoading(prev => ({ ...prev, fetching: true }));

    if (!restaurantId) {
      setProdutos([]);
      setLoading(false);
      setOperationsLoading(prev => ({ ...prev, fetching: false }));
      return;
    }

    try {
      const { data, error } = await supabase
        .from("products")
        .select(
          `
          id,
          name,
          description,
          price,
          available,
          image_url,
          restaurant_id,
          category:categories!products_category_id_fkey (
            id,
            name,
            restaurant_id
          )
        `
        )
        .eq("restaurant_id", restaurantId)
        .order('created_at', { ascending: false }); // ✅ Ordenar por mais recentes

      if (error) {
        console.error("Erro ao buscar produtos:", error);
        toast.error("Erro ao carregar produtos");
        setProdutos([]);
      } else if (data) {
        setProdutos(formatProductFromSupabase(data));
      } else {
        setProdutos([]);
      }
    } catch (err) {
      console.error("Erro ao buscar produtos:", err);
      toast.error("Erro inesperado ao carregar produtos");
      setProdutos([]);
    } finally {
      setLoading(false);
      setOperationsLoading(prev => ({ ...prev, fetching: false }));
    }
  }, [restaurantId]);

  const adicionarProduto = async (novoProduto: Partial<Product>) => {
    // Validações
    const errors: string[] = [];
    
    if (!novoProduto.name?.trim()) {
      errors.push("Nome do produto é obrigatório");
    }
    
    if (!novoProduto.description?.trim()) {
      errors.push("Descrição do produto é obrigatória");
    }
    
    if (novoProduto.price === undefined || novoProduto.price === null) {
      errors.push("Preço do produto é obrigatório");
    } else if (novoProduto.price <= 0) {
      errors.push("Preço deve ser maior que zero");
    }
    
    if (errors.length > 0) {
      errors.forEach(error => toast.error(error));
      return false;
    }

    try {
      setOperationsLoading(prev => ({ ...prev, adding: true })); // ✅ Loading específico
      
      const { data, error } = await supabase
        .from("products")
        .insert({
          name: novoProduto.name!.trim(),
          description: novoProduto.description?.trim() ?? "",
          price: Number(novoProduto.price),
          category_id: novoProduto.category?.id,
          available: novoProduto.available ?? true,
          image_url: novoProduto.image_url || null,
          restaurant_id: restaurantId
        })
        .select(`
          id,
          name,
          description,
          price,
          available,
          image_url,
          restaurant_id,
          category:categories!products_category_id_fkey (
            id,
            name,
            restaurant_id
          )
        `);
      
      if (error) {
        console.error("Erro ao adicionar produto:", error);
        
        if (error.code === '23505') {
          toast.error("Já existe um produto com esse nome");
        } else if (error.code === '23503') {
          toast.error("Categoria não encontrada");
        } else {
          toast.error("Erro ao adicionar produto");
        }
        
        return false;
      }
      
      const novosProdutos = formatProductFromSupabase(data);
      setProdutos((prev) => [novosProdutos[0], ...prev]); // ✅ Adicionar no início
      toast.success("Produto adicionado com sucesso!");
      return true;
      
    } catch (error) {
      console.error("Erro ao adicionar produto:", error);
      toast.error("Erro inesperado ao adicionar produto");
      return false;
    } finally {
      setOperationsLoading(prev => ({ ...prev, adding: false }));
    }
  };

  const atualizarProduto = async (produtoAtualizado: Product) => {
    // Validações
    const errors: string[] = [];
    
    if (!produtoAtualizado.name?.trim()) {
      errors.push("Nome do produto é obrigatório");
    }
    
    if (!produtoAtualizado.description?.trim()) {
      errors.push("Descrição do produto é obrigatória");
    }
    
    if (produtoAtualizado.price === undefined || produtoAtualizado.price === null) {
      errors.push("Preço do produto é obrigatório");
    } else if (produtoAtualizado.price <= 0) {
      errors.push("Preço deve ser maior que zero");
    }
    
    if (errors.length > 0) {
      errors.forEach(error => toast.error(error));
      return false;
    }

    try {
      setOperationsLoading(prev => ({ ...prev, updating: true })); // ✅ Loading específico
      
      const { error } = await supabase
        .from("products")
        .update({
          name: produtoAtualizado.name.trim(),
          description: produtoAtualizado.description.trim(),
          price: Number(produtoAtualizado.price),
          category_id: produtoAtualizado.category?.id,
          available: produtoAtualizado.available,
          image_url: produtoAtualizado.image_url || null,
          updated_at: new Date().toISOString()
        })
        .eq("id", produtoAtualizado.id);
      
      if (error) {
        console.error("Erro ao atualizar produto:", error);
        
        if (error.code === '23505') {
          toast.error("Já existe um produto com esse nome");
        } else if (error.code === '23503') {
          toast.error("Categoria não encontrada");
        } else {
          toast.error("Erro ao atualizar produto");
        }
        
        return false;
      }
      
      setProdutos(
        produtos.map((p) => (p.id === produtoAtualizado.id ? produtoAtualizado : p))
      );
      toast.success("Produto atualizado com sucesso!");
      return true;
      
    } catch (error) {
      console.error("Erro ao atualizar produto:", error);
      toast.error("Erro inesperado ao atualizar produto");
      return false;
    } finally {
      setOperationsLoading(prev => ({ ...prev, updating: false }));
    }
  };

  const removerProduto = async (id: string) => {
    try {
      setOperationsLoading(prev => ({ ...prev, deleting: true })); // ✅ Loading específico
      
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", id);
      
      if (error) {
        console.error("Erro ao remover produto:", error);
        
        // ✅ Verificar se o produto está sendo usado em pedidos
        if (error.code === '23503') {
          toast.error("Não é possível remover: produto está em uso em pedidos");
        } else {
          toast.error("Erro ao remover produto");
        }
        
        return false;
      }
      
      setProdutos(produtos.filter((p) => p.id !== id));
      toast.success("Produto removido com sucesso!");
      return true;
      
    } catch (error) {
      console.error("Erro ao remover produto:", error);
      toast.error("Erro inesperado ao remover produto");
      return false;
    } finally {
      setOperationsLoading(prev => ({ ...prev, deleting: false }));
    }
  };

  useEffect(() => {
    fetchProdutos();
  }, [restaurantId, fetchProdutos]);

  // ✅ Retornar estados de loading individuais
  return {
    produtos,
    loading,
    isAdding: operationsLoading.adding,
    isUpdating: operationsLoading.updating,
    isDeleting: operationsLoading.deleting,
    isFetching: operationsLoading.fetching,
    adicionarProduto,
    atualizarProduto,
    removerProduto,
    fetchProdutos
  };
};
