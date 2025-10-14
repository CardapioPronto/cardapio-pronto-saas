
import { ReactNode, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useUserSession } from '@/hooks/useUserSession';
import { usePermissionsV2 } from '@/hooks/usePermissionsV2';
import { PermissionType } from '@/types/employee';
import { Card, CardContent } from '@/components/ui/card';
import { ShieldAlert, Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredPermissions?: PermissionType[];
  requireAny?: boolean; // Se true, precisa de apenas uma das permissões. Se false, precisa de todas
  redirectOnDenied?: string; // Redirecionar quando não tiver permissão
}

export const ProtectedRoute = ({ 
  children, 
  requiredPermissions = [], 
  requireAny = false,
  redirectOnDenied
}: ProtectedRouteProps) => {
  const { appUser, loading: sessionLoading } = useUserSession();
  const { hasPermission, hasAnyPermission, loading: permissionsLoading } = usePermissionsV2();
  const location = useLocation();

  const loading = sessionLoading || permissionsLoading;

  useEffect(() => {
    if (!loading) {
      console.log('ProtectedRoute - Auth state:', { 
        user: appUser?.id,
        userType: appUser?.user_type,
        restaurantId: appUser?.restaurant_id,
        requiredPermissions,
        currentPath: location.pathname
      });
    }
  }, [loading, appUser, requiredPermissions, location.pathname]);

  if (loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <span className="text-lg font-medium">Carregando...</span>
      </div>
    );
  }

  if (!appUser) {
    console.log("No authenticated user, redirecting to login");
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Verificar se o usuário tem as permissões necessárias
  if (requiredPermissions.length > 0) {
    const hasRequiredPermissions = requireAny 
      ? hasAnyPermission(requiredPermissions)
      : requiredPermissions.every(permission => hasPermission(permission));

    if (!hasRequiredPermissions) {
      console.log("User doesn't have required permissions:", {
        required: requiredPermissions,
        requireAny,
        userType: appUser?.user_type
      });
      
      if (redirectOnDenied) {
        return <Navigate to={redirectOnDenied} replace />;
      }
      return (
        <div className="h-screen w-screen flex flex-col items-center justify-center p-4">
          <Card className="max-w-md w-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <ShieldAlert className="h-16 w-16 text-red-500 mb-4" />
              <h2 className="text-2xl font-bold mb-2">Acesso Negado</h2>
              <p className="text-gray-600 text-center mb-6">
                Você não possui permissões para acessar esta página.
              </p>
              <p className="text-sm text-muted-foreground text-center">
                Permissões necessárias: {requiredPermissions.join(', ')}
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }
  }

  return <>{children}</>;
};
