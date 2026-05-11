
import React, { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { useAuth } from '@/hooks/useAuthContext';
import { Loader2 } from 'lucide-react';
import AdminDashboard from './admin/AdminDashboard';
import { AdminProtectedRoute } from '@/components/admin/AdminProtectedRoute';
import { createLogger } from '@/lib/log';

const log = createLogger('admin');

const Admin = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isSuperAdmin, loading: adminLoading } = useSuperAdmin();

  const loading = authLoading || adminLoading;

  useEffect(() => {
    log.debug('auth state', {
      userId: user?.id,
      isAuthenticated: !!user,
      isSuperAdmin,
      authLoading,
      adminLoading,
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
    log.debug('no authenticated user, redirecting to login');
    navigate('/login');
    return null;
  }

  if (!isSuperAdmin) {
    log.debug('user is not super admin, redirecting to dashboard');
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
