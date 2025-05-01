
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/sonner';
import { Edit2, Loader2 } from 'lucide-react';
import { listAllSubscriptions, updateSubscriptionStatus } from '@/services/adminService';

const AdminSubscriptions = () => {
  const [selectedSubscription, setSelectedSubscription] = useState<any>(null);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-all-subscriptions'],
    queryFn: () => listAllSubscriptions()
  });

  const handleUpdateStatus = async () => {
    if (!selectedSubscription || !newStatus) return;
    
    setIsSubmitting(true);
    
    try {
      const { error } = await updateSubscriptionStatus(selectedSubscription.id, newStatus);
      
      if (error) {
        toast.error(`Erro ao atualizar status: ${error.message}`);
      } else {
        toast.success('Status da assinatura atualizado com sucesso!');
        setIsStatusDialogOpen(false);
        refetch();
      }
    } catch (error) {
      toast.error(`Erro ao atualizar status: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'ativa':
        return <Badge className="bg-green">Ativa</Badge>;
      case 'inativa':
        return <Badge variant="destructive">Inativa</Badge>;
      case 'pendente':
        return <Badge variant="outline" className="border-amber-500 text-amber-500">Pendente</Badge>;
      case 'cancelada':
        return <Badge variant="secondary">Cancelada</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <AdminLayout title="Gerenciar Assinaturas">
      <Card>
        <CardHeader>
          <CardTitle>Todas as Assinaturas</CardTitle>
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
                  <TableHead>ID</TableHead>
                  <TableHead>Restaurante</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Início</TableHead>
                  <TableHead>Término</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.data?.map((subscription) => (
                  <TableRow key={subscription.id}>
                    <TableCell className="font-medium">{subscription.id.substring(0, 8)}...</TableCell>
                    <TableCell>{subscription.restaurant?.name || 'N/A'}</TableCell>
                    <TableCell>{subscription.plan_id}</TableCell>
                    <TableCell>{getStatusBadge(subscription.status)}</TableCell>
                    <TableCell>{new Date(subscription.start_date).toLocaleDateString('pt-BR')}</TableCell>
                    <TableCell>{subscription.end_date ? new Date(subscription.end_date).toLocaleDateString('pt-BR') : '-'}</TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setSelectedSubscription(subscription);
                          setNewStatus(subscription.status);
                          setIsStatusDialogOpen(true);
                        }}
                      >
                        <Edit2 className="h-4 w-4 mr-1" />
                        Status
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                
                {!data?.data?.length && (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      Nenhuma assinatura encontrada.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog para atualizar status */}
      <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Atualizar Status da Assinatura</DialogTitle>
            <DialogDescription>
              Atualize o status da assinatura do cliente. Esta ação será registrada nos logs do sistema.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div>
              <p className="mb-2 text-sm font-medium">Cliente:</p>
              <p>{selectedSubscription?.restaurant?.name}</p>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium">Plano:</p>
              <p>{selectedSubscription?.plan_id}</p>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium">Status Atual:</p>
              <p>{selectedSubscription?.status}</p>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium">Novo Status:</p>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar novo status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativa">Ativa</SelectItem>
                  <SelectItem value="inativa">Inativa</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="cancelada">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsStatusDialogOpen(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleUpdateStatus} 
              className="bg-green hover:bg-green/80"
              disabled={isSubmitting || newStatus === selectedSubscription?.status}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Atualizar Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminSubscriptions;
