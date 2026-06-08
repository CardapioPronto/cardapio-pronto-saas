
import { useEffect, useRef, useState } from 'react';
import { useAuth } from './useAuthContext';
import { supabase } from '@/lib/supabase';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

const ADMIN_CHECK_TIMEOUT_MS = 10000;

function withTimeout<T>(operation: PromiseLike<T>, timeoutMs: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      reject(new Error(`${label} demorou para responder`));
    }, timeoutMs);

    Promise.resolve(operation)
      .then(resolve)
      .catch(reject)
      .finally(() => window.clearTimeout(timeout));
  });
}

export function useSuperAdmin() {
  const { user } = useAuth();
  const { isOnline, isChecking } = useNetworkStatus();
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const requestIdRef = useRef(0);

  useEffect(() => {
    let active = true;

    async function checkSuperAdminStatus() {
      const requestId = ++requestIdRef.current;

      if (!user) {
        setIsSuperAdmin(false);
        setLoading(false);
        return;
      }

      if (!isOnline || isChecking) {
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        // First check the RPC function
        const { data: rpcData, error: rpcError } = await withTimeout(
          supabase.rpc('is_super_admin', { user_id: user.id }),
          ADMIN_CHECK_TIMEOUT_MS,
          'Verificação de super admin',
        );
        if (!active || requestId !== requestIdRef.current) return;
        
        if (rpcError) {
          console.error('Erro ao verificar status de super admin via RPC:', rpcError);
          
          // Fallback: direct query of the system_admins table
          const { data: adminData, error: adminError } = await withTimeout(
            supabase
              .from('system_admins')
              .select('user_id')
              .eq('user_id', user.id)
              .maybeSingle(),
            ADMIN_CHECK_TIMEOUT_MS,
            'Consulta de super admin',
          );
          if (!active || requestId !== requestIdRef.current) return;
            
          if (adminError) {
            console.error('Erro ao verificar status de super admin via tabela:', adminError);
            setIsSuperAdmin(false);
          } else {
            const isAdmin = !!adminData;
            setIsSuperAdmin(isAdmin);
          }
        } else {
          setIsSuperAdmin(!!rpcData);
        }
      } catch (error) {
        if (!active || requestId !== requestIdRef.current) return;
        console.error('Erro ao verificar status de super admin:', error);
        setIsSuperAdmin(false);
      } finally {
        if (active && requestId === requestIdRef.current) setLoading(false);
      }
    }

    checkSuperAdminStatus();

    const handleVisible = () => {
      if (document.visibilityState === 'visible') {
        checkSuperAdminStatus();
      }
    };
    const handleFocus = () => checkSuperAdminStatus();

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisible);

    return () => {
      active = false;
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisible);
    };
  }, [isChecking, isOnline, user]);

  return { isSuperAdmin, loading };
}
