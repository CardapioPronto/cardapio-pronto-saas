
import { useState, useEffect } from 'react';
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

export const useUserSession = (): UserSession => {
  const [session, setSession] = useState<Session | null>(null);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUserProfile = async (userId: string): Promise<AppUser | null> => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

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
  };

  useEffect(() => {
    // Buscar sessão atual
    const getInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        setAuthUser(session?.user ?? null);

        if (session?.user) {
          const profile = await fetchUserProfile(session.user.id);
          setAppUser(profile);
        }
      } catch (err) {
        console.error('Erro ao buscar sessão inicial:', err);
        setError('Erro ao carregar sessão');
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Escutar mudanças na autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id);
        setSession(session);
        setAuthUser(session?.user ?? null);
        setError(null);

        if (session?.user) {
          const profile = await fetchUserProfile(session.user.id);
          setAppUser(profile);
        } else {
          setAppUser(null);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return {
    session,
    authUser,
    appUser,
    loading,
    error
  };
};
