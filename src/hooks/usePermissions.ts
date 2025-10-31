
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useCurrentUser } from "./useCurrentUser";
import { PermissionType } from "@/types/employee";

export const usePermissions = () => {
  const { user } = useCurrentUser();
  const [userPermissions, setUserPermissions] = useState<PermissionType[]>([]);
  const [userType, setUserType] = useState<'owner' | 'employee' | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserPermissions = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Buscar tipo de usuário
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('user_type')
        .eq('id', user.id)
        .single();

      if (userError) throw userError;

      setUserType(userData.user_type || 'owner');

      // Se for dono, tem todas as permissões
      if (userData.user_type === 'owner') {
        setUserPermissions([
          'dashboard_view',
          'subscription_view',
          'pdv_access',
          'orders_view',
          'orders_manage',
          'products_view',
          'products_manage',
          'reports_view',
          'settings_view',
          'settings_manage',
          'employees_manage'
        ]);
      } else {
        // Se for funcionário, buscar permissões específicas
        const { data: employeeData, error: employeeError } = await supabase
          .from('employees')
          .select('id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single();

        if (employeeError) throw employeeError;

        const { data: permissionsData, error: permissionsError } = await supabase
          .from('employee_permissions')
          .select('permission')
          .eq('employee_id', employeeData.id);

        if (permissionsError) throw permissionsError;

        setUserPermissions(permissionsData?.map(p => p.permission) || []);
      }
    } catch (error) {
      console.error('Erro ao buscar permissões:', error);
      setUserPermissions([]);
      setUserType(null);
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
    return userType === 'owner';
  };

  const isEmployee = (): boolean => {
    return userType === 'employee';
  };

  useEffect(() => {
    fetchUserPermissions();
  }, [user?.id]);

  return {
    userPermissions,
    userType,
    loading,
    hasPermission,
    hasAnyPermission,
    isOwner,
    isEmployee,
    refetch: fetchUserPermissions
  };
};
