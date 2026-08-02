
import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { ProdutosList } from "@/components/produtos/ProdutosList";
import { ProdutosFiltro } from "@/components/produtos/ProdutosFiltro";
import { AddProdutoDialog } from "@/components/produtos/AddProdutoDialog";
import { ImportarCardapioDialog } from "@/components/produtos/ImportarCardapioDialog";
import { SetupRapidoSegmentoDialog } from "@/components/produtos/SetupRapidoSegmentoDialog";
import { useStockSettings } from "@/hooks/useStockSettings";
import {
  ProdutosSortDirection,
  ProdutosSortKey,
  ProdutosTab,
  useProdutos,
} from "@/hooks/useProdutos";
import { ChartBarStacked } from "lucide-react";
import { Link } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { useCategorias } from "@/hooks/useCategorias";
import { usePermissionsV2 } from "@/hooks/usePermissionsV2";

const ITENS_POR_PAGINA = 10;

const tabs: Array<{ value: ProdutosTab; label: string }> = [
  { value: "todos", label: "Todos" },
  { value: "disponiveis", label: "Disponíveis" },
  { value: "indisponiveis", label: "Indisponíveis" },
  { value: "baixo-estoque", label: "Baixo estoque" },
  { value: "sem-imagem", label: "Sem imagem" },
  { value: "sem-categoria", label: "Sem categoria" },
];

const sortOptions: Array<{ value: `${ProdutosSortKey}:${ProdutosSortDirection}`; label: string }> = [
  { value: "created_at:desc", label: "Mais recentes" },
  { value: "created_at:asc", label: "Mais antigos" },
  { value: "name:asc", label: "Nome A-Z" },
  { value: "name:desc", label: "Nome Z-A" },
  { value: "price:asc", label: "Menor preço" },
  { value: "price:desc", label: "Maior preço" },
  { value: "category:asc", label: "Categoria A-Z" },
  { value: "available:desc", label: "Disponíveis primeiro" },
  { value: "available:asc", label: "Indisponíveis primeiro" },
];

