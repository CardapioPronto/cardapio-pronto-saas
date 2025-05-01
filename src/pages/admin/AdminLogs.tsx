
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { listActivityLogs } from '@/services/adminService';

const AdminLogs = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['activity-logs'],
    queryFn: () => listActivityLogs(100) // Limitar a 100 logs mais recentes
  });

  const getActionBadge = (action: string) => {
    if (action.includes('create') || action.includes('add')) {
      return <Badge className="bg-green">Criação</Badge>;
    } else if (action.includes('update') || action.includes('edit')) {
      return <Badge className="bg-blue-500">Atualização</Badge>;
    } else if (action.includes('delete') || action.includes('remove')) {
      return <Badge variant="destructive">Exclusão</Badge>;
    } else if (action.includes('login')) {
      return <Badge variant="outline" className="border-amber-500 text-amber-500">Login</Badge>;
    } else {
      return <Badge variant="secondary">{action}</Badge>;
    }
  };

  return (
    <AdminLayout title="Logs e Métricas">
      <Card>
        <CardHeader>
          <CardTitle>Logs de Atividade Administrativa</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Data/Hora</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Entidade</TableHead>
                  <TableHead>ID da Entidade</TableHead>
                  <TableHead>Detalhes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.data?.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-mono text-xs">
                      {new Date(log.created_at).toLocaleString('pt-BR')}
                    </TableCell>
                    <TableCell className="font-medium">{log.user_id.substring(0, 8)}...</TableCell>
                    <TableCell>{getActionBadge(log.action)}</TableCell>
                    <TableCell>{log.entity_type}</TableCell>
                    <TableCell className="font-mono text-xs">{log.entity_id.substring(0, 8)}...</TableCell>
                    <TableCell>
                      <div className="max-w-xs overflow-hidden text-ellipsis whitespace-nowrap">
                        {log.details ? JSON.stringify(log.details) : '-'}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                
                {!data?.data?.length && (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      Nenhum log encontrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
};

export default AdminLogs;
