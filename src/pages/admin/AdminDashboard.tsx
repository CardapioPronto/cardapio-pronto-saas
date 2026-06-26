import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import AdminLayout from '@/components/admin/AdminLayout';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import {
  Users,
  Store,
  CreditCard,
  Activity,
  ClipboardCheck,
  AlertTriangle,
  LifeBuoy,
  MessageSquareWarning,
} from 'lucide-react';
import {
  listAdminOnboardingHealth,
  listAdminSupportTickets,
  listAllRestaurants,
  listSuperAdmins,
  listAllSubscriptions,
  updateAdminSupportTicketStatus,
  type AdminOnboardingHealthRow,
  type AdminOnboardingHealthStatus,
  type AdminSupportTicketPriority,
  type AdminSupportTicketStatus,
} from '@/services/adminService';
import { toast } from 'sonner';

const healthLabels: Record<AdminOnboardingHealthStatus, string> = {
  blocked: 'Travado',
  at_risk: 'Em risco',
  active: 'Ativo',
  ready_to_sell: 'Pronto para venda',
};

const healthClasses: Record<AdminOnboardingHealthStatus, string> = {
  blocked: 'border-red-200 bg-red-50 text-red-700',
  at_risk: 'border-amber-200 bg-amber-50 text-amber-800',
  active: 'border-sky-200 bg-sky-50 text-sky-800',
  ready_to_sell: 'border-green/30 bg-green/10 text-green',
};

const ticketStatusLabels: Record<AdminSupportTicketStatus, string> = {
  open: 'Aberto',
  in_progress: 'Em atendimento',
  waiting_customer: 'Aguardando cliente',
  resolved: 'Resolvido',
  closed: 'Fechado',
};

const ticketStatusClasses: Record<AdminSupportTicketStatus, string> = {
  open: 'border-red-200 bg-red-50 text-red-700',
  in_progress: 'border-sky-200 bg-sky-50 text-sky-800',
  waiting_customer: 'border-amber-200 bg-amber-50 text-amber-800',
  resolved: 'border-green/30 bg-green/10 text-green',
  closed: 'border-muted bg-muted text-muted-foreground',
};

const ticketPriorityLabels: Record<AdminSupportTicketPriority, string> = {
  low: 'Baixa',
  normal: 'Normal',
  high: 'Alta',
  urgent: 'Urgente',
};

const ticketPriorityClasses: Record<AdminSupportTicketPriority, string> = {
  low: 'border-muted bg-muted text-muted-foreground',
  normal: 'border-sky-200 bg-sky-50 text-sky-800',
  high: 'border-amber-200 bg-amber-50 text-amber-800',
  urgent: 'border-red-200 bg-red-50 text-red-700',
};

const formatDate = (value: string | null) => {
  if (!value) return 'Sem registro';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(new Date(value));
};

const countByHealth = (
  rows: AdminOnboardingHealthRow[],
  status: AdminOnboardingHealthStatus,
) => rows.filter((row) => row.healthStatus === status).length;

