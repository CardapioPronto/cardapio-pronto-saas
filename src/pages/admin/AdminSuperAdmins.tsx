
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { listSuperAdmins } from '@/services/adminService';
import { AddAdminDialog } from '@/components/admin/AddAdminDialog';
import { RemoveAdminDialog } from '@/components/admin/RemoveAdminDialog';
import { SuperAdminsTable } from '@/components/admin/SuperAdminsTable';

interface SuperAdmin {
  user_id: string;
  notes?: string;
  created_at: string;
  created_by?: string;
}

const AdminSuperAdmins = () => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['super-admins'],
    queryFn: () => listSuperAdmins()
  });

  const handleRemoveAdmin = (adminId: string) => {
    setSelectedAdmin(adminId);
    setIsRemoveDialogOpen(true);
  };

  return (
    <AdminLayout title="Gerenciar Super Administradores">
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
          </div>
        </CardHeader>
        <CardContent>
          <SuperAdminsTable 
            data={data?.data as SuperAdmin[] | null}
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
