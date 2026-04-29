
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Session, User as AuthUser } from '@supabase/supabase-js';
import { User as AppUser } from '@/types/user';

interface UserSession {
  session: Session | null;
  authUser: AuthUser | null;
  appUser: AppUser | null;
  loading: boolean;
  error: string | null;
}

const SESSION_TIMEOUT_MS = 10000;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      reject(new Error(`${label} demorou para responder`));
    }, timeoutMs);

    promise
      .then(resolve)
      .catch(reject)
      .finally(() => window.clearTimeout(timeout));
  });
}

export const useUserSession = (): UserSession => {
  const [session, setSession] = useState<Session | null>(null);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const fetchUserProfile = useCallback(async (userId: string): Promise<AppUser | null> => {
    try {
      const { data, error } = await withTimeout(
        supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .maybeSingle(),
        SESSION_TIMEOUT_MS,
        'Busca do perfil do usuário',
      );

      if (error || !data) throw error || new Error('Usuário não encontrado');
      
      // Garantir que o nome nunca seja null para compatibilidade
      return {
        ...data,
        name: data.name || data.email || 'Usuário'
      } as AppUser;
    } catch (err) {
      console.error('Erro ao buscar perfil do usuário:', err);
      return null;
    }
  }, []);

  useEffect(() => {
    let active = true;

    const applySession = async (nextSession: Session | null, shouldShowLoading: boolean) => {
      const requestId = ++requestIdRef.current;
      if (shouldShowLoading) setLoading(true);

      try {
        if (!active) return;
        setSession(nextSession);
        setAuthUser(nextSession?.user ?? null);
        setError(null);

        if (nextSession?.user) {
          const profile = await fetchUserProfile(nextSession.user.id);
          if (!active || requestId !== requestIdRef.current) return;
          setAppUser(profile);
        } else {
          setAppUser(null);
        }
      } catch (err) {
        if (!active || requestId !== requestIdRef.current) return;
        console.error('Erro ao aplicar sessão:', err);
        setSession(null);
        setAuthUser(null);
        setAppUser(null);
        setError('Erro ao carregar sessão');
      } finally {
        if (active && requestId === requestIdRef.current) setLoading(false);
      }
    };

    const refreshSession = async (shouldShowLoading = false) => {
      const requestId = ++requestIdRef.current;
      if (shouldShowLoading) setLoading(true);

      try {
        const { data: { session } } = await withTimeout(
          supabase.auth.getSession(),
          SESSION_TIMEOUT_MS,
          'Busca da sessão',
        );
        if (!active || requestId !== requestIdRef.current) return;
        await applySession(session, false);
      } catch (err) {
        if (!active || requestId !== requestIdRef.current) return;
        console.error('Erro ao buscar sessão:', err);
        setSession(null);
        setAuthUser(null);
        setAppUser(null);
        setError('Erro ao carregar sessão');
        setLoading(false);
      }
    };

    refreshSession(true);

    // Escutar mudanças na autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id);
        await applySession(session, false);
      }
    );

    const handleVisible = () => {
      if (document.visibilityState === 'visible') {
        refreshSession(false);
      }
    };

    const handleFocus = () => refreshSession(false);

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisible);

    return () => {
      active = false;
      subscription.unsubscribe();
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisible);
    };
  }, [fetchUserProfile]);

  return {
    session,
    authUser,
    appUser,
    loading,
    error
  };
};
