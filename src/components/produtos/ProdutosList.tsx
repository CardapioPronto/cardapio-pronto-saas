
import { useState } from "react";
import { Product } from "@/types";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EditProdutoDialog } from "./EditProdutoDialog";
import { DeleteProdutoDialog } from "./DeleteProdutoDialog";

interface ProdutosListProps {
  produtosFiltrados: Product[];
  restaurantId: string;
  onEditProduto: (produto: Product) => void;
  onDeleteProduto: (id: string) => void;
}

export const ProdutosList = ({
  produtosFiltrados,
  restaurantId,
  onEditProduto,
  onDeleteProduto,
}: ProdutosListProps) => {
  const [produtoEditando, setProdutoEditando] = useState<Product | null>(null);

  const iniciarEdicao = (produto: Product) => {
    setProdutoEditando({ ...produto });
    onEditProduto({ ...produto });
  };

  const salvarEdicao = () => {
    if (!produtoEditando) return;
    onEditProduto(produtoEditando);
    setProdutoEditando(null);
  };

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Descrição</TableHead>
            <TableHead>Preço</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {produtosFiltrados.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={6}
                className="text-center py-8 text-muted-foreground"
              >
                Nenhum produto encontrado
              </TableCell>
            </TableRow>
          ) : (
            produtosFiltrados.map((produto) => (
              <TableRow key={produto.id}>
                <TableCell className="font-medium">
                  {produto.name}
                </TableCell>
                <TableCell className="max-w-[200px] truncate">
                  {produto.description}
                </TableCell>
                <TableCell>R$ {produto.price.toFixed(2)}</TableCell>
                <TableCell className="capitalize">
                  {produto.category?.name}
                </TableCell>
                <TableCell>
                  <span
                    className={`inline-block px-2 py-1 rounded-full text-xs ${
                      produto.available
                        ? "bg-green/10 text-green"
                        : "bg-orange/10 text-orange"
                    }`}
                  >
                    {produto.available ? "Disponível" : "Indisponível"}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <EditProdutoDialog 
                      produto={produto} 
                      onSave={onEditProduto} 
                      restaurantId={restaurantId} 
                    />
                    <DeleteProdutoDialog produto={produto} onDelete={onDeleteProduto} />
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      
      <div className="mt-4 text-sm text-muted-foreground">
        Mostrando {produtosFiltrados.length} produtos
      </div>
    </>
  );
};
