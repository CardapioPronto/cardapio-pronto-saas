
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useUserSession } from "./useUserSession";
import { PermissionType } from "@/types/employee";

const ALL_PERMISSIONS: PermissionType[] = [
  'dashboard_view', 'subscription_view',
  'pdv_access', 'orders_view', 'orders_manage', 'orders_metrics_view',
  'products_view', 'products_manage',
  'reports_view', 'settings_view', 'settings_manage',
  'settings_establishment_manage', 'settings_system_manage', 'settings_integrations_manage',
  'employees_manage',
  'whatsapp_manage', 'whatsapp_manage_instances',
  'whatsapp_take_conversations', 'whatsapp_reply_as_human',
  'whatsapp_view_all_conversations', 'whatsapp_configure_automation',
];

// Gerente: tudo, exceto financeiro/equipe (que ficam só para o dono).
const MANAGER_PERMISSIONS: PermissionType[] = [
  'dashboard_view',
  'pdv_access', 'orders_view', 'orders_manage', 'orders_metrics_view',
  'products_view', 'products_manage',
  'reports_view', 'settings_view',
  'whatsapp_manage', 'whatsapp_manage_instances',
  'whatsapp_take_conversations', 'whatsapp_reply_as_human',
  'whatsapp_view_all_conversations', 'whatsapp_configure_automation',
];

export const usePermissionsV2 = () => {
  const { appUser, loading: sessionLoading } = useUserSession();
  const [userPermissions, setUserPermissions] = useState<PermissionType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUserPermissions = async () => {
    if (!appUser?.id) {
      setUserPermissions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Super admin: tudo
      if (appUser.role === 'super_admin') {
        setUserPermissions(ALL_PERMISSIONS);
        setLoading(false);
        return;
      }

      // Dono: tudo
      if (appUser.user_type === 'owner') {
        setUserPermissions(ALL_PERMISSIONS);
        setLoading(false);
        return;
      }

      // Gerente: preset operacional. Se tiver permissões extras gravadas
      // na tabela employee_permissions, são adicionadas (união).
      if (appUser.user_type === 'manager') {
        const { data: emp } = await supabase
          .from('employees')
          .select('id')
          .eq('user_id', appUser.id)
          .eq('is_active', true)
          .maybeSingle();

        let extra: PermissionType[] = [];
        if (emp?.id) {
          const { data: permsData } = await supabase
            .from('employee_permissions')
            .select('permission')
            .eq('employee_id', emp.id);
          extra = (permsData || []).map(p => p.permission as PermissionType);
        }

        setUserPermissions(Array.from(new Set([...MANAGER_PERMISSIONS, ...extra])));
        setLoading(false);
        return;
      }

      // Funcionário: só o que estiver explicitamente atribuído
      if (appUser.user_type === 'employee') {
        const { data: employeeData, error: employeeError } = await supabase
          .from('employees')
          .select('id')
          .eq('user_id', appUser.id)
          .eq('is_active', true)
          .maybeSingle();

        if (employeeError) throw employeeError;

        if (!employeeData) {
          setUserPermissions([]);
          setError('Sua conta de funcionário foi desativada. Entre em contato com o administrador.');
          setLoading(false);
          return;
        }

        const { data: permissionsData, error: permissionsError } = await supabase
          .from('employee_permissions')
          .select('permission')
          .eq('employee_id', employeeData.id);

        if (permissionsError) throw permissionsError;

        setUserPermissions(permissionsData?.map(p => p.permission as PermissionType) || []);
      } else {
        setUserPermissions([]);
      }
    } catch (err) {
      console.error('Erro ao buscar permissões:', err);
      setError('Erro ao carregar permissões');
      setUserPermissions([]);
    } finally {
      setLoading(false);
    }
  };

  const hasPermission = (permission: PermissionType): boolean =>
    userPermissions.includes(permission);

  const hasAnyPermission = (permissions: PermissionType[]): boolean =>
    permissions.some(p => userPermissions.includes(p));

  const hasAllPermissions = (permissions: PermissionType[]): boolean =>
    permissions.every(p => userPermissions.includes(p));

  const isOwner = (): boolean => appUser?.user_type === 'owner';
  const isManager = (): boolean => appUser?.user_type === 'manager';
  const isEmployee = (): boolean => appUser?.user_type === 'employee';
  const isOwnerOrManager = (): boolean =>
    appUser?.user_type === 'owner' || appUser?.user_type === 'manager';
  const isSuperAdmin = (): boolean => appUser?.role === 'super_admin';

  useEffect(() => {
    if (!sessionLoading) {
      fetchUserPermissions();
    }
  }, [appUser?.id, appUser?.user_type, sessionLoading]);

  return {
    userPermissions,
    userType: appUser?.user_type || null,
    loading: loading || sessionLoading,
    error,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isOwner,
    isManager,
    isEmployee,
    isOwnerOrManager,
    isSuperAdmin,
    refetch: fetchUserPermissions,
  };
};
