import { useState, useEffect, useCallback, useRef } from "react";
import { Product } from "@/types";
import { supabase } from "@/lib/supabase";
import { formatProductFromSupabase } from "@/utils/formatProductFromSupabase";
import { toast } from "@/components/ui/sonner-toast";

export type ProdutosTab = "todos" | "disponiveis" | "indisponiveis" | "sem-imagem" | "sem-categoria" | "baixo-estoque";
export type ProdutosSortKey = "created_at" | "name" | "price" | "category" | "available";
export type ProdutosSortDirection = "asc" | "desc";

export interface ProdutosIndicadores {
  total: number;
  disponiveis: number;
  indisponiveis: number;
  semImagem: number;
  baixoEstoque: number;
}

interface UseProdutosOptions {
  busca?: string;
  categoriaId?: string | null;
  tab?: ProdutosTab;
  pagina?: number;
  itensPorPagina?: number;
  sortKey?: ProdutosSortKey;
  sortDirection?: ProdutosSortDirection;
}

const PRODUCT_SELECT = `
  id,
  name,
  description,
  price,
  available,
  image_url,
  image_storage_path,
  image_uploaded_by,
  image_uploaded_at,
  created_by,
  updated_by,
  restaurant_id,
  created_at,
  updated_at,
  stock_tracking_enabled,
  stock_quantity,
  stock_min_quantity,
  stock_is_fractional,
  category:categories!products_category_id_fkey (
    id,
    name,
    restaurant_id
  )
`;

const LEGACY_PRODUCT_SELECT = `
  id,
  name,
  description,
  price,
  available,
  image_url,
  restaurant_id,
  created_at,
  updated_at,
  category:categories!products_category_id_fkey (
    id,
    name,
    restaurant_id
  )
`;

const isMissingColumnError = (error: unknown) =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  (error as { code?: string }).code === "42703";

const getCurrentUserId = async () => {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
};

const getStoragePathFromUrl = (imageUrl?: string | null, storagePath?: string | null) => {
  if (storagePath) return storagePath;
  if (!imageUrl) return null;

  try {
    const urlObj = new URL(imageUrl);
    const pathParts = urlObj.pathname.split("/");
    const bucketIndex = pathParts.findIndex((part) => part === "product-images");
    if (bucketIndex >= 0) {
      return pathParts.slice(bucketIndex + 1).join("/");
    }
    return pathParts.slice(-2).join("/");
  } catch {
    return null;
  }
};

const removeProductImage = async (imageUrl?: string | null, storagePath?: string | null) => {
  const path = getStoragePathFromUrl(imageUrl, storagePath);
  if (!path) return;

  const { error } = await supabase.storage.from("product-images").remove([path]);
  if (error) {
    console.error("Erro ao remover imagem do produto:", error);
  }
};

const sanitizeSearch = (value: string) =>
  value.replace(/[%_,()]/g, " ").trim();

const isLowStockProduct = (product: Product) => {
  if (!product.stock_tracking_enabled) return false;

  const quantity = product.stock_quantity ?? 0;
  const minimum = product.stock_min_quantity ?? null;

  return quantity <= 0 || (minimum !== null && quantity <= minimum);
};

const isLowStockRow = (row: {
  stock_tracking_enabled?: boolean | null;
  stock_quantity?: number | null;
  stock_min_quantity?: number | null;
}) => {
  if (!row.stock_tracking_enabled) return false;

  const quantity = Number(row.stock_quantity ?? 0);
  const minimum = row.stock_min_quantity ?? null;

  return quantity <= 0 || (minimum !== null && quantity <= Number(minimum));
};

const withProductAuditFields = <T extends Record<string, unknown>>(
  payload: T,
  auditFieldsAvailable: boolean,
) => {
  if (auditFieldsAvailable) return payload;

  const {
    image_storage_path: _imageStoragePath,
    image_uploaded_by: _imageUploadedBy,
    image_uploaded_at: _imageUploadedAt,
    created_by: _createdBy,
    updated_by: _updatedBy,
    // Estoque: colunas mais recentes que as de auditoria, então quando o
    // ambiente é legado o fallback precisa removê-las também.
    stock_tracking_enabled: _stockTrackingEnabled,
    stock_quantity: _stockQuantity,
    stock_min_quantity: _stockMinQuantity,
    stock_is_fractional: _stockIsFractional,
    ...legacyPayload
  } = payload;

  return legacyPayload;
};

