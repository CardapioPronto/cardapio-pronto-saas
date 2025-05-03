import React from 'react';
import { useQuery } from '@tanstack/react-query';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Store, CreditCard, Activity } from 'lucide-react';
import { listAllRestaurants, listSuperAdmins, listAllSubscriptions } from '@/services/adminService';

const AdminDashboard = () => {
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

  // Calculate active subscriptions
  const activeSubscriptions = subscriptions?.data?.filter(sub => sub.status === 'active');
  
  // Calculate statistics
  const stats = {
    totalRestaurants: restaurants?.data?.length || 0,
    totalAdmins: admins?.data?.length || 0,
    activeSubscriptions: activeSubscriptions?.length || 0,
    recentActivity: 0 // Placeholder for recent activity count
  };

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

      {/* Additional dashboard content can be added here */}
    </AdminLayout>
  );
};

export default AdminDashboard;
