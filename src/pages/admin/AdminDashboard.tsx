
import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, CreditCard, Building, ShieldCheck } from 'lucide-react';
import { listAllSubscriptions, listAllRestaurants, listSuperAdmins } from '@/services/adminService';

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalClients: 0,
    activeSubscriptions: 0,
    totalRestaurants: 0,
    totalAdmins: 0
  });

  const { data: subscriptions } = useQuery({
    queryKey: ['admin-subscriptions'],
    queryFn: () => listAllSubscriptions()
  });

  const { data: restaurants } = useQuery({
    queryKey: ['admin-restaurants'],
    queryFn: () => listAllRestaurants()
  });

  const { data: admins } = useQuery({
    queryKey: ['admin-super-admins'],
    queryFn: () => listSuperAdmins()
  });

  useEffect(() => {
    // Calcular estatísticas
    if (subscriptions?.data) {
      const clients = new Set();
      let active = 0;
      
      subscriptions.data.forEach(sub => {
        clients.add(sub.restaurant.owner_id);
        if (sub.status === 'ativa') active++;
      });
      
      setStats(prev => ({ 
        ...prev, 
        totalClients: clients.size,
        activeSubscriptions: active
      }));
    }
    
    if (restaurants?.data) {
      setStats(prev => ({ ...prev, totalRestaurants: restaurants.data.length }));
    }
    
    if (admins?.data) {
      setStats(prev => ({ ...prev, totalAdmins: admins.data.length }));
    }
  }, [subscriptions, restaurants, admins]);

  const statCards = [
    { 
      title: 'Total de Clientes', 
      value: stats.totalClients, 
      icon: Users, 
      color: 'bg-blue-100 text-blue-700' 
    },
    { 
      title: 'Assinaturas Ativas', 
      value: stats.activeSubscriptions, 
      icon: CreditCard, 
      color: 'bg-green-100 text-green-700' 
    },
    { 
      title: 'Total de Restaurantes', 
      value: stats.totalRestaurants, 
      icon: Building, 
      color: 'bg-amber-100 text-amber-700' 
    },
    { 
      title: 'Super Administradores', 
      value: stats.totalAdmins, 
      icon: ShieldCheck, 
      color: 'bg-purple-100 text-purple-700' 
    }
  ];

  return (
    <AdminLayout title="Dashboard Administrativo">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card, i) => (
          <Card key={i}>
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{card.title}</p>
                <h3 className="text-2xl font-bold mt-1">{card.value}</h3>
              </div>
              <div className={`p-3 rounded-full ${card.color}`}>
                <card.icon className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 mt-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Assinaturas Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {subscriptions?.data?.slice(0, 5).map((sub) => (
                <div key={sub.id} className="flex justify-between items-center border-b pb-3">
                  <div>
                    <p className="font-medium">{sub.restaurant?.name || 'Restaurante sem nome'}</p>
                    <p className="text-sm text-muted-foreground">
                      Plano: {sub.plan_id} - Status: <span className={`font-medium ${sub.status === 'ativa' ? 'text-green-600' : 'text-red-600'}`}>{sub.status}</span>
                    </p>
                  </div>
                  <span className="text-sm">
                    {new Date(sub.start_date).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              ))}
              {!subscriptions?.data?.length && (
                <p className="text-muted-foreground text-sm">Nenhuma assinatura encontrada</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Restaurantes Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {restaurants?.data?.slice(0, 5).map((restaurant) => (
                <div key={restaurant.id} className="flex justify-between items-center border-b pb-3">
                  <div>
                    <p className="font-medium">{restaurant.name}</p>
                    <p className="text-sm text-muted-foreground">ID: {restaurant.id.substring(0, 8)}...</p>
                  </div>
                  <span className="text-sm">
                    {new Date(restaurant.created_at).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              ))}
              {!restaurants?.data?.length && (
                <p className="text-muted-foreground text-sm">Nenhum restaurante encontrado</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