type FilterValue = string | number | boolean | null;
type ProductFilterQuery<T> = {
  eq(column: string, value: FilterValue): T;
  or(filters: string): T;
};

export const useProdutos = (restaurantId: string, options: UseProdutosOptions = {}) => {
  const [produtos, setProdutos] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [indicadores, setIndicadores] = useState<ProdutosIndicadores>({
    total: 0,
    disponiveis: 0,
    indisponiveis: 0,
    semImagem: 0,
    baixoEstoque: 0,
  });
  const productAuditColumnsAvailableRef = useRef(true);
  
  // ✅ Estados de loading independentes por operação
  const [operationsLoading, setOperationsLoading] = useState({
    fetching: false,
    adding: false,
    updating: false,
    deleting: false,
    bulkUpdating: false
  });

  const applyCommonFilters = useCallback(<T extends ProductFilterQuery<T>>(query: T) => {
    const busca = sanitizeSearch(options.busca || "");
    let nextQuery = query.eq("restaurant_id", restaurantId);

    if (busca) {
      nextQuery = nextQuery.or(`name.ilike.%${busca}%,description.ilike.%${busca}%`);
    }

    if (options.categoriaId) {
      nextQuery = nextQuery.eq("category_id", options.categoriaId);
    }

    return nextQuery;
  }, [restaurantId, options.busca, options.categoriaId]);

  const fetchIndicadores = useCallback(async () => {
    if (!restaurantId) {
      setIndicadores({ total: 0, disponiveis: 0, indisponiveis: 0, semImagem: 0, baixoEstoque: 0 });
      return;
    }

    type LowStockQueryResult = {
      data: Array<{
        id: string;
        stock_tracking_enabled: boolean | null;
        stock_quantity: number | null;
        stock_min_quantity: number | null;
      }> | null;
      error: unknown;
    };
    interface LowStockQuery extends ProductFilterQuery<LowStockQuery>, PromiseLike<LowStockQueryResult> {}

    const makeCountQuery = () => applyCommonFilters(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      supabase.from("products").select("id", { count: "exact", head: true }) as any
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ) as any;

    const [
      totalResult,
      disponiveisResult,
      indisponiveisResult,
      semImagemResult,
      baixoEstoqueResult,
    ] = await Promise.all([
      makeCountQuery(),
      makeCountQuery().eq("available", true),
      makeCountQuery().eq("available", false),
      makeCountQuery().or("image_url.is.null,image_url.eq."),
      applyCommonFilters(
        supabase
          .from("products")
          .select("id, stock_tracking_enabled, stock_quantity, stock_min_quantity") as unknown as LowStockQuery
      ),
    ]);

    const countError = totalResult.error || disponiveisResult.error || indisponiveisResult.error || semImagemResult.error;
    if (countError) {
      console.error("Erro ao buscar indicadores de produtos:", countError);
      return;
    }

    setIndicadores({
      total: totalResult.count || 0,
      disponiveis: disponiveisResult.count || 0,
      indisponiveis: indisponiveisResult.count || 0,
      semImagem: semImagemResult.count || 0,
      baixoEstoque: baixoEstoqueResult.error
        ? 0
        : (baixoEstoqueResult.data || []).filter(isLowStockRow).length,
    });
  }, [restaurantId, applyCommonFilters]);

  const fetchProdutos = useCallback(async () => {
    setLoading(true);
    setOperationsLoading(prev => ({ ...prev, fetching: true }));

    if (!restaurantId) {
      setProdutos([]);
      setTotal(0);
      setLoading(false);
      setOperationsLoading(prev => ({ ...prev, fetching: false }));
      return;
    }

    try {
      const pagina = Math.max(1, options.pagina || 1);
      const itensPorPagina = Math.max(1, options.itensPorPagina || 10);
      const from = (pagina - 1) * itensPorPagina;
      const to = from + itensPorPagina - 1;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const buildQuery = (selectClause: string, withRange = true): any => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let nextQuery: any = supabase
          .from("products")
          .select(selectClause, { count: "exact" });

        nextQuery = applyCommonFilters(nextQuery);
        if (options.tab === "disponiveis") {
          nextQuery = nextQuery.eq("available", true);
        } else if (options.tab === "indisponiveis") {
          nextQuery = nextQuery.eq("available", false);
        } else if (options.tab === "sem-imagem") {
          nextQuery = nextQuery.or("image_url.is.null,image_url.eq.");
        } else if (options.tab === "sem-categoria") {
          nextQuery = nextQuery.is("category_id", null);
        }

        const sortKey = options.sortKey || "created_at";
        const sortDirection = options.sortDirection || "desc";
        const ascending = sortDirection === "asc";

        if (sortKey === "category") {
          nextQuery = nextQuery.order("name", { foreignTable: "categories", ascending, nullsFirst: false });
        } else {
          nextQuery = nextQuery.order(sortKey, { ascending, nullsFirst: false });
        }

        return withRange ? nextQuery.range(from, to) : nextQuery;
      };

      const isLowStockTab = options.tab === "baixo-estoque";
      let { data, error, count } = await buildQuery(
        productAuditColumnsAvailableRef.current ? PRODUCT_SELECT : LEGACY_PRODUCT_SELECT,
        !isLowStockTab,
      );

      if (error && isMissingColumnError(error)) {
        productAuditColumnsAvailableRef.current = false;
        ({ data, error, count } = await buildQuery(LEGACY_PRODUCT_SELECT, !isLowStockTab));
      }

      if (error) {
        console.error("Erro ao buscar produtos:", error);
        toast.error("Erro ao carregar produtos");
        setProdutos([]);
        setTotal(0);
      } else if (data) {
        const formattedProducts = formatProductFromSupabase(data as never);
        if (isLowStockTab) {
          const lowStockProducts = formattedProducts.filter(isLowStockProduct);
          setProdutos(lowStockProducts.slice(from, to + 1));
          setTotal(lowStockProducts.length);
        } else {
          setProdutos(formattedProducts);
          setTotal(count || 0);
        }
      } else {
        setProdutos([]);
        setTotal(0);
      }
      await fetchIndicadores();
    } catch (err) {
      console.error("Erro ao buscar produtos:", err);
      toast.error("Erro inesperado ao carregar produtos");
      setProdutos([]);
      setTotal(0);
    } finally {
      setLoading(false);
      setOperationsLoading(prev => ({ ...prev, fetching: false }));
    }
  }, [
    restaurantId,
    options.tab,
    options.pagina,
    options.itensPorPagina,
    options.sortKey,
    options.sortDirection,
    applyCommonFilters,
    fetchIndicadores,
  ]);

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

    if (!novoProduto.category?.id) {
      errors.push("Categoria do produto é obrigatória");
    }
    
    if (errors.length > 0) {
      errors.forEach(error => toast.error(error));
      return false;
    }

    try {
      setOperationsLoading(prev => ({ ...prev, adding: true })); // ✅ Loading específico
      const userId = await getCurrentUserId();

      const stockTrackingEnabled = Boolean(novoProduto.stock_tracking_enabled);
      const initialStockQuantity = stockTrackingEnabled
        ? Math.max(Number(novoProduto.stock_quantity ?? 0), 0)
        : 0;

      const payload = {
        name: novoProduto.name!.trim(),
        description: novoProduto.description?.trim() ?? "",
        price: Number(novoProduto.price),
        category_id: novoProduto.category?.id,
        available: novoProduto.available ?? true,
        image_url: novoProduto.image_url || null,
        image_storage_path: novoProduto.image_storage_path || null,
        image_uploaded_by: novoProduto.image_url ? userId : null,
        image_uploaded_at: novoProduto.image_url ? new Date().toISOString() : null,
        created_by: userId,
        updated_by: userId,
        restaurant_id: restaurantId,
        stock_tracking_enabled: stockTrackingEnabled,
        // Saldo nunca é gravado direto pela UI: a row entra com 0 e a
        // contagem inicial vai por adjust_stock logo abaixo (gera movimento auditável).
        stock_quantity: 0,
        stock_min_quantity: stockTrackingEnabled
          ? (novoProduto.stock_min_quantity ?? null)
          : null,
        stock_is_fractional: stockTrackingEnabled
          ? Boolean(novoProduto.stock_is_fractional)
          : false,
      };

      let { data: insertResult, error } = await supabase
        .from("products")
        .insert(withProductAuditFields(payload, productAuditColumnsAvailableRef.current))
        .select("id")
        .single();

      if (error && isMissingColumnError(error)) {
        productAuditColumnsAvailableRef.current = false;
        ({ data: insertResult, error } = await supabase
          .from("products")
          .insert(withProductAuditFields(payload, false))
          .select("id")
          .single());
      }
      
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

      // Estoque: se o produto nasce rastreado com saldo inicial > 0,
      // grava uma contagem inicial via RPC (movimento auditável).
      if (stockTrackingEnabled && initialStockQuantity > 0 && insertResult?.id) {
        const { error: stockError } = await supabase.rpc("adjust_stock", {
          p_args: {
            restaurant_id: restaurantId,
            product_id: insertResult.id,
            movement_type: "inventory_count",
            target_quantity: initialStockQuantity,
            reason: "Contagem inicial ao cadastrar produto",
          },
        });
        if (stockError) {
          console.error("Erro ao registrar contagem inicial de estoque:", stockError);
          toast.error(
            "Produto criado, mas falhou ao registrar a contagem inicial de estoque. Use Ajustar estoque para corrigir.",
          );
        }
      }

      await fetchProdutos();
      await fetchIndicadores();
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

    if (!produtoAtualizado.category?.id) {
      errors.push("Categoria do produto é obrigatória");
    }
    
    if (errors.length > 0) {
      errors.forEach(error => toast.error(error));
      return false;
    }

    try {
      setOperationsLoading(prev => ({ ...prev, updating: true })); // ✅ Loading específico
      const userId = await getCurrentUserId();
      const produtoAnterior = produtos.find((p) => p.id === produtoAtualizado.id);
      const imageChanged = produtoAnterior?.image_url !== produtoAtualizado.image_url;

      const stockTrackingEnabled = Boolean(produtoAtualizado.stock_tracking_enabled);

      const payload = {
        name: produtoAtualizado.name.trim(),
        description: produtoAtualizado.description.trim(),
        price: Number(produtoAtualizado.price),
        category_id: produtoAtualizado.category?.id,
        available: produtoAtualizado.available,
        image_url: produtoAtualizado.image_url || null,
        image_storage_path: produtoAtualizado.image_storage_path || null,
        image_uploaded_by: imageChanged && produtoAtualizado.image_url ? userId : produtoAtualizado.image_uploaded_by || null,
        image_uploaded_at: imageChanged && produtoAtualizado.image_url ? new Date().toISOString() : produtoAtualizado.image_uploaded_at || null,
        updated_by: userId,
        updated_at: new Date().toISOString(),
        stock_tracking_enabled: stockTrackingEnabled,
        // Saldo nunca é gravado pela UI — só por movimento de estoque.
        stock_min_quantity: stockTrackingEnabled
          ? (produtoAtualizado.stock_min_quantity ?? null)
          : null,
        stock_is_fractional: stockTrackingEnabled
          ? Boolean(produtoAtualizado.stock_is_fractional)
          : false,
      };

      let { error } = await supabase
        .from("products")
        .update(withProductAuditFields(payload, productAuditColumnsAvailableRef.current))
        .eq("id", produtoAtualizado.id)
        .eq("restaurant_id", restaurantId);

      if (error && isMissingColumnError(error)) {
        productAuditColumnsAvailableRef.current = false;
        ({ error } = await supabase
          .from("products")
          .update(withProductAuditFields(payload, false))
          .eq("id", produtoAtualizado.id)
          .eq("restaurant_id", restaurantId));
      }
      
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
      
      if (imageChanged && produtoAnterior?.image_url) {
        await removeProductImage(produtoAnterior.image_url, produtoAnterior.image_storage_path);
      }

      // Estoque: o produto está sendo ATIVADO agora (antes não rastreava)
      // e o usuário informou contagem inicial > 0. Trata igual à criação:
      // grava um inventory_count via RPC para deixar trilha auditável.
      const wasTrackingBefore = Boolean(produtoAnterior?.stock_tracking_enabled);
      const initialStockQuantity = Math.max(Number(produtoAtualizado.stock_quantity ?? 0), 0);
      if (
        stockTrackingEnabled
        && !wasTrackingBefore
        && initialStockQuantity > 0
      ) {
        const { error: stockError } = await supabase.rpc("adjust_stock", {
          p_args: {
            restaurant_id: restaurantId,
            product_id: produtoAtualizado.id,
            movement_type: "inventory_count",
            target_quantity: initialStockQuantity,
            reason: "Contagem inicial ao ativar controle de estoque",
          },
        });
        if (stockError) {
          console.error("Erro ao registrar contagem inicial de estoque:", stockError);
          toast.error(
            "Produto atualizado, mas falhou ao registrar a contagem inicial. Use Ajustar estoque para corrigir.",
          );
        }
      }

      await fetchProdutos();
      await fetchIndicadores();
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
      const produto = produtos.find((p) => p.id === id);
      
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", id)
        .eq("restaurant_id", restaurantId);
      
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
      
      if (produto?.image_url) {
        await removeProductImage(produto.image_url, produto.image_storage_path);
      }

      await fetchProdutos();
      await fetchIndicadores();
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

  const atualizarProdutosEmLote = async (
    ids: string[],
    changes: { available?: boolean; category_id?: string | null }
  ) => {
    if (ids.length === 0) {
      toast.error("Selecione ao menos um produto");
      return false;
    }

    try {
      setOperationsLoading(prev => ({ ...prev, bulkUpdating: true }));
      const userId = await getCurrentUserId();
      const payload = {
        ...changes,
        updated_by: userId,
        updated_at: new Date().toISOString(),
      };

      let { error } = await supabase
        .from("products")
        .update(withProductAuditFields(payload, productAuditColumnsAvailableRef.current))
        .eq("restaurant_id", restaurantId)
        .in("id", ids);

      if (error && isMissingColumnError(error)) {
        productAuditColumnsAvailableRef.current = false;
        ({ error } = await supabase
          .from("products")
          .update(withProductAuditFields(payload, false))
          .eq("restaurant_id", restaurantId)
          .in("id", ids));
      }

      if (error) {
        console.error("Erro ao atualizar produtos em lote:", error);
        toast.error("Erro ao atualizar produtos selecionados");
        return false;
      }

      await fetchProdutos();
      await fetchIndicadores();
      toast.success(`${ids.length} produto(s) atualizado(s)`);
      return true;
    } catch (error) {
      console.error("Erro ao atualizar produtos em lote:", error);
      toast.error("Erro inesperado ao atualizar produtos");
      return false;
    } finally {
      setOperationsLoading(prev => ({ ...prev, bulkUpdating: false }));
    }
  };

  useEffect(() => {
    fetchProdutos();
  }, [restaurantId, fetchProdutos]);

  // ✅ Retornar estados de loading individuais
  return {
    produtos,
    total,
    indicadores,
    loading,
    isAdding: operationsLoading.adding,
    isUpdating: operationsLoading.updating,
    isDeleting: operationsLoading.deleting,
    isFetching: operationsLoading.fetching,
    isBulkUpdating: operationsLoading.bulkUpdating,
    adicionarProduto,
    atualizarProduto,
    removerProduto,
    atualizarProdutosEmLote,
    fetchProdutos
  };
};
