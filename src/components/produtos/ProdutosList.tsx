
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
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/ui/empty-state";
import { PackageSearch, Pencil, Trash2 } from "lucide-react";
import { DeleteProdutoDialog } from "./DeleteProdutoDialog";
import { useState } from "react";
import { EditProdutoDialog } from "./EditProdutoDialog";
import produtoPadrao from "@/assets/produto-padrao.jpg";

interface ProdutosListProps {
  produtosFiltrados: Product[];
  restaurantId: string;
  onEditProduto: (produto: Product) => Promise<boolean>;
  onDeleteProduto: (id: string) => Promise<boolean>;
  canManage: boolean;
  selectedIds: string[];
  onSelectProduto: (id: string, selected: boolean) => void;
  onSelectAllVisible: (selected: boolean) => void;
  isUpdating?: boolean;
  isDeleting?: boolean;
}

export function ProdutosList({
  produtosFiltrados,
  restaurantId,
  onEditProduto,
  onDeleteProduto,
  canManage,
  selectedIds,
  onSelectProduto,
  onSelectAllVisible,
  isUpdating = false,
  isDeleting = false,
}: ProdutosListProps) {
  const [produtoToEdit, setProdutoToEdit] = useState<Product | null>(null);
  const [produtoToDelete, setProdutoToDelete] = useState<Product | null>(null);

  if (produtosFiltrados.length === 0) {
    return (
      <EmptyState
        icon={PackageSearch}
        title="Nenhum produto encontrado"
        description={
          canManage
            ? "Cadastre um produto ou ajuste os filtros para visualizar o cardápio."
            : "Ajuste os filtros para visualizar os produtos disponíveis."
        }
      />
    );
  }

  return (
    <>
      <div className="w-full overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {canManage && (
              <TableHead className="w-10">
                <Checkbox
                  aria-label="Selecionar produtos visíveis"
                  checked={
                    produtosFiltrados.length > 0 &&
                    produtosFiltrados.every((produto) => selectedIds.includes(produto.id))
                  }
                  onCheckedChange={(checked) => onSelectAllVisible(checked === true)}
                />
              </TableHead>
            )}
            <TableHead>Imagem</TableHead>
            <TableHead>Nome</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead>Preço</TableHead>
            <TableHead>Status</TableHead>
            {canManage && <TableHead className="text-right">Ações</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {produtosFiltrados.map((produto) => (
            <TableRow key={produto.id}>
              {canManage && (
                <TableCell>
                  <Checkbox
                    aria-label={`Selecionar ${produto.name}`}
                    checked={selectedIds.includes(produto.id)}
                    onCheckedChange={(checked) => onSelectProduto(produto.id, checked === true)}
                  />
                </TableCell>
              )}
              <TableCell>
                <img 
                  src={produto.image_url || produtoPadrao} 
                  alt={produto.name}
                  loading="lazy"
                  decoding="async"
                  className="w-12 h-12 object-cover rounded-md"
                />
              </TableCell>
              <TableCell className="font-medium">{produto.name}</TableCell>
              <TableCell>{produto.category?.name || "-"}</TableCell>
              <TableCell>{formatCurrency(produto.price)}</TableCell>
              <TableCell>
                {produto.available ? (
                  <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
                    Disponível
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700">
                    Indisponível
                  </Badge>
                )}
              </TableCell>
              {canManage && (
                <TableCell className="text-right space-x-2">
                  <Button
                    onClick={() => setProdutoToEdit(produto)}
                    size="sm"
                    variant="ghost"
                    aria-label={`Editar ${produto.name}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={() => setProdutoToDelete(produto)}
                    size="sm"
                    variant="ghost"
                    className="text-red-500 hover:text-red-700"
                    aria-label={`Excluir ${produto.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      </div>

      {produtoToEdit && (
        <EditProdutoDialog
          produto={produtoToEdit}
          onSave={async (produto) => {
            const success = await onEditProduto(produto);
            if (success) {
              setProdutoToEdit(null);
            }
            return success;
          }}
          restaurantId={restaurantId}
          onClose={() => setProdutoToEdit(null)}
          isSaving={isUpdating}
        />
      )}

      {produtoToDelete && (
        <DeleteProdutoDialog
          produto={produtoToDelete}
          onDelete={async (id) => {
            const success = await onDeleteProduto(id);
            if (success) {
              setProdutoToDelete(null);
            }
            return success;
          }}
          onClose={() => setProdutoToDelete(null)}
          isDeleting={isDeleting}
        />
      )}
    </>
  );
}
