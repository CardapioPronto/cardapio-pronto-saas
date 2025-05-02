
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, User } from 'lucide-react';
import { listSuperAdmins } from '@/services/adminService';
import { AddAdminDialog } from '@/components/admin/AddAdminDialog';
import { CreateAdminDialog } from '@/components/admin/CreateAdminDialog';
import { RemoveAdminDialog } from '@/components/admin/RemoveAdminDialog';
import { SuperAdminsTable } from '@/components/admin/SuperAdminsTable';

const AdminSuperAdmins = () => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isCreateUserDialogOpen, setIsCreateUserDialogOpen] = useState(false);
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<string | null>(null);
  const [showInitialAdminOption, setShowInitialAdminOption] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['super-admins'],
    queryFn: () => listSuperAdmins()
  });

  useEffect(() => {
    // Verificar se não há super admins para mostrar opção de criar inicial
    setShowInitialAdminOption(!data?.data?.length);
  }, [data?.data]);

  const handleRemoveAdmin = (adminId: string) => {
    setSelectedAdmin(adminId);
    setIsRemoveDialogOpen(true);
  };

  return (
    <AdminLayout title="Gerenciar Super Administradores">
      {showInitialAdminOption && (
        <Alert className="mb-6 bg-amber-50 border-amber-400">
          <AlertDescription className="flex flex-col gap-3">
            <div>Nenhum super administrador encontrado. Crie o primeiro super administrador para gerenciar o sistema.</div>
            <Button 
              onClick={() => setIsCreateUserDialogOpen(true)} 
              className="w-fit bg-amber-500 hover:bg-amber-600"
            >
              <User className="mr-2 h-4 w-4" />
              Criar Admin Inicial
            </Button>
          </AlertDescription>
        </Alert>
      )}
      
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Super Administradores</CardTitle>
          <div className="flex gap-2">
            <Button 
              onClick={() => setIsAddDialogOpen(true)} 
              className="bg-green hover:bg-green/80"
            >
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Admin Existente
            </Button>
            <Button 
              onClick={() => setIsCreateUserDialogOpen(true)} 
              variant="outline"
            >
              <User className="mr-2 h-4 w-4" />
              Criar Novo Admin
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <SuperAdminsTable 
            data={data?.data}
            isLoading={isLoading}
            onRemove={handleRemoveAdmin}
          />
        </CardContent>
      </Card>

      {/* Dialogs */}
      <AddAdminDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onSuccess={refetch}
      />
      
      <CreateAdminDialog
        open={isCreateUserDialogOpen}
        onOpenChange={setIsCreateUserDialogOpen}
        onSuccess={refetch}
      />
      
      <RemoveAdminDialog
        open={isRemoveDialogOpen}
        onOpenChange={setIsRemoveDialogOpen}
        adminId={selectedAdmin}
        onSuccess={refetch}
      />
    </AdminLayout>
  );
};

export default AdminSuperAdmins;