const Produtos = () => {
  const { user, loading: userLoading, error: userError } = useCurrentUser();
  const { hasPermission } = usePermissionsV2();
  const restaurantId = user?.restaurant_id ?? "";
  const [filtro, setFiltro] = useState("");
  const [categoriaFiltrada, setCategoriaFiltrada] = useState<string | null>(
    null
  );
  const [tabAtiva, setTabAtiva] = useState<ProdutosTab>("todos");
  const [pagina, setPagina] = useState(1);
  const [sortValue, setSortValue] = useState<`${ProdutosSortKey}:${ProdutosSortDirection}`>("created_at:desc");
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [bulkCategoryId, setBulkCategoryId] = useState<string>("");
  const [sortKey, sortDirection] = sortValue.split(":") as [ProdutosSortKey, ProdutosSortDirection];

  const {
    produtos,
    total,
    indicadores,
    loading,
    isAdding,
    isUpdating,
    isDeleting,
    isBulkUpdating,
    adicionarProduto,
    atualizarProduto,
    removerProduto,
    atualizarProdutosEmLote,
    fetchProdutos,
  } = useProdutos(restaurantId, {
    busca: filtro,
    categoriaId: categoriaFiltrada,
    tab: tabAtiva,
    pagina,
    itensPorPagina: ITENS_POR_PAGINA,
    sortKey,
    sortDirection,
  });

  const { categorias, loading: loadingCategorias, fetchCategorias } = useCategorias();
  const canManageProducts = hasPermission("products_manage");
  const { enabled: stockControlEnabled } = useStockSettings(restaurantId);
  const totalPaginas = Math.max(1, Math.ceil(total / ITENS_POR_PAGINA));
  const primeiraLinha = total === 0 ? 0 : (pagina - 1) * ITENS_POR_PAGINA + 1;
  const ultimaLinha = Math.min(pagina * ITENS_POR_PAGINA, total);

  const paginasVisiveis = useMemo(() => {
    const pages = new Set([1, totalPaginas, pagina - 1, pagina, pagina + 1]);
    return Array.from(pages)
      .filter((page) => page >= 1 && page <= totalPaginas)
      .sort((a, b) => a - b);
  }, [pagina, totalPaginas]);

  useEffect(() => {
    setPagina(1);
  }, [filtro, categoriaFiltrada, tabAtiva, sortValue]);

  useEffect(() => {
    setSelectedProductIds([]);
  }, [filtro, categoriaFiltrada, tabAtiva, pagina, sortValue]);

  useEffect(() => {
    if (pagina > totalPaginas) {
      setPagina(totalPaginas);
    }
  }, [pagina, totalPaginas]);

  const goToPage = (nextPage: number) => {
    setPagina(Math.min(Math.max(1, nextPage), totalPaginas));
  };

  const handleSelectProduct = (id: string, selected: boolean) => {
    setSelectedProductIds((currentIds) =>
      selected
        ? Array.from(new Set([...currentIds, id]))
        : currentIds.filter((currentId) => currentId !== id)
    );
  };

  const handleSelectAllVisible = (selected: boolean) => {
    const visibleIds = produtos.map((produto) => produto.id);
    setSelectedProductIds((currentIds) =>
      selected
        ? Array.from(new Set([...currentIds, ...visibleIds]))
        : currentIds.filter((id) => !visibleIds.includes(id))
    );
  };

  const handleBulkAvailable = async (available: boolean) => {
    const success = await atualizarProdutosEmLote(selectedProductIds, { available });
    if (success) setSelectedProductIds([]);
  };

  const handleBulkCategory = async () => {
    if (!bulkCategoryId) return;
    const success = await atualizarProdutosEmLote(selectedProductIds, { category_id: bulkCategoryId });
    if (success) {
      setSelectedProductIds([]);
      setBulkCategoryId("");
    }
  };

  if (userLoading) {
    return (
      <DashboardLayout title="Gerenciar Produtos">
        <div className="flex justify-center items-center h-64">
          <p>Carregando dados do usuário...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (userError) {
    return (
      <DashboardLayout title="Gerenciar Produtos">
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{userError}</AlertDescription>
        </Alert>
      </DashboardLayout>
    );
  }

  if (!restaurantId) {
    return (
      <DashboardLayout title="Gerenciar Produtos">
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>
            Você não tem um restaurante associado à sua conta. Por favor, contate o suporte.
          </AlertDescription>
        </Alert>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Gerenciar Produtos">
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col gap-3">
          <ProdutosFiltro
            filtro={filtro}
            categoriaFiltrada={categoriaFiltrada}
            onFiltroChange={setFiltro}
            onCategoriaChange={setCategoriaFiltrada}
            categorias={categorias}
            loadingCategorias={loadingCategorias}
          />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            <div className="rounded-md border px-3 py-2">
              <div className="text-xs text-muted-foreground">Total</div>
              <div className="text-lg font-semibold">{indicadores.total}</div>
            </div>
            <div className="rounded-md border px-3 py-2">
              <div className="text-xs text-muted-foreground">Disponíveis</div>
              <div className="text-lg font-semibold">{indicadores.disponiveis}</div>
            </div>
            <div className="rounded-md border px-3 py-2">
              <div className="text-xs text-muted-foreground">Indisponíveis</div>
              <div className="text-lg font-semibold">{indicadores.indisponiveis}</div>
            </div>
            <div className="rounded-md border px-3 py-2">
              <div className="text-xs text-muted-foreground">Sem imagem</div>
              <div className="text-lg font-semibold">{indicadores.semImagem}</div>
            </div>
            <button
              type="button"
              className="rounded-md border px-3 py-2 text-left transition hover:bg-muted/50 disabled:cursor-default disabled:hover:bg-transparent"
              onClick={() => setTabAtiva("baixo-estoque")}
              disabled={!stockControlEnabled && indicadores.baixoEstoque === 0}
              title="Ver produtos com estoque zerado ou abaixo do mínimo"
            >
              <div className="text-xs text-muted-foreground">Baixo estoque</div>
              <div className={indicadores.baixoEstoque > 0 ? "text-lg font-semibold text-amber-700" : "text-lg font-semibold"}>
                {indicadores.baixoEstoque}
              </div>
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:items-end">
          {canManageProducts && (
            <>
              <AddProdutoDialog
                onAddProduto={adicionarProduto}
                restaurantId={restaurantId}
                isSaving={isAdding}
              />
              <ImportarCardapioDialog
                restaurantId={restaurantId}
                categorias={categorias}
                onImported={() => {
                  void fetchProdutos();
                  void fetchCategorias();
                }}
              />
              <SetupRapidoSegmentoDialog
                restaurantId={restaurantId}
                categorias={categorias}
                onApplied={() => {
                  void fetchProdutos();
                  void fetchCategorias();
                }}
              />
            </>
          )}

          <Link
            to="/categorias"
            className="bg-green hover:bg-green-dark text-white flex items-center button px-4 py-2 rounded-md"
          >
            <ChartBarStacked className="h-4 w-4 mr-2" />
            Gerenciar Categorias
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Lista de Produtos</CardTitle>
            <Select
              value={sortValue}
              onValueChange={(value) => setSortValue(value as `${ProdutosSortKey}:${ProdutosSortDirection}`)}
            >
              <SelectTrigger className="w-full sm:w-52">
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                {sortOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Tabs
            value={tabAtiva}
            onValueChange={(value) => setTabAtiva(value as ProdutosTab)}
            className="pt-2"
          >
            <TabsList className="flex h-auto w-full flex-wrap justify-start">
              {tabs.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value}>
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          {canManageProducts && selectedProductIds.length > 0 && (
            <div className="mb-4 flex flex-col gap-3 rounded-md border bg-muted/40 p-3 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-sm font-medium">
                {selectedProductIds.length} produto(s) selecionado(s)
              </span>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleBulkAvailable(true)}
                  disabled={isBulkUpdating}
                >
                  Ativar
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleBulkAvailable(false)}
                  disabled={isBulkUpdating}
                >
                  Desativar
                </Button>
                <div className="flex gap-2">
                  <Select
                    value={bulkCategoryId}
                    onValueChange={setBulkCategoryId}
                    disabled={isBulkUpdating || loadingCategorias}
                  >
                    <SelectTrigger className="w-full sm:w-48">
                      <SelectValue placeholder="Trocar categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {categorias.map((categoria) => (
                        <SelectItem key={categoria.id} value={categoria.id}>
                          {categoria.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    onClick={handleBulkCategory}
                    disabled={isBulkUpdating || !bulkCategoryId}
                  >
                    Aplicar
                  </Button>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setSelectedProductIds([])}
                  disabled={isBulkUpdating}
                >
                  Limpar
                </Button>
              </div>
            </div>
          )}
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <p>Carregando produtos...</p>
            </div>
          ) : (
            <ProdutosList
              produtosFiltrados={produtos}
              restaurantId={restaurantId}
              onEditProduto={atualizarProduto}
              onDeleteProduto={removerProduto}
              canManage={canManageProducts}
              selectedIds={selectedProductIds}
              onSelectProduto={handleSelectProduct}
              onSelectAllVisible={handleSelectAllVisible}
              isUpdating={isUpdating}
              isDeleting={isDeleting}
              stockControlEnabled={stockControlEnabled}
              onStockChanged={fetchProdutos}
            />
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-muted-foreground">
            Mostrando {primeiraLinha} a {ultimaLinha} de {total} produtos
          </div>
          {totalPaginas > 1 && (
            <Pagination className="sm:mx-0 sm:w-auto">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(event) => {
                      event.preventDefault();
                      goToPage(pagina - 1);
                    }}
                    aria-disabled={pagina === 1}
                    className={pagina === 1 ? "pointer-events-none opacity-50" : undefined}
                  />
                </PaginationItem>
                {paginasVisiveis.map((page) => (
                  <PaginationItem key={page}>
                    <PaginationLink
                      href="#"
                      isActive={page === pagina}
                      onClick={(event) => {
                        event.preventDefault();
                        goToPage(page);
                      }}
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(event) => {
                      event.preventDefault();
                      goToPage(pagina + 1);
                    }}
                    aria-disabled={pagina === totalPaginas}
                    className={pagina === totalPaginas ? "pointer-events-none opacity-50" : undefined}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </CardFooter>
      </Card>
    </DashboardLayout>
  );
};

export default Produtos;
