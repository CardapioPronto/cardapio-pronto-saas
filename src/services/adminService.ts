
import { supabase } from '@/lib/supabase';
import { FunctionsHttpError, PostgrestError } from '@supabase/supabase-js';
import type { Database, Json } from '@/integrations/supabase/types';
import { normalizeSubscriptionStatus } from '@/lib/subscriptionStatusUi';

type SystemSetting = Database['public']['Tables']['system_settings']['Row'];
type ActivityLog = Database['public']['Tables']['admin_activity_logs']['Row'];
type Subscription = Database['public']['Tables']['subscriptions']['Row'];
type Restaurant = Database['public']['Tables']['restaurants']['Row'];

export interface SuperAdminRecord {
  user_id: string;
  email: string | null;
  name: string | null;
  role: string | null;
  user_type: string | null;
  restaurant_id: string | null;
  restaurant_name: string | null;
  notes: string | null;
  created_at: string;
  created_by: string | null;
  created_by_email: string | null;
  created_by_name: string | null;
  auth_created_at: string | null;
  last_sign_in_at: string | null;
  is_current_user: boolean;
}

interface SuperAdminsResponse {
  currentUserId: string;
  admins: SuperAdminRecord[];
}

// Interface para configurações do sistema
// Interface para assinaturas com dados do cliente
interface SubscriptionWithClient {
  id: string;
  restaurant_id: string;
  restaurant: {
    name: string;
    owner_id: string;
  };
  plan?: {
    name: string | null;
  } | null;
  plan_id: string;
  status: string;
  start_date: string;
  end_date: string | null;
  billing_cycle: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  next_billing_at: string | null;
  pagarme_subscription_id: string | null;
  pagarme_customer_id: string | null;
  last_payment_status: string | null;
  updated_at: string;
}

// Função para verificar se um usuário atual é super admin
export async function checkCurrentUserIsSuperAdmin(): Promise<boolean> {
  const { data: user } = await supabase.auth.getUser();
  
  if (!user.user) return false;
  
  const { data } = await supabase.rpc('is_super_admin', { user_id: user.user.id });
  return !!data;
}

async function getFunctionErrorMessage(error: unknown) {
  if (error instanceof FunctionsHttpError) {
    const body = await error.context.clone().json().catch(() => null) as { error?: string } | null;
    if (body?.error) return body.error;
  }

  return error instanceof Error ? error.message : 'Erro desconhecido';
}

async function invokeSuperAdmins(action: 'list' | 'add' | 'remove', body: Record<string, unknown> = {}) {
  const { data, error } = await supabase.functions.invoke<SuperAdminsResponse>('admin-super-admins', {
    body: { action, ...body }
  });

  if (error) throw new Error(await getFunctionErrorMessage(error));
  if (!data?.admins) throw new Error('Resposta inválida do serviço de administradores');
  return data;
}

// Função para listar todos os super admins
export async function listSuperAdmins(): Promise<SuperAdminsResponse> {
  return await invokeSuperAdmins('list');
}

// Função para adicionar um super admin
export async function addSuperAdmin(params: { email: string; name?: string; notes?: string }): Promise<SuperAdminsResponse> {
  return await invokeSuperAdmins('add', params);
}

// Função para remover um super admin
export async function removeSuperAdmin(userId: string): Promise<SuperAdminsResponse> {
  return await invokeSuperAdmins('remove', { userId });
}

// Função para listar configurações do sistema
export async function listSystemSettings(): Promise<{ data: SystemSetting[] | null; error: PostgrestError | null }> {
  const response = await supabase
    .from('system_settings')
    .select('*')
    .order('key');
    
  return {
    data: response.data as SystemSetting[] | null,
    error: response.error
  };
}

// Função para atualizar uma configuração do sistema
export async function updateSystemSetting(key: string, value: Json): Promise<{ data: SystemSetting[] | null; error: PostgrestError | null }> {
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
export async function logAdminActivity(action: string, entityType: string, entityId: string, details: Json = null): Promise<{ data: string | null; error: PostgrestError | null }> {
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
      plan:plans (name),
      plan_id,
      status,
      start_date,
      end_date,
      billing_cycle,
      current_period_start,
      current_period_end,
      next_billing_at,
      pagarme_subscription_id,
      pagarme_customer_id,
      last_payment_status,
      updated_at
    `)
    .order('created_at', { ascending: false });
}

// Função para atualizar status de uma assinatura
export async function updateSubscriptionStatus(id: string, status: string): Promise<{ data: Subscription[] | null; error: PostgrestError | null }> {
  const canonicalStatus = normalizeSubscriptionStatus(status);
  const result = await supabase
    .from('subscriptions')
    .update({ status: canonicalStatus, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select();
  
  if (!result.error) {
    await logAdminActivity(
      'update_subscription',
      'subscriptions',
      id,
      { status: canonicalStatus }
    );
  }
  
  return result;
}

// Interface for User data returned by the Auth API
interface UserData {
  id: string;
  email?: string;
  app_metadata?: Record<string, Json>;
  user_metadata?: Record<string, Json>;
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
export async function listAllRestaurants(): Promise<{ data: Restaurant[] | null; error: PostgrestError | null }> {
  return await supabase
    .from('restaurants')
    .select('*')
    .order('created_at', { ascending: false });
}

