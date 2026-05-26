
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/sonner-toast';
import { CalendarClock, Edit2, Loader2, RefreshCw, XCircle } from 'lucide-react';
import { listAllSubscriptions, updateSubscriptionStatus } from '@/services/adminService';
import { getSubscriptionStatusMeta, normalizeSubscriptionStatus } from '@/lib/subscriptionStatusUi';
import {
  cancelPagarmeSubscription,
  syncPagarmeSubscription,
  updatePagarmeSubscriptionStartAt,
} from '@/services/pagarmeWebhookAdmin';

type AdminSubscription = {
  id: string;
  restaurant_id: string;
  restaurant?: {
    name?: string | null;
    owner_id?: string | null;
  } | null;
  plan_id: string;
  plan?: {
    name?: string | null;
  } | null;
  status: string;
  start_date: string;
  end_date: string | null;
  billing_cycle: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  next_billing_at: string | null;
  pagarme_subscription_id: string | null;
  pagarme_customer_id: string | null;
  last_payment_status: string | null;
  updated_at: string;
};

const STATUS_OPTIONS = [
  { value: 'active', label: 'Ativa' },
  { value: 'trialing', label: 'Em teste' },
  { value: 'past_due', label: 'Em atraso' },
  { value: 'pending', label: 'Pendente' },
  { value: 'canceled', label: 'Cancelada' },
];

