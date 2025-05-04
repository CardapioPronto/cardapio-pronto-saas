import { useState } from "react";
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
import { useProdutos } from "@/hooks/useProdutos";
import { Button } from "@/components/ui/button";
import { ChartBarStacked, Plus } from "lucide-react";
import { Link } from "react-router-dom";

const Produtos = () => {
  const { user } = useCurrentUser();
  const restaurantId = user?.restaurant_id ?? "";
  const {
    produtos,
    loading,
    adicionarProduto,
    atualizarProduto,
    removerProduto,
  } = useProdutos(restaurantId);

  const [filtro, setFiltro] = useState("");
  const [categoriaFiltrada, setCategoriaFiltrada] = useState<string | null>(
    null
  );

  // Filtragem de produtos
  const produtosFiltrados = produtos.filter((p) => {
    const matchesText =
      p.name.toLowerCase().includes(filtro.toLowerCase()) ||
      p.description.toLowerCase().includes(filtro.toLowerCase());
    const matchesCategoria = categoriaFiltrada
      ? p.category?.id === categoriaFiltrada
      : true;

    return matchesText && matchesCategoria;
  });

  return (
    <DashboardLayout title="Gerenciar Produtos">
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <p>Carregando produtos...</p>
        </div>
      ) : (
        <>
          <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <ProdutosFiltro
              filtro={filtro}
              categoriaFiltrada={categoriaFiltrada}
              onFiltroChange={setFiltro}
              onCategoriaChange={setCategoriaFiltrada}
              restaurantId={restaurantId}
            />

            <div className="flex gap-2">
              <AddProdutoDialog
                onAddProduto={adicionarProduto}
                restaurantId={restaurantId}
              />

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
              <CardTitle>Lista de Produtos</CardTitle>
            </CardHeader>
            <CardContent>
              <ProdutosList
                produtosFiltrados={produtosFiltrados}
                restaurantId={restaurantId}
                onEditProduto={atualizarProduto}
                onDeleteProduto={removerProduto}
              />
            </CardContent>
            <CardFooter className="flex justify-between">
              <div className="text-sm text-muted-foreground">
                Mostrando {produtosFiltrados.length} de {produtos.length}{" "}
                produtos
              </div>
            </CardFooter>
          </Card>
        </>
      )}
    </DashboardLayout>
  );
};

export default Produtos;
