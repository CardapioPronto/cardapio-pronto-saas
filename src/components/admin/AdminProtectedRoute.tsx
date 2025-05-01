
import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { Loader2 } from 'lucide-react';

interface AdminProtectedRouteProps {
  children: ReactNode;
}

export const AdminProtectedRoute = ({ children }: AdminProtectedRouteProps) => {
  const { user, loading: authLoading } = useAuth();
  const { isSuperAdmin, loading: adminLoading } = useSuperAdmin();
  
  const loading = authLoading || adminLoading;

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-green" />
        <span className="ml-2 text-lg">Verificando permissões...</span>
      </div>
    );
  }

  if (!user || !isSuperAdmin) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};
