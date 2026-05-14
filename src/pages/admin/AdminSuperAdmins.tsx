import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import AdminLayout from '@/components/admin/AdminLayout';
import { AddAdminDialog } from '@/components/admin/AddAdminDialog';
import { RemoveAdminDialog } from '@/components/admin/RemoveAdminDialog';
import { SuperAdminsTable } from '@/components/admin/SuperAdminsTable';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { listSuperAdmins, type SuperAdminRecord } from '@/services/adminService';
import { AlertTriangle, Plus, RefreshCw, ShieldCheck, Users } from 'lucide-react';

const AdminSuperAdmins = () => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<SuperAdminRecord | null>(null);

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['super-admins'],
    queryFn: () => listSuperAdmins(),
  });

  const admins = useMemo(() => data?.admins ?? [], [data?.admins]);
  const currentAdmin = useMemo(
    () => admins.find((admin) => admin.is_current_user) || null,
    [admins],
  );

  const handleRemoveAdmin = (admin: SuperAdminRecord) => {
    setSelectedAdmin(admin);
    setIsRemoveDialogOpen(true);
  };

  const handleSuccess = () => {
    void refetch();
  };

  return (
    <AdminLayout title="Administradores">
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Super admins</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{admins.length}</div>
              <p className="text-xs text-muted-foreground">Acesso global ao painel</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sua sessão</CardTitle>
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="truncate text-lg font-semibold">
                {currentAdmin?.email || currentAdmin?.name || 'Super admin'}
              </div>
              <p className="truncate text-xs text-muted-foreground">
                {currentAdmin?.restaurant_name || 'Operações auditadas por usuário'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Modelo de acesso</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-semibold">Acesso total</div>
              <p className="text-xs text-muted-foreground">Sem níveis internos nesta versão</p>
            </CardContent>
          </Card>
        </div>

        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Módulo sensível</AlertTitle>
          <AlertDescription>
            Conceda acesso apenas a pessoas autorizadas. A criação e remoção passam por Edge Function com service role,
            validação de super admin e registro em log administrativo. Novos usuários são convidados no Auth e vinculados
            ao restaurante do admin atual como gerente.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Super Administradores</CardTitle>
              <CardDescription>
                Gerencie usuários com acesso global ao admin da Pubfy.
              </CardDescription>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                variant="outline"
                onClick={() => void refetch()}
                disabled={isFetching}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar admin
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Erro ao carregar administradores</AlertTitle>
                <AlertDescription>
                  {error instanceof Error ? error.message : 'Não foi possível carregar a lista.'}
                </AlertDescription>
              </Alert>
            )}

            <SuperAdminsTable
              data={admins}
              isLoading={isLoading}
              onRemove={handleRemoveAdmin}
            />
          </CardContent>
        </Card>
      </div>

      <AddAdminDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onSuccess={handleSuccess}
      />

      <RemoveAdminDialog
        open={isRemoveDialogOpen}
        onOpenChange={setIsRemoveDialogOpen}
        admin={selectedAdmin}
        onSuccess={handleSuccess}
      />
    </AdminLayout>
  );
};

export default AdminSuperAdmins;
