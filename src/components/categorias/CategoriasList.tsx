
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

interface CategoriasListProps {
  categorias: Category[];
  onEditCategoria: (id: string, name: string) => Promise<boolean>;
  onDeleteCategoria: (id: string) => Promise<boolean>;
}

export const CategoriasList = ({
  categorias,
  onEditCategoria,
  onDeleteCategoria,
}: CategoriasListProps) => {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Nome</TableHead>
            <TableHead>Data de Criação</TableHead>
            <TableHead className="w-[100px]">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {categorias.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center py-4">
                Nenhuma categoria encontrada
              </TableCell>
            </TableRow>
          ) : (
            categorias.map((categoria) => (
              <TableRow key={categoria.id}>
                <TableCell className="font-mono text-xs">
                  {categoria.id.split("-")[0]}
                </TableCell>
                <TableCell>{categoria.name}</TableCell>
                <TableCell>
                  {categoria.created_at && format(
                    new Date(categoria.created_at),
                    "dd/MM/yyyy HH:mm",
                    { locale: ptBR }
                  )}
                </TableCell>
                <TableCell className="flex gap-2">
                  <EditCategoriaDialog
                    categoria={categoria}
                    onEditCategoria={onEditCategoria}
                  />
                  <DeleteCategoriaDialog
                    categoriaId={categoria.id}
                    categoriaName={categoria.name}
                    onDeleteCategoria={onDeleteCategoria}
                  />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};
