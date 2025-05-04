
import { useState } from "react";
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

const Categorias = () => {
  const {
    categorias,
    loading,
    adicionarCategoria,
    editarCategoria,
    excluirCategoria,
  } = useCategorias();

  return (
    <DashboardLayout title="Categorias">
      {loading && categorias.length === 0 ? (
        <div className="flex justify-center items-center h-64">
          <p>Carregando categorias...</p>
        </div>
      ) : (
        <>
          <div className="mb-6 flex justify-end">
            <AddCategoriaDialog onAddCategoria={adicionarCategoria} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Lista de Categorias</CardTitle>
            </CardHeader>
            <CardContent>
              <CategoriasList
                categorias={categorias}
                onEditCategoria={editarCategoria}
                onDeleteCategoria={excluirCategoria}
              />
            </CardContent>
            <CardFooter className="flex justify-between">
              <div className="text-sm text-muted-foreground">
                Total: {categorias.length} categorias
              </div>
            </CardFooter>
          </Card>
        </>
      )}
    </DashboardLayout>
  );
};

export default Categorias;
