
import { supabase } from '@/lib/supabase';
import { PostgrestError } from '@supabase/supabase-js';

// Interface para criar/atualizar um super admin
interface SuperAdminData {
  user_id: string;
  notes?: string;
}

// Interface para configurações do sistema
interface SystemSetting {
  key: string;
  value: any;
  description: string;
  updated_at: string;
  updated_by?: string;
}

// Interface para logs de atividade
interface ActivityLog {
  id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details?: any;
  created_at: string;
}

// Interface para assinaturas com dados do cliente
interface SubscriptionWithClient {
  id: string;
  restaurant_id: string;
  restaurant: {
    name: string;
    owner_id: string;
  };
  plan_id: string;
  status: string;
  start_date: string;
  end_date: string | null;
}

// Função para verificar se um usuário atual é super admin
export async function checkCurrentUserIsSuperAdmin(): Promise<boolean> {
  const { data: user } = await supabase.auth.getUser();
  
  if (!user.user) return false;
  
  const { data } = await supabase.rpc('is_super_admin', { user_id: user.user.id });
  return !!data;
}

// Função para listar todos os super admins
export async function listSuperAdmins(): Promise<{ data: any[] | null; error: PostgrestError | null }> {
  return await supabase
    .from('system_admins')
    .select(`
      user_id,
      notes,
      created_at,
      created_by
    `)
    .order('created_at', { ascending: false });
}

// Função para adicionar um super admin
export async function addSuperAdmin(data: SuperAdminData): Promise<{ data: any | null; error: PostgrestError | null }> {
  const { data: currentUser } = await supabase.auth.getUser();
  
  return await supabase
    .from('system_admins')
    .insert({
      ...data,
      created_by: currentUser.user?.id
    })
    .select();
}

// Função para remover um super admin
export async function removeSuperAdmin(userId: string): Promise<{ error: PostgrestError | null }> {
  return await supabase
    .from('system_admins')
    .delete()
    .eq('user_id', userId);
}

// Função para listar configurações do sistema
export async function listSystemSettings(): Promise<{ data: SystemSetting[] | null; error: PostgrestError | null }> {
  return await supabase
    .from('system_settings')
    .select('*')
    .order('key');
}

// Função para atualizar uma configuração do sistema
export async function updateSystemSetting(key: string, value: any): Promise<{ data: any | null; error: PostgrestError | null }> {
  const { data: currentUser } = await supabase.auth.getUser();
  
  return await supabase
    .from('system_settings')
    .update({ 
      value, 
      updated_at: new Date().toISOString(),
      updated_by: currentUser.user?.id
    })
    .eq('key', key)
    .select();
}

// Função para registrar atividade de admin
export async function logAdminActivity(action: string, entityType: string, entityId: string, details: any = null): Promise<{ data: any | null; error: PostgrestError | null }> {
  const { data: currentUser } = await supabase.auth.getUser();
  
  if (!currentUser.user) {
    return { 
      data: null, 
      error: { 
        message: 'Usuário não autenticado', 
        details: '', 
        hint: '', 
        code: '403' 
      } as PostgrestError 
    };
  }
  
  return await supabase
    .rpc('log_admin_activity', {
      admin_id: currentUser.user.id,
      action,
      entity_type: entityType,
      entity_id: entityId,
      details
    });
}

// Função para listar logs de atividade
export async function listActivityLogs(limit = 100): Promise<{ data: ActivityLog[] | null; error: PostgrestError | null }> {
  return await supabase
    .from('admin_activity_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
}

// Função para listar todas as assinaturas
export async function listAllSubscriptions(): Promise<{ data: SubscriptionWithClient[] | null; error: PostgrestError | null }> {
  return await supabase
    .from('subscriptions')
    .select(`
      id,
      restaurant_id,
      restaurant:restaurants (name, owner_id),
      plan_id,
      status,
      start_date,
      end_date
    `)
    .order('created_at', { ascending: false });
}

// Função para atualizar status de uma assinatura
export async function updateSubscriptionStatus(id: string, status: string): Promise<{ data: any | null; error: PostgrestError | null }> {
  const result = await supabase
    .from('subscriptions')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select();
  
  if (!result.error) {
    await logAdminActivity(
      'update_subscription',
      'subscriptions',
      id,
      { status }
    );
  }
  
  return result;
}

// Interface for User data returned by the Auth API
interface UserData {
  id: string;
  email?: string;
  app_metadata?: Record<string, any>;
  user_metadata?: Record<string, any>;
  created_at?: string;
}

// Função para buscar usuários por ID
export async function getUsersByIds(ids: string[]): Promise<{ data: UserData[] | null; error: PostgrestError | null }> {
  try {
    // Since we can't directly query auth.users, this would need to be handled
    // through an RPC function or edge function in a production environment.
    // For now, we'll return a mock response or error
    
    return { 
      data: null, 
      error: {
        message: "Acesso direto à tabela auth.users não é permitido via API cliente",
        details: "Use uma função RPC ou Edge Function para acessar dados de usuários",
        hint: "Implemente uma função Supabase para fazer esta consulta",
        code: "403"
      } as PostgrestError
    };
    
    // In a real implementation with proper RPC function:
    // const { data, error } = await supabase.rpc('get_users_by_ids', { user_ids: ids });
    // return { data, error };
  } catch (error) {
    const err = error as Error;
    return {
      data: null,
      error: {
        message: err.message,
        details: '',
        hint: '',
        code: '500'
      } as PostgrestError
    };
  }
}

// Função para listar todos os restaurantes
export async function listAllRestaurants(): Promise<{ data: any[] | null; error: PostgrestError | null }> {
  return await supabase
    .from('restaurants')
    .select('*')
    .order('created_at', { ascending: false });
}
