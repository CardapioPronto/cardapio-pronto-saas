
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
import { PackageSearch, Pencil, Trash2, Boxes, History } from "lucide-react";
import { DeleteProdutoDialog } from "./DeleteProdutoDialog";
import { useState } from "react";
import { EditProdutoDialog } from "./EditProdutoDialog";
import { AjustarEstoqueDialog } from "./AjustarEstoqueDialog";
import { HistoricoEstoqueDialog } from "./HistoricoEstoqueDialog";
import produtoPadrao from "@/assets/produto-padrao.jpg";

const formatStockQuantity = (value: number, isFractional: boolean) => {
  if (isFractional) {
    return value.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 3 });
  }
  return Math.round(value).toLocaleString("pt-BR");
};

const StockBadge = ({ produto }: { produto: Product }) => {
  if (!produto.stock_tracking_enabled) {
    return (
      <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-600">
        Sem controle
      </Badge>
    );
  }

  const quantity = produto.stock_quantity ?? 0;
  const min = produto.stock_min_quantity ?? null;
  const isFractional = produto.stock_is_fractional ?? false;
  const display = formatStockQuantity(quantity, isFractional);

  if (quantity <= 0) {
    return (
      <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700">
        Esgotado
      </Badge>
    );
  }

  if (min !== null && quantity <= min) {
    return (
      <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
        Baixo · {display}
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
      {display}
    </Badge>
  );
};

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
  stockControlEnabled = false,
  onStockChanged,
}: ProdutosListProps & { stockControlEnabled?: boolean; onStockChanged?: () => void }) {
  const [produtoToEdit, setProdutoToEdit] = useState<Product | null>(null);
  const [produtoToDelete, setProdutoToDelete] = useState<Product | null>(null);
  const [produtoToAdjustStock, setProdutoToAdjustStock] = useState<Product | null>(null);
  const [produtoToShowHistory, setProdutoToShowHistory] = useState<Product | null>(null);

  const showStockColumn = stockControlEnabled
    || produtosFiltrados.some((p) => p.stock_tracking_enabled);

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
            {canManage && <TableHead>Custo</TableHead>}
            <TableHead>Status</TableHead>
            {showStockColumn && <TableHead>Estoque</TableHead>}
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
              {canManage && (
                <TableCell>{produto.cost_price == null ? "-" : formatCurrency(produto.cost_price)}</TableCell>
              )}
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
              {showStockColumn && (
                <TableCell>
                  <StockBadge produto={produto} />
                </TableCell>
              )}
              {canManage && (
                <TableCell className="text-right space-x-2">
                  {stockControlEnabled && produto.stock_tracking_enabled && (
                    <>
                      <Button
                        onClick={() => setProdutoToAdjustStock(produto)}
                        size="sm"
                        variant="ghost"
                        aria-label={`Ajustar estoque de ${produto.name}`}
                        title="Ajustar estoque"
                      >
                        <Boxes className="h-4 w-4" />
                      </Button>
                      <Button
                        onClick={() => setProdutoToShowHistory(produto)}
                        size="sm"
                        variant="ghost"
                        aria-label={`Histórico de estoque de ${produto.name}`}
                        title="Histórico de estoque"
                      >
                        <History className="h-4 w-4" />
                      </Button>
                    </>
                  )}
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

      {produtoToAdjustStock && (
        <AjustarEstoqueDialog
          produto={produtoToAdjustStock}
          restaurantId={restaurantId}
          onClose={() => setProdutoToAdjustStock(null)}
          onAdjusted={() => {
            setProdutoToAdjustStock(null);
            onStockChanged?.();
          }}
        />
      )}

      {produtoToShowHistory && (
        <HistoricoEstoqueDialog
          produto={produtoToShowHistory}
          onClose={() => setProdutoToShowHistory(null)}
        />
      )}
    </>
  );
}
