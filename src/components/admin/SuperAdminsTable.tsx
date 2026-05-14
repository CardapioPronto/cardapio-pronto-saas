import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDate } from '@/lib/utils';
import type { SuperAdminRecord } from '@/services/adminService';
import { Loader2, ShieldCheck, Trash2 } from 'lucide-react';

interface SuperAdminsTableProps {
  data: SuperAdminRecord[];
  isLoading: boolean;
  onRemove: (admin: SuperAdminRecord) => void;
}

const adminLabel = (admin: SuperAdminRecord) =>
  admin.name || admin.email || admin.user_id;

export const SuperAdminsTable = ({ data, isLoading, onRemove }: SuperAdminsTableProps) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Administrador</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Restaurante</TableHead>
            <TableHead>Notas</TableHead>
            <TableHead>Criado em</TableHead>
            <TableHead>Criado por</TableHead>
            <TableHead>Último login</TableHead>
            <TableHead className="w-[96px] text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length > 0 ? (
            data.map((admin) => (
              <TableRow key={admin.user_id}>
                <TableCell>
                  <div className="min-w-[220px] space-y-1">
                    <div className="flex items-center gap-2 font-medium">
                      <ShieldCheck className="h-4 w-4 text-emerald-600" />
                      {adminLabel(admin)}
                    </div>
                    <div className="font-mono text-xs text-muted-foreground">{admin.user_id}</div>
                    {admin.email && <div className="text-sm text-muted-foreground">{admin.email}</div>}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col items-start gap-1">
                    <Badge variant="secondary">Super admin</Badge>
                    {admin.user_type === 'manager' && <Badge variant="outline">Gerente</Badge>}
                    {admin.user_type === 'owner' && <Badge variant="outline">Dono</Badge>}
                    {admin.is_current_user && <Badge>Você</Badge>}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="min-w-[160px] text-sm">
                    <div>{admin.restaurant_name || '-'}</div>
                    {admin.restaurant_id && (
                      <div className="font-mono text-xs text-muted-foreground">{admin.restaurant_id}</div>
                    )}
                  </div>
                </TableCell>
                <TableCell className="max-w-[260px]">
                  <p className="line-clamp-3 text-sm text-muted-foreground">
                    {admin.notes || 'Sem notas'}
                  </p>
                </TableCell>
                <TableCell>{formatDate(admin.created_at)}</TableCell>
                <TableCell>
                  <div className="min-w-[160px] text-sm">
                    <div>{admin.created_by_name || admin.created_by_email || '-'}</div>
                    {admin.created_by && (
                      <div className="font-mono text-xs text-muted-foreground">{admin.created_by}</div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {admin.last_sign_in_at ? formatDate(admin.last_sign_in_at) : 'Nunca'}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => onRemove(admin)}
                    disabled={admin.is_current_user || data.length <= 1}
                    title={
                      admin.is_current_user
                        ? 'Você não pode remover seu próprio acesso'
                        : data.length <= 1
                          ? 'Não é possível remover o último administrador'
                          : 'Remover administrador'
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={8} className="h-24 text-center">
                Nenhum administrador encontrado.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};
