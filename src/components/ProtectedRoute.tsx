
import { ReactNode, useEffect, useMemo } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useUserSession } from '@/hooks/useUserSession';
import { usePermissionsV2 } from '@/hooks/usePermissionsV2';
import { PermissionType } from '@/types/employee';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldAlert, Loader2, ArrowLeft, Home } from 'lucide-react';

const PERMISSION_LABELS: Record<PermissionType, string> = {
  dashboard_view: 'Ver Dashboard',
  subscription_view: 'Ver Assinatura',
  pdv_access: 'Acessar PDV',
  orders_view: 'Ver Pedidos',
  orders_manage: 'Gerenciar Pedidos',
  orders_metrics_view: 'Ver valores e indicadores de pedidos',
  products_view: 'Ver Produtos',
  products_manage: 'Gerenciar Produtos',
  reports_view: 'Ver Relatórios',
  settings_view: 'Ver Configurações',
  settings_manage: 'Gerenciar Configurações',
  settings_establishment_manage: 'Editar Estabelecimento',
  settings_system_manage: 'Editar Sistema',
  settings_integrations_manage: 'Gerenciar Integrações',
  settings_audit_view: 'Ver Auditoria',
  employees_manage: 'Gerenciar Funcionários',
  whatsapp_manage: 'Gerenciar WhatsApp',
  whatsapp_manage_instances: 'Gerenciar Instâncias',
  whatsapp_take_conversations: 'Assumir Conversas',
  whatsapp_reply_as_human: 'Responder como Humano',
  whatsapp_view_all_conversations: 'Ver Todas as Conversas',
  whatsapp_configure_automation: 'Configurar Automação',
};

interface ProtectedRouteProps {
  children: ReactNode;
  requiredPermissions?: PermissionType[];
  requireAny?: boolean; // Se true, precisa de apenas uma das permissões. Se false, precisa de todas
  redirectOnDenied?: string; // Redirecionar quando não tiver permissão
}

// Resolve a página de fallback para usuários sem a permissão pedida.
function pickFallbackRoute(perms: PermissionType[]): string {
  if (perms.includes('dashboard_view')) return '/dashboard';
  if (perms.includes('pdv_access')) return '/pdv';
  if (perms.includes('orders_view')) return '/pedidos';
  if (perms.includes('whatsapp_manage') || perms.includes('whatsapp_take_conversations')) return '/atendimento';
  if (perms.includes('products_view')) return '/produtos';
  if (perms.includes('reports_view')) return '/relatorios';
  return '/login';
}

export const ProtectedRoute = ({ 
  children, 
  requiredPermissions = [], 
  requireAny = false,
  redirectOnDenied
}: ProtectedRouteProps) => {
  const { appUser, loading: sessionLoading } = useUserSession();
  const { hasPermission, hasAnyPermission, userPermissions, loading: permissionsLoading, error: permissionsError } = usePermissionsV2();
  const location = useLocation();
  const navigate = useNavigate();

  const loading = sessionLoading || permissionsLoading;
  const fallback = useMemo(() => pickFallbackRoute(userPermissions), [userPermissions]);

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

  // Funcionário desativado — força logout/redirect
  if (permissionsError) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center p-4 bg-background">
        <Card className="max-w-md w-full">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <ShieldAlert className="h-16 w-16 text-destructive mb-4" />
            <h2 className="text-2xl font-bold mb-2">Conta indisponível</h2>
            <p className="text-muted-foreground mb-6">{permissionsError}</p>
            <Button onClick={() => navigate('/login', { replace: true })}>Voltar ao login</Button>
          </CardContent>
        </Card>
      </div>
    );
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

      const labels = requiredPermissions.map((p) => PERMISSION_LABELS[p] ?? p);

      return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 bg-background">
          <Card className="max-w-md w-full border-destructive/30">
            <CardContent className="flex flex-col items-center justify-center py-10 text-center">
              <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                <ShieldAlert className="h-8 w-8 text-destructive" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Acesso negado</h2>
              <p className="text-muted-foreground mb-4">
                Você não tem permissão para acessar esta página. Fale com o administrador se acredita que deveria ter acesso.
              </p>
              <div className="w-full bg-muted/40 rounded-md p-3 mb-6 text-left">
                <p className="text-xs font-semibold text-muted-foreground mb-1">
                  Permiss{labels.length > 1 ? 'ões' : 'ão'} necess{labels.length > 1 ? 'árias' : 'ária'}:
                </p>
                <ul className="text-sm space-y-1">
                  {labels.map((label) => (
                    <li key={label} className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
                      {label}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full">
                <Button variant="outline" className="flex-1" onClick={() => navigate(-1)}>
                  <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
                </Button>
                <Button className="flex-1" onClick={() => navigate(fallback, { replace: true })}>
                  <Home className="h-4 w-4 mr-2" /> Ir para início
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }
  }

  return <>{children}</>;
};
