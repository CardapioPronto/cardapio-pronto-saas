
// Import the integrated Supabase client
import { supabase as supabaseClient } from '@/integrations/supabase/client';

// Create Supabase client with proper type safety using the integrated client
export const supabase = supabaseClient;

// Helpers para gerenciar a autenticação
export const signIn = async (
  email: string,
  password: string,
  options?: { captchaToken?: string },
) => {
  const credentials = options?.captchaToken
    ? { email, password, options: { captchaToken: options.captchaToken } }
    : { email, password };

  return await supabase.auth.signInWithPassword(credentials);
};

export const signUp = async (
  email: string,
  password: string,
  userData: Record<string, unknown>,
  options?: { captchaToken?: string },
) => {
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: userData,
      captchaToken: options?.captchaToken,
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
  try {
    const rpc = supabase.rpc.bind(supabase) as unknown as (
      fn: 'get_user_restaurant_id',
      args?: Record<string, never>,
    ) => Promise<{ data: string | null; error: { message: string } | null }>;

    const { data, error } = await rpc('get_user_restaurant_id', {});
    if (!error && data) return data;
  } catch (error) {
    console.warn("Fallback ao buscar restaurante ativo:", error);
  }

  const user = await getCurrentUserWithProfile();
  if (!user) return null;  
  return user.restaurant_id;
};

export const getCurrentUserWithProfile = async () => {
  // 1. Busca o usuário autenticado
  const { data: authData } = await supabase.auth.getUser();
  const authUser = authData?.user;
  if (!authUser) return null;

  // 2. Busca apenas os campos desejados na tabela de perfil
  const { data: userProfile, error } = await supabase
    .from('users') // ou 'users', conforme seu banco
    .select('name, restaurant_id')
    .eq('id', authUser.id)
    .single();

  if (error) {
    console.error("Erro ao buscar perfil do usuário:", error);
    return { ...authUser, name: null, restaurant_id: null };
  }

  // 3. Retorna os dados combinados (sem objeto profile)
  return {
    ...authUser,
    name: userProfile?.name ?? null,
    restaurant_id: userProfile?.restaurant_id ?? null,
  };
};

const validTables = [
  'restaurants',
  'products',
  'orders',
  'order_items',
  'menus',
  'menu_categories',
  'menu_items',
  'subscriptions',
  'restaurant_settings',
  'ifood_integration',
  'system_admins',
  'system_settings',
  'admin_activity_logs',
] as const;

type ValidTable = typeof validTables[number];

// Função para verificar se o usuário tem acesso a um recurso específico
export const checkResourceAccess = async (table: string, resourceId: string) => {
  const user = await getCurrentUser();
  if (!user) return false;
  
  // For type safety, we need to check if the table is valid
  // This is a workaround since we can't dynamically type the table name
  // but still want to allow flexible queries
  if (!validTables.includes(table as ValidTable)) {
    console.error(`Invalid table name: ${table}`);
    return false;
  }

  try {
    // Break up the function to avoid deep type instantiation
    // First, get the restaurant ID
    const restaurantId = await getCurrentRestaurantId();
    if (!restaurantId) return false;
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: any = supabase.from(table as ValidTable);
    const data = await query
      .select('id')
      .eq('id', resourceId)
      .eq('restaurant_id', restaurantId)
      .maybeSingle();
    
    if (data.error) {
      console.error(`Error checking access to ${table}:${resourceId}:`, data.error);
      return false;
    }
    
    return !!data.data;
  } catch (error) {
    console.error(`Error checking resource access for ${table}:${resourceId}`, error);
    return false;
  }
};

// Função para verificar se um usuário é super admin
export const isSuperAdmin = async (userId?: string) => {
  if (!userId) {
    const user = await getCurrentUser();
    userId = user?.id;
  }
  
  if (!userId) return false;
  
  try {
    const { data, error } = await supabase.rpc('is_super_admin', { user_id: userId });
    
    if (error) {
      console.error("Erro ao verificar se usuário é super admin:", error);
      return false;
    }
    
    return !!data;
  } catch (error) {
    console.error("Erro ao verificar status de super admin:", error);
    return false;
  }
};

// Função para criar o primeiro super admin (usar apenas uma vez)
export const createFirstSuperAdmin = async (userId: string) => {
  try {
    // Verificar se já existem super admins
    const { data: existingAdmins, error: checkError } = await supabase
      .from('system_admins')
      .select('user_id')
      .limit(1);
    
    if (checkError) {
      console.error("Erro ao verificar super admins existentes:", checkError);
      return { success: false, error: checkError };
    }
    
    if (existingAdmins && existingAdmins.length > 0) {
      return { success: false, error: "Já existem super admins no sistema" };
    }
    
    // Criar o primeiro super admin
    const { error } = await supabase
      .from('system_admins')
      .insert({ user_id: userId, notes: "Primeiro super administrador do sistema" });
    
    if (error) {
      console.error("Erro ao criar super admin:", error);
      return { success: false, error };
    }
    
    return { success: true };
  } catch (error) {
    console.error("Erro ao criar primeiro super admin:", error);
    return { success: false, error };
  }
};
