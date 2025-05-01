
import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';
import AdminDashboard from './admin/AdminDashboard';
import { AdminProtectedRoute } from '@/components/admin/AdminProtectedRoute';

const Admin = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isSuperAdmin, loading: adminLoading } = useSuperAdmin();
  
  const loading = authLoading || adminLoading;
  
  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-green" />
        <span className="ml-2 text-lg">Carregando...</span>
      </div>
    );
  }
  
  if (!user) {
    // Redirecionar para login se não estiver autenticado
    navigate('/login');
    return null;
  }
  
  if (!isSuperAdmin) {
    // Usuário não é super admin, redirecionar para dashboard normal
    navigate('/dashboard');
    return null;
  }
  
  return (
    <AdminProtectedRoute>
      <AdminDashboard />
    </AdminProtectedRoute>
  );
};

export default Admin;
