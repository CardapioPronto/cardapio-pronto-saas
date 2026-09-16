import { useEffect, useMemo, useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { AdminTable } from '@/components/admin/AdminTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import {
  listAdminOnboardingHealth,
  type AdminOnboardingHealthRow,
  type AdminOnboardingHealthStatus,
} from '@/services/adminService';
import {
  AlertTriangle,
  CheckCircle2,
  CircleDollarSign,
  Loader2,
  RefreshCw,
  XCircle,
} from 'lucide-react';

const STATUS_CONFIG: Record<
  AdminOnboardingHealthStatus,
  { label: string; className: string; icon: typeof CheckCircle2 }
> = {
  blocked: {
    label: 'Bloqueado',
    className: 'bg-red-100 text-red-700 border-red-200',
    icon: XCircle,
  },
  at_risk: {
    label: 'Em risco',
    className: 'bg-amber-100 text-amber-700 border-amber-200',
    icon: AlertTriangle,
  },
  active: {
    label: 'Ativo',
    className: 'bg-blue-100 text-blue-700 border-blue-200',
    icon: CheckCircle2,
  },
  ready_to_sell: {
    label: 'Pronto p/ vender',
    className: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    icon: CircleDollarSign,
  },
};

type StatusFilter = 'all' | 'incomplete' | AdminOnboardingHealthStatus;

const formatDate = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
    : '—';

export default function AdminOnboarding() {
  const { toast } = useToast();
  const [rows, setRows] = useState<AdminOnboardingHealthRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('incomplete');
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const data = await listAdminOnboardingHealth();
      setRows(data);
    } catch (error) {
      toast({
        title: 'Erro ao carregar saúde do onboarding',
        description: error instanceof Error ? error.message : 'Tente novamente em instantes.',
        variant: 'destructive',
      });
      setRows(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const summary = useMemo(() => {
    const all = rows ?? [];
    return {
      total: all.length,
      blocked: all.filter((r) => r.healthStatus === 'blocked').length,
      atRisk: all.filter((r) => r.healthStatus === 'at_risk').length,
      active: all.filter((r) => r.healthStatus === 'active').length,
      ready: all.filter((r) => r.healthStatus === 'ready_to_sell').length,
    };
  }, [rows]);

  const filtered = useMemo(() => {
    const all = rows ?? [];
    const term = search.trim().toLowerCase();
    return all.filter((row) => {
      const statusOk =
        statusFilter === 'all'
          ? true
          : statusFilter === 'incomplete'
            ? row.healthStatus !== 'ready_to_sell'
            : row.healthStatus === statusFilter;
      if (!statusOk) return false;
      if (!term) return true;
      return (
        row.restaurantName.toLowerCase().includes(term) ||
        (row.slug ?? '').toLowerCase().includes(term)
      );
    });
  }, [rows, statusFilter, search]);

  const columns = [
    {
      header: 'Restaurante',
      accessorKey: 'restaurantName' as const,
      cell: (row: AdminOnboardingHealthRow) => (
        <div>
          <div className="font-medium">{row.restaurantName}</div>
          <div className="text-xs text-muted-foreground">
            {row.slug ? `/${row.slug}` : 'sem slug'} · criado em {formatDate(row.createdAt)}
          </div>
        </div>
      ),
    },
    {
      header: 'Status',
      accessorKey: 'healthStatus' as const,
      cell: (row: AdminOnboardingHealthRow) => {
        const cfg = STATUS_CONFIG[row.healthStatus];
        const Icon = cfg.icon;
        return (
          <Badge variant="outline" className={cfg.className}>
            <Icon className="mr-1 h-3 w-3" />
            {cfg.label}
          </Badge>
        );
      },
    },
    {
      header: 'Progresso',
      accessorKey: 'progressPercent' as const,
      cell: (row: AdminOnboardingHealthRow) => (
        <div className="min-w-[140px]">
          <div className="mb-1 text-xs text-muted-foreground">
            {row.progressPercent}% · {row.completedSteps} etapas
          </div>
          <Progress value={row.progressPercent} className="h-2" />
        </div>
      ),
    },
    {
      header: 'Cardápio',
      accessorKey: 'totalProducts' as const,
      cell: (row: AdminOnboardingHealthRow) => (
        <div className="text-sm">
          <div>{row.availableProducts}/{row.totalProducts} produtos disponíveis</div>
          <div className="text-xs text-muted-foreground">
            {row.totalCategories} categorias · tema {row.menuThemeConfigured ? 'configurado' : 'pendente'}
          </div>
        </div>
      ),
    },
    {
      header: 'Pedidos',
      accessorKey: 'totalOrders' as const,
      cell: (row: AdminOnboardingHealthRow) => (
        <div className="text-sm">
          <div>{row.totalOrders}</div>
          <div className="text-xs text-muted-foreground">último: {formatDate(row.lastOrderAt)}</div>
        </div>
      ),
    },
    {
      header: 'Próxima ação',
      accessorKey: 'nextStep' as const,
      cell: (row: AdminOnboardingHealthRow) => (
        <span className="text-sm">{row.nextStep}</span>
      ),
    },
  ];

  return (
    <AdminLayout title="Saúde do Onboarding">
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total</CardTitle></CardHeader>
            <CardContent className="text-2xl font-bold">{summary.total}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-red-700">Bloqueados</CardTitle></CardHeader>
            <CardContent className="text-2xl font-bold text-red-700">{summary.blocked}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-amber-700">Em risco</CardTitle></CardHeader>
            <CardContent className="text-2xl font-bold text-amber-700">{summary.atRisk}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-blue-700">Ativos</CardTitle></CardHeader>
            <CardContent className="text-2xl font-bold text-blue-700">{summary.active}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-emerald-700">Prontos p/ vender</CardTitle></CardHeader>
            <CardContent className="text-2xl font-bold text-emerald-700">{summary.ready}</CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <TabsList>
              <TabsTrigger value="incomplete">Incompletos</TabsTrigger>
              <TabsTrigger value="all">Todos</TabsTrigger>
              <TabsTrigger value="blocked">Bloqueados</TabsTrigger>
              <TabsTrigger value="at_risk">Em risco</TabsTrigger>
              <TabsTrigger value="ready_to_sell">Prontos</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex gap-2">
            <Input
              placeholder="Buscar por nome ou slug..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-64"
            />
            <Button variant="outline" onClick={() => void load()} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            <AdminTable
              data={filtered as unknown as Record<string, unknown>[]}
              isLoading={loading}
              columns={columns as never}
              emptyMessage="Nenhum restaurante encontrado para este filtro."
            />
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
