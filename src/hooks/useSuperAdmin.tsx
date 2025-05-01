
import { useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/lib/supabase';

export function useSuperAdmin() {
  const { user } = useAuth();
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function checkSuperAdminStatus() {
      if (!user) {
        setIsSuperAdmin(false);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .rpc('is_super_admin', { user_id: user.id });
        
        if (error) {
          console.error('Erro ao verificar status de super admin:', error);
          setIsSuperAdmin(false);
        } else {
          setIsSuperAdmin(!!data);
        }
      } catch (error) {
        console.error('Erro ao verificar status de super admin:', error);
        setIsSuperAdmin(false);
      } finally {
        setLoading(false);
      }
    }

    checkSuperAdminStatus();
  }, [user]);

  return { isSuperAdmin, loading };
}
