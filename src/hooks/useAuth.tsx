
import { ReactNode } from 'react';
import { useUserSession } from './useUserSession';
import { supabase } from '@/lib/supabase';
import { AuthContext } from './authContext';

export function AuthProvider({ children }: { children: ReactNode }) {
  // Fonte única da verdade: useUserSession já gerencia getSession + onAuthStateChange.
  const { session, authUser, loading } = useUserSession();

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      console.error('Login error:', error);
    }
    return { error };
  };

  const signUp = async (email: string, password: string, userData: Record<string, unknown>) => {
    const redirectUrl = `${window.location.origin}/dashboard`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData,
        emailRedirectTo: redirectUrl,
      },
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user: authUser, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
