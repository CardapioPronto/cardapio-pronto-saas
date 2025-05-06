
import { Product } from "@/types";
import { formatCurrency } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import { DeleteProdutoDialog } from "./DeleteProdutoDialog";
import { useState } from "react";
import { EditProdutoDialog } from "./EditProdutoDialog";

interface ProdutosListProps {
  produtosFiltrados: Product[];
  restaurantId: string;
  onEditProduto: (produto: Product) => Promise<boolean>;
  onDeleteProduto: (id: string) => Promise<boolean>;
}

export function ProdutosList({
  produtosFiltrados,
  restaurantId,
  onEditProduto,
  onDeleteProduto,
}: ProdutosListProps) {
  const [produtoToEdit, setProdutoToEdit] = useState<Product | null>(null);
  const [produtoToDelete, setProdutoToDelete] = useState<Product | null>(null);

  if (produtosFiltrados.length === 0) {
    return (
      <div className="bg-gray-50 rounded-md p-8 text-center">
        <p className="text-gray-500 mb-2">Nenhum produto encontrado</p>
        <p className="text-sm text-gray-400">
          Adicione seu primeiro produto clicando no botão "Adicionar Produto" acima
        </p>
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead>Preço</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {produtosFiltrados.map((produto) => (
            <TableRow key={produto.id}>
              <TableCell className="font-medium">{produto.name}</TableCell>
              <TableCell>{produto.category?.name || "-"}</TableCell>
              <TableCell>{formatCurrency(produto.price)}</TableCell>
              <TableCell>
                {produto.available ? (
                  <Badge>Disponível</Badge>
                ) : (
                  <Badge variant="secondary">Indisponível</Badge>
                )}
              </TableCell>
              <TableCell className="text-right space-x-2">
                <Button
                  onClick={() => setProdutoToEdit(produto)}
                  size="sm"
                  variant="ghost"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  onClick={() => setProdutoToDelete(produto)}
                  size="sm"
                  variant="ghost"
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {produtoToEdit && (
        <EditProdutoDialog
          produto={produtoToEdit}
          onSave={onEditProduto}
          restaurantId={restaurantId}
        />
      )}

      {produtoToDelete && (
        <DeleteProdutoDialog
          produto={produtoToDelete}
          onDelete={onDeleteProduto}
        />
      )}
    </>
  );
}
