
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useUserSession } from "./useUserSession";
import { PermissionType } from "@/types/employee";

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
      // Se for super admin, tem todas as permissões
      if (appUser.role === 'super_admin') {
        setUserPermissions([
          'dashboard_view', 'subscription_view',
          'pdv_access', 'orders_view', 'orders_manage', 'products_view', 
          'products_manage', 'reports_view', 'settings_view', 
          'settings_manage', 'employees_manage'
        ]);
        setLoading(false);
        return;
      }

      // Se for dono do restaurante, tem todas as permissões
      if (appUser.user_type === 'owner') {
        setUserPermissions([
          'dashboard_view', 'subscription_view',
          'pdv_access', 'orders_view', 'orders_manage', 'products_view', 
          'products_manage', 'reports_view', 'settings_view', 
          'settings_manage', 'employees_manage'
        ]);
        setLoading(false);
        return;
      }

      // Se for funcionário, buscar permissões específicas do banco
      if (appUser.user_type === 'employee') {
        const { data: employeeData, error: employeeError } = await supabase
          .from('employees')
          .select('id')
          .eq('user_id', appUser.id)
          .eq('is_active', true)
          .single();

        if (employeeError || !employeeData) {
          throw new Error('Funcionário não encontrado ou inativo');
        }

        const { data: permissionsData, error: permissionsError } = await supabase
          .from('employee_permissions')
          .select('permission')
          .eq('employee_id', employeeData.id);

        if (permissionsError) {
          throw permissionsError;
        }

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

  const hasPermission = (permission: PermissionType): boolean => {
    return userPermissions.includes(permission);
  };

  const hasAnyPermission = (permissions: PermissionType[]): boolean => {
    return permissions.some(permission => userPermissions.includes(permission));
  };

  const isOwner = (): boolean => {
    return appUser?.user_type === 'owner';
  };

  const isEmployee = (): boolean => {
    return appUser?.user_type === 'employee';
  };

  const isSuperAdmin = (): boolean => {
    return appUser?.role === 'super_admin';
  };

  useEffect(() => {
    if (!sessionLoading) {
      fetchUserPermissions();
    }
  }, [appUser?.id, sessionLoading]);

  return {
    userPermissions,
    userType: appUser?.user_type || null,
    loading: loading || sessionLoading,
    error,
    hasPermission,
    hasAnyPermission,
    isOwner,
    isEmployee,
    isSuperAdmin,
    refetch: fetchUserPermissions
  };
};
