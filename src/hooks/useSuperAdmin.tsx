
import { useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/lib/supabase';

export function useSuperAdmin() {
  const { user } = useAuth();
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function checkSuperAdminStatus() {
      setLoading(true);
      
      if (!user) {
        setIsSuperAdmin(false);
        setLoading(false);
        return;
      }

      try {
        console.log("Checking super admin status for user:", user.id);
        
        // First check the RPC function
        const { data: rpcData, error: rpcError } = await supabase
          .rpc('is_super_admin', { user_id: user.id });
        
        if (rpcError) {
          console.error('Erro ao verificar status de super admin via RPC:', rpcError);
          
          // Fallback: direct query of the system_admins table
          const { data: adminData, error: adminError } = await supabase
            .from('system_admins')
            .select('user_id')
            .eq('user_id', user.id)
            .maybeSingle();
            
          if (adminError) {
            console.error('Erro ao verificar status de super admin via tabela:', adminError);
            setIsSuperAdmin(false);
          } else {
            const isAdmin = !!adminData;
            console.log("Admin status via direct query:", isAdmin, adminData);
            setIsSuperAdmin(isAdmin);
          }
        } else {
          console.log("Admin status via RPC:", rpcData);
          setIsSuperAdmin(!!rpcData);
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
