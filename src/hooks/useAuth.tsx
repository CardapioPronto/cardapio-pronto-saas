
import { ReactNode, useCallback, useMemo } from 'react';
import { useUserSession } from './useUserSession';
import { supabase } from '@/lib/supabase';
import { AuthContext } from './authContext';
import { createLogger } from '@/lib/log';

const log = createLogger('auth.provider');

export function AuthProvider({ children }: { children: ReactNode }) {
  // Fonte única da verdade: useUserSession já gerencia getSession + onAuthStateChange.
  const { session, authUser, loading } = useUserSession();

  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      log.capture(error, { action: 'signIn', email });
    }
    return { error };
  }, []);

  const signUp = useCallback(async (
    email: string,
    password: string,
    userData: Record<string, unknown>,
    options?: { emailRedirectTo?: string; captchaToken?: string },
  ) => {
    const redirectUrl = options?.emailRedirectTo || `${window.location.origin}/dashboard`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData,
        emailRedirectTo: redirectUrl,
        captchaToken: options?.captchaToken,
      },
    });
    if (error) {
      log.capture(error, { action: 'signUp', email, userType: userData.user_type });
    }
    return { error };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const value = useMemo(() => ({
    session,
    user: authUser,
    loading,
    signIn,
    signUp,
    signOut,
  }), [session, authUser, loading, signIn, signUp, signOut]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
