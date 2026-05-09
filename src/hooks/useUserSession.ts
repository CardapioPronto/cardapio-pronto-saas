
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Session, User as AuthUser } from '@supabase/supabase-js';
import { User as AppUser } from '@/types/user';
import { finalizeOwnerSignupIfNeeded } from '@/services/ownerSignupService';

interface UserSession {
  session: Session | null;
  authUser: AuthUser | null;
  appUser: AppUser | null;
  loading: boolean;
  error: string | null;
}

const SESSION_TIMEOUT_MS = 10_000;
const DEBOUNCE_MS = 2_000;
const PROFILE_UPDATED_EVENT = 'profile-updated';

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

export const useUserSession = (): UserSession => {
  const [session, setSession] = useState<Session | null>(null);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const lastUserIdRef = useRef<string | null>(null);
  const debounceTimerRef = useRef<number | null>(null);

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

    /**
     * Aplica uma sessão recebida. Só atualiza o estado se o userId mudou
     * (ou se é o carregamento inicial), evitando re-renders desnecessários.
     */
    const applySession = async (
      nextSession: Session | null,
      isInitial: boolean,
    ) => {
      const requestId = ++requestIdRef.current;
      const nextUserId = nextSession?.user?.id ?? null;

      // Se não é a carga inicial e o userId não mudou, não mexe em nada.
      if (!isInitial && nextUserId === lastUserIdRef.current) return;

      if (isInitial) setLoading(true);

      try {
        if (!active) return;
        lastUserIdRef.current = nextUserId;
        setSession(nextSession);
        setAuthUser(nextSession?.user ?? null);
        setError(null);

        if (nextSession?.user) {
          const finalizeResult = await finalizeOwnerSignupIfNeeded(nextSession.user);
          if (finalizeResult.expired) {
            await supabase.auth.signOut();
            if (!active || requestId !== requestIdRef.current) return;
            setSession(null);
            setAuthUser(null);
            setAppUser(null);
            setError('Cadastro expirado. Faça um novo cadastro para validar seu e-mail.');
            return;
          }

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

    /** Busca a sessão atual. `isInitial` mostra loading spinner. */
    const refreshSession = async (isInitial = false) => {
      const requestId = ++requestIdRef.current;
      if (isInitial) setLoading(true);

      try {
        const { data: { session } } = await withTimeout(
          supabase.auth.getSession(),
          SESSION_TIMEOUT_MS,
          'Busca da sessão',
        );
        if (!active || requestId !== requestIdRef.current) return;
        await applySession(session, isInitial);
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

    /** Debounced refresh para focus/visibility — evita cascatas */
    const debouncedRefresh = () => {
      if (debounceTimerRef.current) window.clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = window.setTimeout(() => {
        refreshSession(false);
      }, DEBOUNCE_MS);
    };

    // Carga inicial
    refreshSession(true);

    // Escutar mudanças na autenticação — SEM await para não bloquear
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        // Só atualizar se realmente mudou de usuário (login/logout)
        const newId = session?.user?.id ?? null;
        if (newId !== lastUserIdRef.current) {
          applySession(session, false);
        }
      },
    );

    const handleVisible = () => {
      if (document.visibilityState === 'visible') debouncedRefresh();
    };

    const handleProfileUpdated = () => refreshSession(false);

    // Apenas visibilitychange (focus já é coberto por visibilitychange)
    document.addEventListener('visibilitychange', handleVisible);
    window.addEventListener(PROFILE_UPDATED_EVENT, handleProfileUpdated);

    return () => {
      active = false;
      if (debounceTimerRef.current) window.clearTimeout(debounceTimerRef.current);
      subscription.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisible);
      window.removeEventListener(PROFILE_UPDATED_EVENT, handleProfileUpdated);
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
