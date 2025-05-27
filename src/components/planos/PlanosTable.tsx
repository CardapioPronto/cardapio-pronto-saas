// PlanosTable.tsx
import { Button } from "@/components/ui/button";
import { AdminTable } from "@/components/admin/AdminTable";
import { Pencil, Trash2, ListPlus } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Plano } from "@/types/plano";
import { DeletePlanoDialog } from "./DeletePlanoDialog";

interface PlanosTableProps {
  data: Plano[] | null;
  isLoading: boolean;
  onRemove: (id: string) => void;
  onEdit: (plano: Plano) => void;
  onManageFeatures: (plano: Plano) => void;
}

export const PlanosTable = ({
  data,
  isLoading,
  onRemove,
  onEdit,
  onManageFeatures
}: PlanosTableProps) => {
  const columns = [
    {
      header: "Nome",
      accessorKey: "name" as keyof Plano,
    },
    {
      header: "Preço Mensal",
      accessorKey: (row: Plano) => formatCurrency(row.price_monthly),
    },
    {
      header: "Preço Anual",
      accessorKey: (row: Plano) => formatCurrency(row.price_yearly),
    },
    {
      header: "Ativo",
      accessorKey: (row: Plano) => row.is_active ? "✅" : "❌",
    },
    {
      header: "Ações",
      accessorKey: (row: Plano) => (
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => onEdit(row)} title="Editar plano">
            <Pencil className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => onManageFeatures(row)} title="Gerenciar funcionalidades">
            <ListPlus className="w-4 h-4" />
          </Button>
          <DeletePlanoDialog plano={row} onDelete={onRemove} />
        </div>
      ),
    },
  ];

  return (
    <AdminTable
      data={data}
      isLoading={isLoading}
      columns={columns}
      emptyMessage="Nenhum plano encontrado."
    />
  );
};