const AdminSubscriptions = () => {
  const [selectedSubscription, setSelectedSubscription] = useState<AdminSubscription | null>(null);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [isPagarmeDialogOpen, setIsPagarmeDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<string>('');
  const [startAtInput, setStartAtInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pagarmeAction, setPagarmeAction] = useState<string | null>(null);

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
    const meta = getSubscriptionStatusMeta(status);
    return <Badge className={meta.className}>{meta.label}</Badge>;
  };

  const formatDate = (value: string | null | undefined) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('pt-BR');
  };

  const formatDateTime = (value: string | null | undefined) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString('pt-BR');
  };

  const toDateTimeLocal = (value: string | null | undefined) => {
    const fallback = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const date = value ? new Date(value) : fallback;
    const safeDate = Number.isNaN(date.getTime()) ? fallback : date;
    const local = new Date(safeDate.getTime() - safeDate.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  };

  const hasPagarmeSubscription = (subscription: AdminSubscription | null) =>
    Boolean(subscription?.pagarme_subscription_id?.startsWith('sub_'));

  const openPagarmeDialog = (subscription: AdminSubscription) => {
    setSelectedSubscription(subscription);
    setStartAtInput(toDateTimeLocal(subscription.next_billing_at ?? subscription.current_period_end));
    setIsPagarmeDialogOpen(true);
  };

  const requireRemoteSubscriptionId = () => {
    const id = selectedSubscription?.pagarme_subscription_id;
    if (!id?.startsWith('sub_')) {
      throw new Error('Esta assinatura local não possui ID de assinatura Pagar.me sub_.');
    }
    return id;
  };

  const handleUpdatePagarmeStartAt = async () => {
    setPagarmeAction('start_at');
    try {
      const subscriptionId = requireRemoteSubscriptionId();
      const parsed = new Date(startAtInput);
      if (Number.isNaN(parsed.getTime())) throw new Error('Informe uma data válida.');
      await updatePagarmeSubscriptionStartAt(subscriptionId, parsed.toISOString());
      toast.success('Data de início atualizada no Pagar.me');
      await refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao atualizar no Pagar.me');
    } finally {
      setPagarmeAction(null);
    }
  };

  const handleSyncPagarmeSubscription = async () => {
    setPagarmeAction('sync');
    try {
      const subscriptionId = requireRemoteSubscriptionId();
      await syncPagarmeSubscription(subscriptionId);
      toast.success('Assinatura sincronizada com o Pagar.me');
      await refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao sincronizar assinatura');
    } finally {
      setPagarmeAction(null);
    }
  };

  const handleCancelPagarmeSubscription = async () => {
    if (!window.confirm('Cancelar esta assinatura no Pagar.me e marcar a linha local como cancelada?')) return;
    setPagarmeAction('cancel');
    try {
      const subscriptionId = requireRemoteSubscriptionId();
      await cancelPagarmeSubscription(subscriptionId);
      toast.success('Assinatura cancelada no Pagar.me');
      setIsPagarmeDialogOpen(false);
      await refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao cancelar assinatura');
    } finally {
      setPagarmeAction(null);
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
                  <TableHead>Período</TableHead>
                  <TableHead>Pagar.me</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.data?.map((subscription) => (
                  <TableRow key={subscription.id}>
                    <TableCell className="font-medium">{subscription.id.substring(0, 8)}...</TableCell>
                    <TableCell>{subscription.restaurant?.name || 'N/A'}</TableCell>
                    <TableCell>
                      <div>{subscription.plan?.name || subscription.plan_id}</div>
                      <div className="text-xs text-muted-foreground">{subscription.billing_cycle || '-'}</div>
                    </TableCell>
                    <TableCell>{getStatusBadge(subscription.status)}</TableCell>
                    <TableCell>
                      <div className="text-sm">{formatDate(subscription.current_period_start ?? subscription.start_date)}</div>
                      <div className="text-xs text-muted-foreground">até {formatDate(subscription.current_period_end ?? subscription.end_date)}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-mono text-xs">{subscription.pagarme_subscription_id || '-'}</div>
                      <div className="text-xs text-muted-foreground">{subscription.last_payment_status || 'sem status'}</div>
                    </TableCell>
                    <TableCell className="space-x-2 text-right">
                      {hasPagarmeSubscription(subscription) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openPagarmeDialog(subscription)}
                        >
                          <CalendarClock className="h-4 w-4 mr-1" />
                          Pagar.me
                        </Button>
                      )}
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setSelectedSubscription(subscription);
                          setNewStatus(normalizeSubscriptionStatus(subscription.status));
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
                  {STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
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
              disabled={
                isSubmitting ||
                newStatus === normalizeSubscriptionStatus(selectedSubscription?.status)
              }
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Atualizar Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isPagarmeDialogOpen} onOpenChange={setIsPagarmeDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Ações no Pagar.me</DialogTitle>
            <DialogDescription>
              Execute operações remotas para correção pontual de assinatura. Essas ações são registradas no log administrativo.
            </DialogDescription>
          </DialogHeader>

          {selectedSubscription && (
            <div className="space-y-5 py-2">
              <div className="grid gap-3 rounded-md border p-4 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-muted-foreground">Restaurante</p>
                  <p className="font-medium">{selectedSubscription.restaurant?.name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Pagar.me</p>
                  <p className="font-mono text-xs">{selectedSubscription.pagarme_subscription_id}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status local</p>
                  <p>{selectedSubscription.status}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Próxima cobrança local</p>
                  <p>{formatDateTime(selectedSubscription.next_billing_at)}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pagarme-start-at">Nova data de início no Pagar.me</Label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    id="pagarme-start-at"
                    type="datetime-local"
                    value={startAtInput}
                    onChange={(event) => setStartAtInput(event.target.value)}
                  />
                  <Button
                    type="button"
                    onClick={handleUpdatePagarmeStartAt}
                    disabled={Boolean(pagarmeAction)}
                  >
                    {pagarmeAction === 'start_at' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Atualizar início
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  O Pagar.me não permite alterar para data anterior ao dia atual nem alterar assinatura que já começou.
                </p>
              </div>

              <div className="flex flex-wrap justify-between gap-2 border-t pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSyncPagarmeSubscription}
                  disabled={Boolean(pagarmeAction)}
                >
                  {pagarmeAction === 'sync' ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  Sincronizar status
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleCancelPagarmeSubscription}
                  disabled={Boolean(pagarmeAction)}
                >
                  {pagarmeAction === 'cancel' ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <XCircle className="mr-2 h-4 w-4" />
                  )}
                  Cancelar no Pagar.me
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminSubscriptions;
