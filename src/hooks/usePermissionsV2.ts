
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
      // Usar a função do banco para buscar permissões
      const { data, error } = await supabase.rpc('get_user_permissions', {
        user_id_param: appUser.id
      });

      if (error) throw error;

      setUserPermissions(data?.map(p => p.permission) || []);
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
