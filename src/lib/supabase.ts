
import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types';

// Import the integrated Supabase client
import { supabase as supabaseClient } from '@/integrations/supabase/client';

// Create Supabase client with proper type safety using the integrated client
export const supabase = supabaseClient;

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
  
  // Specify the table name explicitly as a valid table name
  const { data } = await supabase
    .from('restaurants')
    .select('id')
    .eq('owner_id', user.id)
    .single();
  
  return data?.id;
};

// Define a type for valid table names to ensure type safety
type ValidTable = 'restaurants' | 'products' | 'orders' | 'order_items' | 'menus' | 
                  'menu_categories' | 'menu_items' | 'subscriptions' | 
                  'restaurant_settings' | 'ifood_integration';

// Função para verificar se o usuário tem acesso a um recurso específico
export const checkResourceAccess = async (table: string, resourceId: string) => {
  const user = await getCurrentUser();
  if (!user) return false;
  
  // For type safety, we need to check if the table is valid
  // This is a workaround since we can't dynamically type the table name
  // but still want to allow flexible queries
  const validTables: ValidTable[] = [
    'restaurants', 
    'products', 
    'orders', 
    'order_items', 
    'menus', 
    'menu_categories', 
    'menu_items', 
    'subscriptions', 
    'restaurant_settings',
    'ifood_integration'
  ];

  if (!validTables.includes(table as ValidTable)) {
    console.error(`Invalid table name: ${table}`);
    return false;
  }

  try {
    const { data } = await supabase
      .from(table as ValidTable)
      .select('id')
      .eq('id', resourceId)
      .eq('restaurant_id', await getCurrentRestaurantId())
      .single();
    
    return !!data;
  } catch (error) {
    console.error(`Error checking resource access for ${table}:${resourceId}`, error);
    return false;
  }
};
