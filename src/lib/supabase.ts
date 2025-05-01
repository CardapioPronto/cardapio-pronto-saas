
import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types';

// Get environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check for environment variables and provide fallbacks for development
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase environment variables are missing. Please check your .env file or Supabase integration.');
  
  // This will throw a clear error in development instead of proceeding with invalid credentials
  if (import.meta.env.DEV) {
    throw new Error('Supabase environment variables (VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY) are required. Please add them to your .env file or connect to Supabase using the Lovable integration.');
  }
}

// Create Supabase client with proper type safety
export const supabase = createClient<Database>(
  supabaseUrl || 'https://placeholder-url-for-type-safety.supabase.co',
  supabaseAnonKey || 'placeholder-key-for-type-safety'
);

// Helpers para gerenciar a autenticação
export const signIn = async (email: string, password: string) => {
  return await supabase.auth.signInWithPassword({ email, password });
};

export const signUp = async (email: string, password: string, userData: any) => {
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: userData
    }
  });
  
  if (authError) throw authError;
  
  return { authData };
};

export const signOut = async () => {
  return await supabase.auth.signOut();
};

export const getCurrentUser = async () => {
  const { data } = await supabase.auth.getUser();
  return data?.user;
};

// Função para obter o ID do restaurante do usuário atual
export const getCurrentRestaurantId = async () => {
  const user = await getCurrentUser();
  if (!user) return null;
  
  const { data } = await supabase
    .from('restaurants')
    .select('id')
    .eq('owner_id', user.id)
    .single();
  
  return data?.id;
};

// Função para verificar se o usuário tem acesso a um recurso específico
export const checkResourceAccess = async (table: string, resourceId: string) => {
  const user = await getCurrentUser();
  if (!user) return false;
  
  const { data } = await supabase
    .from(table)
    .select('id')
    .eq('id', resourceId)
    .eq('restaurant_id', await getCurrentRestaurantId())
    .single();
  
  return !!data;
};
