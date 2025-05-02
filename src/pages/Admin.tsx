
import React, { useEffect } from 'react';
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
  
  useEffect(() => {
    console.log("Admin page - Auth state:", { 
      user: user?.id, 
      isAuthenticated: !!user,
      isSuperAdmin,
      authLoading,
      adminLoading
    });
  }, [user, isSuperAdmin, authLoading, adminLoading]);
  
  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-green mr-2" />
        <span className="text-lg">Carregando...</span>
      </div>
    );
  }
  
  if (!user) {
    console.log("Admin page - No authenticated user, redirecting to login");
    // Redirecionar para login se não estiver autenticado
    navigate('/login');
    return null;
  }
  
  if (!isSuperAdmin) {
    console.log("Admin page - User not a super admin, redirecting to dashboard");
    // Usuário não é super admin, redirecionar para dashboard normal
    navigate('/dashboard');
    return null;
  }
  
  console.log("Admin page - Rendering admin dashboard for super admin");
  
  return (
    <AdminProtectedRoute>
      <AdminDashboard />
    </AdminProtectedRoute>
  );
};

export default Admin;
