
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Category } from "@/types";
import { EditCategoriaDialog } from "./EditCategoriaDialog";
import { DeleteCategoriaDialog } from "./DeleteCategoriaDialog";
import { Badge } from "@/components/ui/badge";

interface CategoriasListProps {
  categorias: Category[];
  onEditCategoria: (id: string, name: string) => Promise<boolean>;
  onDeleteCategoria: (id: string) => Promise<boolean>;
  canManage: boolean;
}

export const CategoriasList = ({
  categorias,
  onEditCategoria,
  onDeleteCategoria,
  canManage,
}: CategoriasListProps) => {
  return (
    <div className="w-full overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Produtos</TableHead>
            <TableHead>Data de Criação</TableHead>
            {canManage && <TableHead className="w-[100px] text-right">Ações</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {categorias.length === 0 ? (
            <TableRow>
              <TableCell colSpan={canManage ? 4 : 3} className="text-center py-8 text-muted-foreground">
                Nenhuma categoria encontrada
              </TableCell>
            </TableRow>
          ) : (
            categorias.map((categoria) => (
              <TableRow key={categoria.id}>
                <TableCell>
                  <div className="font-medium">{categoria.name}</div>
                  <div className="font-mono text-xs text-muted-foreground">
                    {categoria.id.split("-")[0]}
                  </div>
                </TableCell>
                <TableCell>
                  {(categoria.products_count ?? 0) > 0 ? (
                    <Badge variant="secondary">
                      {categoria.products_count} produto{categoria.products_count === 1 ? "" : "s"}
                    </Badge>
                  ) : (
                    <Badge variant="outline">Sem produtos</Badge>
                  )}
                </TableCell>
                <TableCell>
                  {categoria.created_at
                    ? format(new Date(categoria.created_at), "dd/MM/yyyy HH:mm", {
                        locale: ptBR,
                      })
                    : "-"}
                </TableCell>
                {canManage && (
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <EditCategoriaDialog
                        categoria={categoria}
                        onEditCategoria={onEditCategoria}
                      />
                      <DeleteCategoriaDialog
                        categoriaId={categoria.id}
                        categoriaName={categoria.name}
                        productsCount={categoria.products_count ?? 0}
                        onDeleteCategoria={onDeleteCategoria}
                      />
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};
