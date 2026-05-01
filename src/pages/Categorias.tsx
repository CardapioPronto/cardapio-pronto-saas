
import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useCategorias } from "@/hooks/useCategorias";
import { AddCategoriaDialog } from "@/components/categorias/AddCategoriaDialog";
import { CategoriasList } from "@/components/categorias/CategoriasList";
import { Input } from "@/components/ui/input";
import { Search, Tags } from "lucide-react";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { usePermissionsV2 } from "@/hooks/usePermissionsV2";

const ITENS_POR_PAGINA = 10;

type SortValue = "name:asc" | "name:desc" | "created_at:desc" | "created_at:asc" | "products_count:desc" | "products_count:asc";
type UsageFilter = "all" | "with-products" | "empty";

const Categorias = () => {
  const [busca, setBusca] = useState("");
  const [usoFiltro, setUsoFiltro] = useState<UsageFilter>("all");
  const [sortValue, setSortValue] = useState<SortValue>("name:asc");
  const [pagina, setPagina] = useState(1);
  const {
    categorias,
    loading,
    adicionarCategoria,
    editarCategoria,
    excluirCategoria,
  } = useCategorias();
  const { hasPermission } = usePermissionsV2();
  const canManageCategories = hasPermission("products_manage");

  const categoriasFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const [sortKey, sortDirection] = sortValue.split(":") as [string, "asc" | "desc"];

    return categorias
      .filter((categoria) => {
        const matchesSearch = !termo || categoria.name.toLowerCase().includes(termo);
        const productsCount = categoria.products_count ?? 0;
        const matchesUsage =
          usoFiltro === "all" ||
          (usoFiltro === "with-products" && productsCount > 0) ||
          (usoFiltro === "empty" && productsCount === 0);

        return matchesSearch && matchesUsage;
      })
      .sort((a, b) => {
        const direction = sortDirection === "asc" ? 1 : -1;

        if (sortKey === "products_count") {
          return ((a.products_count ?? 0) - (b.products_count ?? 0)) * direction;
        }

        if (sortKey === "created_at") {
          const firstDate = a.created_at ? new Date(a.created_at).getTime() : 0;
          const secondDate = b.created_at ? new Date(b.created_at).getTime() : 0;
          return (firstDate - secondDate) * direction;
        }

        return a.name.localeCompare(b.name, "pt-BR") * direction;
      });
  }, [busca, categorias, sortValue, usoFiltro]);

  const totalPaginas = Math.max(1, Math.ceil(categoriasFiltradas.length / ITENS_POR_PAGINA));
  const categoriasPaginadas = categoriasFiltradas.slice(
    (pagina - 1) * ITENS_POR_PAGINA,
    pagina * ITENS_POR_PAGINA
  );
  const primeiraLinha = categoriasFiltradas.length === 0 ? 0 : (pagina - 1) * ITENS_POR_PAGINA + 1;
  const ultimaLinha = Math.min(pagina * ITENS_POR_PAGINA, categoriasFiltradas.length);
  const categoriasComProdutos = categorias.filter((cat) => (cat.products_count ?? 0) > 0).length;
  const categoriasVazias = categorias.length - categoriasComProdutos;

  const paginasVisiveis = useMemo(() => {
    const pages = new Set([1, totalPaginas, pagina - 1, pagina, pagina + 1]);
    return Array.from(pages)
      .filter((page) => page >= 1 && page <= totalPaginas)
      .sort((a, b) => a - b);
  }, [pagina, totalPaginas]);

  useEffect(() => {
    setPagina(1);
  }, [busca, sortValue, usoFiltro]);

  useEffect(() => {
    if (pagina > totalPaginas) {
      setPagina(totalPaginas);
    }
  }, [pagina, totalPaginas]);

  const goToPage = (nextPage: number) => {
    setPagina(Math.min(Math.max(1, nextPage), totalPaginas));
  };

  const limparFiltros = () => {
    setBusca("");
    setUsoFiltro("all");
    setSortValue("name:asc");
  };

  return (
    <DashboardLayout title="Categorias">
      {loading && categorias.length === 0 ? (
        <div className="flex justify-center items-center h-64">
          <p>Carregando categorias...</p>
        </div>
      ) : (
        <>
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-md border px-4 py-3">
                <div className="text-xs text-muted-foreground">Total</div>
                <div className="text-2xl font-semibold">{categorias.length}</div>
              </div>
              <div className="rounded-md border px-4 py-3">
                <div className="text-xs text-muted-foreground">Em uso</div>
                <div className="text-2xl font-semibold">{categoriasComProdutos}</div>
              </div>
              <div className="rounded-md border px-4 py-3">
                <div className="text-xs text-muted-foreground">Sem produtos</div>
                <div className="text-2xl font-semibold">{categoriasVazias}</div>
              </div>
            </div>

            {canManageCategories && (
              <div className="lg:pt-1">
                <AddCategoriaDialog onAddCategoria={adicionarCategoria} />
              </div>
            )}
          </div>

          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <Tags className="h-5 w-5 text-muted-foreground" />
                  <CardTitle>Lista de Categorias</CardTitle>
                </div>

                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <div className="relative w-full sm:w-72">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar categorias..."
                        className="pl-8"
                        value={busca}
                        onChange={(event) => setBusca(event.target.value)}
                      />
                    </div>

                    <Select value={usoFiltro} onValueChange={(value) => setUsoFiltro(value as UsageFilter)}>
                      <SelectTrigger className="w-full sm:w-44">
                        <SelectValue placeholder="Uso" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        <SelectItem value="with-products">Com produtos</SelectItem>
                        <SelectItem value="empty">Sem produtos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Select value={sortValue} onValueChange={(value) => setSortValue(value as SortValue)}>
                      <SelectTrigger className="w-full sm:w-52">
                        <SelectValue placeholder="Ordenar por" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="name:asc">Nome A-Z</SelectItem>
                        <SelectItem value="name:desc">Nome Z-A</SelectItem>
                        <SelectItem value="created_at:desc">Mais recentes</SelectItem>
                        <SelectItem value="created_at:asc">Mais antigas</SelectItem>
                        <SelectItem value="products_count:desc">Mais produtos</SelectItem>
                        <SelectItem value="products_count:asc">Menos produtos</SelectItem>
                      </SelectContent>
                    </Select>

                    {(busca || usoFiltro !== "all" || sortValue !== "name:asc") && (
                      <Button type="button" variant="outline" onClick={limparFiltros}>
                        Limpar
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <CategoriasList
                categorias={categoriasPaginadas}
                onEditCategoria={editarCategoria}
                onDeleteCategoria={excluirCategoria}
                canManage={canManageCategories}
              />
            </CardContent>
            <CardFooter className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-muted-foreground">
                Mostrando {primeiraLinha} a {ultimaLinha} de {categoriasFiltradas.length} categorias
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
        </>
      )}
    </DashboardLayout>
  );
};

export default Categorias;
