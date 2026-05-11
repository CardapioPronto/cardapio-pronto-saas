
import React from 'react';
import { Button } from '@/components/ui/button';
import { AdminTable } from './AdminTable';
import { Trash2 } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface SuperAdmin {
  user_id: string;
  notes?: string;
  created_at: string;
  created_by?: string;
}

interface SuperAdminsTableProps {
  data: SuperAdmin[] | null;
  isLoading: boolean;
  onRemove: (adminId: string) => void;
}

export const SuperAdminsTable = ({ data, isLoading, onRemove }: SuperAdminsTableProps) => {
  const columns = [
    {
      header: 'ID',
      accessorKey: 'user_id' as keyof SuperAdmin,
    },
    {
      header: 'Notas',
      accessorKey: 'notes' as keyof SuperAdmin,
      cell: (row: SuperAdmin) => row.notes || '-'
    },
    {
      header: 'Data de Criação',
      accessorKey: 'created_at' as keyof SuperAdmin,
      cell: (row: SuperAdmin) => formatDate(row.created_at)
    },
    {
      header: 'Criado Por',
      accessorKey: 'created_by' as keyof SuperAdmin,
      cell: (row: SuperAdmin) => row.created_by || '-'
    },
    {
      header: 'Ações',
      accessorKey: (row: SuperAdmin) => (
        <div className="text-right">
          <Button 
            variant="destructive" 
            size="sm"
            onClick={() => onRemove(row.user_id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    }
  ];

  return (
    <AdminTable
      data={data as unknown as Record<string, unknown>[] | null}
      isLoading={isLoading}
      columns={columns as unknown as { header: string; accessorKey: string | ((row: Record<string, unknown>) => React.ReactNode); cell?: (row: Record<string, unknown>) => React.ReactNode }[]}
      emptyMessage="Nenhum administrador encontrado."
    />
  );
};