const AdminDashboard = () => {
  const queryClient = useQueryClient();

  const { data: restaurants, isLoading: isLoadingRestaurants } = useQuery({
    queryKey: ['admin-restaurants'],
    queryFn: () => listAllRestaurants()
  });

  const { data: admins, isLoading: isLoadingAdmins } = useQuery({
    queryKey: ['admin-super-admins'],
    queryFn: () => listSuperAdmins()
  });

  const { data: subscriptions, isLoading: isLoadingSubscriptions } = useQuery({
    queryKey: ['admin-subscriptions'],
    queryFn: () => listAllSubscriptions()
  });

  const { data: onboardingHealth = [], isLoading: isLoadingOnboarding } = useQuery({
    queryKey: ['admin-onboarding-health'],
    queryFn: () => listAdminOnboardingHealth(),
  });

  const { data: supportTickets = [], isLoading: isLoadingSupportTickets } = useQuery({
    queryKey: ['admin-support-tickets'],
    queryFn: () => listAdminSupportTickets(),
  });

  const updateTicketStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: AdminSupportTicketStatus }) =>
      updateAdminSupportTicketStatus(id, status),
    onSuccess: () => {
      toast.success('Status do chamado atualizado.');
      queryClient.invalidateQueries({ queryKey: ['admin-support-tickets'] });
    },
    onError: (error) => {
      console.error('Erro ao atualizar status do chamado:', error);
      toast.error('Nao foi possivel atualizar o chamado.');
    },
  });

  // Calculate active subscriptions
  const activeSubscriptions = subscriptions?.data?.filter(sub => sub.status === 'active');

  const onboardingStats = useMemo(() => ({
    blocked: countByHealth(onboardingHealth, 'blocked'),
    atRisk: countByHealth(onboardingHealth, 'at_risk'),
    active: countByHealth(onboardingHealth, 'active'),
    ready: countByHealth(onboardingHealth, 'ready_to_sell'),
  }), [onboardingHealth]);

  const priorityOnboardingRows = useMemo(() => {
    const order: Record<AdminOnboardingHealthStatus, number> = {
      blocked: 1,
      at_risk: 2,
      active: 3,
      ready_to_sell: 4,
    };

    return [...onboardingHealth]
      .sort((a, b) => order[a.healthStatus] - order[b.healthStatus] || a.progressPercent - b.progressPercent)
      .slice(0, 8);
  }, [onboardingHealth]);

  const supportTicketStats = useMemo(() => ({
    open: supportTickets.filter((ticket) => ticket.status === 'open').length,
    inProgress: supportTickets.filter((ticket) => ticket.status === 'in_progress').length,
    waitingCustomer: supportTickets.filter((ticket) => ticket.status === 'waiting_customer').length,
    resolved: supportTickets.filter((ticket) => ticket.status === 'resolved' || ticket.status === 'closed').length,
  }), [supportTickets]);

  const prioritySupportTickets = useMemo(
    () => supportTickets.filter((ticket) => ticket.status !== 'closed').slice(0, 8),
    [supportTickets],
  );
  
  // Calculate statistics
  const stats = {
    totalRestaurants: restaurants?.data?.length || 0,
    totalAdmins: admins?.admins?.length || 0,
    activeSubscriptions: activeSubscriptions?.length || 0,
    recentActivity: 0, // Placeholder for recent activity count
  };
  const isLoadingOverview = isLoadingRestaurants || isLoadingAdmins || isLoadingSubscriptions;

  return (
    <AdminLayout title="Dashboard Administrativo">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Restaurantes
            </CardTitle>
            <Store className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRestaurants}</div>
            <p className="text-xs text-muted-foreground">
              Restaurantes cadastrados
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Administradores
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAdmins}</div>
            <p className="text-xs text-muted-foreground">
              Super Admins
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Assinaturas Ativas
            </CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeSubscriptions}</div>
            <p className="text-xs text-muted-foreground">
              Planos ativos
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Atividades Recentes
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.recentActivity}</div>
            <p className="text-xs text-muted-foreground">
              Nas últimas 24h
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5 text-green" />
                Saúde de implantação
              </CardTitle>
              <CardDescription>
                Restaurantes priorizados por prontidão operacional para piloto, venda e suporte.
              </CardDescription>
            </div>
            <Badge variant="outline" className="w-fit">
              {onboardingHealth.length} restaurante{onboardingHealth.length === 1 ? '' : 's'} monitorado{onboardingHealth.length === 1 ? '' : 's'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-red-700">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">Travados</span>
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div className="mt-2 text-2xl font-bold">{onboardingStats.blocked}</div>
            </div>
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-800">
              <div className="text-sm font-medium">Em risco</div>
              <div className="mt-2 text-2xl font-bold">{onboardingStats.atRisk}</div>
            </div>
            <div className="rounded-md border border-sky-200 bg-sky-50 p-3 text-sky-800">
              <div className="text-sm font-medium">Ativos</div>
              <div className="mt-2 text-2xl font-bold">{onboardingStats.active}</div>
            </div>
            <div className="rounded-md border border-green/30 bg-green/10 p-3 text-green">
              <div className="text-sm font-medium">Prontos</div>
              <div className="mt-2 text-2xl font-bold">{onboardingStats.ready}</div>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Restaurante</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Progresso</TableHead>
                <TableHead>Próximo passo</TableHead>
                <TableHead>Base</TableHead>
                <TableHead>Último pedido</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingOnboarding || isLoadingOverview ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    Carregando saúde de implantação...
                  </TableCell>
                </TableRow>
              ) : priorityOnboardingRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    Nenhum restaurante cadastrado para acompanhar.
                  </TableCell>
                </TableRow>
              ) : (
                priorityOnboardingRows.map((row) => (
                  <TableRow key={row.restaurantId}>
                    <TableCell>
                      <div className="font-medium">{row.restaurantName}</div>
                      <div className="text-xs text-muted-foreground">
                        {row.slug ? `/${row.slug}` : 'Sem slug'} · criado em {formatDate(row.createdAt)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn('border', healthClasses[row.healthStatus])}>
                        {healthLabels[row.healthStatus]}
                      </Badge>
                    </TableCell>
                    <TableCell className="min-w-40">
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <span>{row.progressPercent}%</span>
                        <span className="text-muted-foreground">{row.completedSteps}/6</span>
                      </div>
                      <Progress value={row.progressPercent} className="mt-2 h-2" />
                    </TableCell>
                    <TableCell className="max-w-xs text-sm">{row.nextStep}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {row.availableProducts}/{row.totalProducts} produtos · {row.totalCategories} categoria{row.totalCategories === 1 ? '' : 's'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {row.totalOrders > 0 ? `${row.totalOrders} pedido${row.totalOrders === 1 ? '' : 's'} · ${formatDate(row.lastOrderAt)}` : 'Sem pedido teste'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <LifeBuoy className="h-5 w-5 text-green" />
                Chamados de suporte
              </CardTitle>
              <CardDescription>
                Acompanhe chamados abertos no app com contexto operacional da tela.
              </CardDescription>
            </div>
            <Badge variant="outline" className="w-fit">
              {supportTickets.length} chamado{supportTickets.length === 1 ? '' : 's'} recente{supportTickets.length === 1 ? '' : 's'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-red-700">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">Abertos</span>
                <MessageSquareWarning className="h-4 w-4" />
              </div>
              <div className="mt-2 text-2xl font-bold">{supportTicketStats.open}</div>
            </div>
            <div className="rounded-md border border-sky-200 bg-sky-50 p-3 text-sky-800">
              <div className="text-sm font-medium">Em atendimento</div>
              <div className="mt-2 text-2xl font-bold">{supportTicketStats.inProgress}</div>
            </div>
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-800">
              <div className="text-sm font-medium">Aguardando cliente</div>
              <div className="mt-2 text-2xl font-bold">{supportTicketStats.waitingCustomer}</div>
            </div>
            <div className="rounded-md border border-green/30 bg-green/10 p-3 text-green">
              <div className="text-sm font-medium">Resolvidos/fechados</div>
              <div className="mt-2 text-2xl font-bold">{supportTicketStats.resolved}</div>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Chamado</TableHead>
                <TableHead>Restaurante</TableHead>
                <TableHead>Prioridade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Abertura</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingSupportTickets ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    Carregando chamados de suporte...
                  </TableCell>
                </TableRow>
              ) : prioritySupportTickets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    Nenhum chamado recente para acompanhar.
                  </TableCell>
                </TableRow>
              ) : (
                prioritySupportTickets.map((ticket) => (
                  <TableRow key={ticket.id}>
                    <TableCell className="max-w-md">
                      <div className="font-medium">{ticket.subject}</div>
                      <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{ticket.message}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {ticket.screenTitle} · {ticket.pathname}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{ticket.restaurantName}</div>
                      <div className="text-xs text-muted-foreground">
                        {ticket.restaurantSlug ? `/${ticket.restaurantSlug}` : ticket.requesterEmail || 'Sem solicitante'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn('border', ticketPriorityClasses[ticket.priority])}>
                        {ticketPriorityLabels[ticket.priority]}
                      </Badge>
                    </TableCell>
                    <TableCell className="min-w-48">
                      <Select
                        value={ticket.status}
                        onValueChange={(status) => {
                          if (status === ticket.status) return;
                          updateTicketStatusMutation.mutate({
                            id: ticket.id,
                            status: status as AdminSupportTicketStatus,
                          });
                        }}
                        disabled={updateTicketStatusMutation.isPending}
                      >
                        <SelectTrigger className={cn('h-9 border', ticketStatusClasses[ticket.status])}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(ticketStatusLabels).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(ticket.createdAt)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AdminLayout>
  );
};

export default AdminDashboard;
