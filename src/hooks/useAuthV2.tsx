
import { createContext, useContext, ReactNode } from 'react';
import { useUserSession } from './useUserSession';
import { supabase } from '@/lib/supabase';

interface AuthContextType {
  session: any;
  user: any;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, userData: any) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProviderV2({ children }: { children: ReactNode }) {
  const { session, authUser, loading } = useUserSession();

  // Funções de autenticação
  const signIn = async (email: string, password: string) => {
    console.log("Attempting login for:", email);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (!error && data.user) {
      console.log("Login successful for:", data.user.email);
      console.log("User metadata:", data.user.user_metadata);
    } else {
      console.error("Login error:", error);
    }
    
    return { error };
  };

  const signUp = async (email: string, password: string, userData: any) => {
    const { error } = await supabase.auth.signUp({ 
      email, 
      password,
      options: {
        data: userData
      }
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

export const useAuthV2 = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthV2 must be used within an AuthProviderV2');
  }
  return context;
};
