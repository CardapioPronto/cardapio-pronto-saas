
import { ReactNode, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { Loader2, ShieldAlert } from 'lucide-react';

interface AdminProtectedRouteProps {
  children: ReactNode;
}

export const AdminProtectedRoute = ({ children }: AdminProtectedRouteProps) => {
  const { user, loading: authLoading } = useAuth();
  const { isSuperAdmin, loading: adminLoading } = useSuperAdmin();
  const navigate = useNavigate();
  
  const loading = authLoading || adminLoading;

  useEffect(() => {
    if (!loading) {
      console.log("AdminProtectedRoute - Auth state:", { 
        user: user?.id,
        isAuthenticated: !!user,
        isSuperAdmin,
        authLoading,
        adminLoading
      });
      
      if (user && !isSuperAdmin) {
        console.log("User authenticated but not a super admin:", user.id);
      }
    }
  }, [loading, user, isSuperAdmin, authLoading, adminLoading]);

  if (loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-green mb-4" />
        <span className="text-lg font-medium">Verificando permissões de administrador...</span>
      </div>
    );
  }

  if (!user) {
    console.log("No authenticated user, redirecting to login");
    return <Navigate to="/login" replace />;
  }

  if (!isSuperAdmin) {
    console.log("User not a super admin, showing access denied");
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center">
        <ShieldAlert className="h-16 w-16 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Acesso Negado</h2>
        <p className="text-gray-600 mb-6">Você não possui permissões de super administrador.</p>
        <button 
          className="bg-primary text-white px-4 py-2 rounded"
          onClick={() => navigate('/dashboard')}
        >
          Voltar para o Dashboard
        </button>
      </div>
    );
  }

  return <>{children}</>;
};
