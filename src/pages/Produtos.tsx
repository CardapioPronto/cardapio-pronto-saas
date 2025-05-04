
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

const Produtos = () => {
  const { user } = useCurrentUser();
  const restaurantId = user?.restaurant_id ?? "";
  const { produtos, loading, adicionarProduto, atualizarProduto, removerProduto } = useProdutos(restaurantId);
  
  const [filtro, setFiltro] = useState("");
  const [categoriaFiltrada, setCategoriaFiltrada] = useState<string | null>(null);

  // Filtragem de produtos
  const produtosFiltrados = produtos.filter((p) => {
    const matchesText =
      p.name.toLowerCase().includes(filtro.toLowerCase()) ||
      p.description.toLowerCase().includes(filtro.toLowerCase());
    const matchesCategoria = categoriaFiltrada
      ? p.category?.name === categoriaFiltrada
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
            />
            
            <AddProdutoDialog 
              onAddProduto={adicionarProduto}
              restaurantId={restaurantId}
            />
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
                Mostrando {produtosFiltrados.length} de {produtos.length} produtos
              </div>
            </CardFooter>
          </Card>
        </>
      )}
    </DashboardLayout>
  );
};

export default Produtos;
