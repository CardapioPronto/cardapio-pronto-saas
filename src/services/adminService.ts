
import { supabase } from '@/lib/supabase';
import { FunctionsHttpError, PostgrestError } from '@supabase/supabase-js';
import type { Database, Json } from '@/integrations/supabase/types';
import { normalizeSubscriptionStatus } from '@/lib/subscriptionStatusUi';

type SystemSetting = Database['public']['Tables']['system_settings']['Row'];
type ActivityLog = Database['public']['Tables']['admin_activity_logs']['Row'];
type Subscription = Database['public']['Tables']['subscriptions']['Row'];
type Restaurant = Database['public']['Tables']['restaurants']['Row'];
type SupportTicket = Database['public']['Tables']['support_tickets']['Row'];
type SupportTicketEvent = {
  id: string;
  ticket_id: string;
  event_type: string;
  actor_name: string | null;
  actor_email: string | null;
  actor_role: string | null;
  message: string | null;
  old_status: string | null;
  new_status: string | null;
  created_at: string;
};

export const IFOOD_SAAS_APP_SETTING_KEY = 'ifood_saas_app';

export interface IfoodSaasAppSettings {
  app_name: string;
  app_url: string;
  client_id: string;
  client_secret: string;
  distribution_model: 'centralized_saas';
  category: 'Food';
  visibility: 'private' | 'public';
  modules: string[];
  notes: string;
}

export type AdminOnboardingHealthStatus = 'blocked' | 'at_risk' | 'active' | 'ready_to_sell';
export type AdminSupportTicketPriority = 'low' | 'normal' | 'high' | 'urgent';
export type AdminSupportTicketStatus = 'open' | 'in_progress' | 'waiting_customer' | 'resolved' | 'closed';

export interface AdminOnboardingHealthRow {
  restaurantId: string;
  restaurantName: string;
  slug: string | null;
  active: boolean | null;
  createdAt: string | null;
  totalProducts: number;
  availableProducts: number;
  totalCategories: number;
  totalOrders: number;
  lastOrderAt: string | null;
  menuThemeConfigured: boolean;
  restaurantProfileCompleted: boolean;
  teamTrainingResolved: boolean;
  supportHandoffResolved: boolean;
  completedSteps: number;
  progressPercent: number;
  healthStatus: AdminOnboardingHealthStatus;
  nextStep: string;
  lastProgressAt: string | null;
}

export interface AdminSupportTicketRow {
  id: string;
  restaurantId: string | null;
  restaurantName: string;
  restaurantSlug: string | null;
  requesterName: string | null;
  requesterEmail: string | null;
  screenTitle: string;
  pathname: string;
  subject: string;
  message: string;
  context: string;
  priority: AdminSupportTicketPriority;
  status: AdminSupportTicketStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AdminSupportTicketEventRow {
  id: string;
  ticketId: string;
  eventType: string;
  actorName: string | null;
  actorEmail: string | null;
  actorRole: string;
  message: string | null;
  oldStatus: AdminSupportTicketStatus | null;
  newStatus: AdminSupportTicketStatus | null;
  createdAt: string;
}

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

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};

const asString = (value: unknown, fallback = '') => typeof value === 'string' ? value : fallback;
const asNullableString = (value: unknown) => typeof value === 'string' ? value : null;
const asNumber = (value: unknown, fallback = 0) => typeof value === 'number' && Number.isFinite(value) ? value : fallback;
const asBoolean = (value: unknown) => typeof value === 'boolean' ? value : false;

const normalizeHealthStatus = (value: unknown): AdminOnboardingHealthStatus => {
  if (value === 'blocked' || value === 'at_risk' || value === 'active' || value === 'ready_to_sell') {
    return value;
  }
  return 'at_risk';
};

const normalizeTicketPriority = (value: unknown): AdminSupportTicketPriority => {
  if (value === 'low' || value === 'normal' || value === 'high' || value === 'urgent') return value;
  return 'normal';
};

const normalizeTicketStatus = (value: unknown): AdminSupportTicketStatus => {
  if (
    value === 'open'
    || value === 'in_progress'
    || value === 'waiting_customer'
    || value === 'resolved'
    || value === 'closed'
  ) {
    return value;
  }
  return 'open';
};

const normalizeOnboardingHealthRow = (value: unknown): AdminOnboardingHealthRow => {
  const row = asRecord(value);
  return {
    restaurantId: asString(row.restaurantId),
    restaurantName: asString(row.restaurantName, 'Restaurante'),
    slug: asNullableString(row.slug),
    active: typeof row.active === 'boolean' ? row.active : null,
    createdAt: asNullableString(row.createdAt),
    totalProducts: asNumber(row.totalProducts),
    availableProducts: asNumber(row.availableProducts),
    totalCategories: asNumber(row.totalCategories),
    totalOrders: asNumber(row.totalOrders),
    lastOrderAt: asNullableString(row.lastOrderAt),
    menuThemeConfigured: asBoolean(row.menuThemeConfigured),
    restaurantProfileCompleted: asBoolean(row.restaurantProfileCompleted),
    teamTrainingResolved: asBoolean(row.teamTrainingResolved),
    supportHandoffResolved: asBoolean(row.supportHandoffResolved),
    completedSteps: asNumber(row.completedSteps),
    progressPercent: asNumber(row.progressPercent),
    healthStatus: normalizeHealthStatus(row.healthStatus),
    nextStep: asString(row.nextStep, 'Revisar implantacao'),
    lastProgressAt: asNullableString(row.lastProgressAt),
  };
};

export async function listAdminOnboardingHealth(): Promise<AdminOnboardingHealthRow[]> {
  const { data, error } = await supabase.rpc('get_admin_onboarding_health');
  if (error) throw error;

  return Array.isArray(data)
    ? data.map(normalizeOnboardingHealthRow)
    : [];
}

export async function listAdminSupportTickets(limit = 12): Promise<AdminSupportTicketRow[]> {
  const { data, error } = await supabase
    .from('support_tickets')
    .select('*, restaurants(name, slug)')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;

  const priorityOrder: Record<AdminSupportTicketPriority, number> = {
    urgent: 1,
    high: 2,
    normal: 3,
    low: 4,
  };
  const statusOrder: Record<AdminSupportTicketStatus, number> = {
    open: 1,
    in_progress: 2,
    waiting_customer: 3,
    resolved: 4,
    closed: 5,
  };

  return ((data || []) as Array<SupportTicket & { restaurants?: { name?: string | null; slug?: string | null } | null }>)
    .map((ticket) => ({
      id: ticket.id,
      restaurantId: ticket.restaurant_id,
      restaurantName: ticket.restaurants?.name || 'Restaurante nao vinculado',
      restaurantSlug: ticket.restaurants?.slug || null,
      requesterName: ticket.requester_name,
      requesterEmail: ticket.requester_email,
      screenTitle: ticket.screen_title,
      pathname: ticket.pathname,
      subject: ticket.subject,
      message: ticket.message,
      context: ticket.context,
      priority: normalizeTicketPriority(ticket.priority),
      status: normalizeTicketStatus(ticket.status),
      createdAt: ticket.created_at,
      updatedAt: ticket.updated_at,
    }))
    .sort((a, b) => {
      const byStatus = statusOrder[a.status] - statusOrder[b.status];
      if (byStatus !== 0) return byStatus;
      const byPriority = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (byPriority !== 0) return byPriority;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
}

export async function updateAdminSupportTicketStatus(
  id: string,
  status: AdminSupportTicketStatus,
): Promise<AdminSupportTicketRow> {
  const canonicalStatus = normalizeTicketStatus(status);
  const { data, error } = await supabase
    .from('support_tickets')
    .update({ status: canonicalStatus, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*, restaurants(name, slug)')
    .single();

  if (error) throw error;

  await logAdminActivity(
    'update_support_ticket',
    'support_tickets',
    id,
    { status: canonicalStatus },
  );

  const ticket = data as SupportTicket & { restaurants?: { name?: string | null; slug?: string | null } | null };
  return {
    id: ticket.id,
    restaurantId: ticket.restaurant_id,
    restaurantName: ticket.restaurants?.name || 'Restaurante nao vinculado',
    restaurantSlug: ticket.restaurants?.slug || null,
    requesterName: ticket.requester_name,
    requesterEmail: ticket.requester_email,
    screenTitle: ticket.screen_title,
    pathname: ticket.pathname,
    subject: ticket.subject,
    message: ticket.message,
    context: ticket.context,
    priority: normalizeTicketPriority(ticket.priority),
    status: normalizeTicketStatus(ticket.status),
    createdAt: ticket.created_at,
    updatedAt: ticket.updated_at,
  };
}

export async function listAdminSupportTicketEvents(ticketId: string): Promise<AdminSupportTicketEventRow[]> {
  const { data, error } = await (supabase as any)
    .from('support_ticket_events')
    .select('*')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return ((data || []) as SupportTicketEvent[]).map((event) => ({
    id: event.id,
    ticketId: event.ticket_id,
    eventType: event.event_type,
    actorName: event.actor_name,
    actorEmail: event.actor_email,
    actorRole: event.actor_role,
    message: event.message,
    oldStatus: event.old_status ? normalizeTicketStatus(event.old_status) : null,
    newStatus: event.new_status ? normalizeTicketStatus(event.new_status) : null,
    createdAt: event.created_at,
  }));
}

export async function addAdminSupportTicketComment(
  ticketId: string,
  message: string,
): Promise<AdminSupportTicketEventRow> {
  const cleanMessage = message.trim();
  if (cleanMessage.length < 3) {
    throw new Error('Informe um comentario com pelo menos 3 caracteres.');
  }

  const { data: currentUser } = await supabase.auth.getUser();
  const userId = currentUser.user?.id || null;
  let actorName: string | null = null;
  let actorEmail: string | null = currentUser.user?.email || null;

  if (userId) {
    const { data: profile } = await supabase
      .from('users')
      .select('name, email')
      .eq('id', userId)
      .maybeSingle();

    actorName = profile?.name || null;
    actorEmail = profile?.email || actorEmail;
  }

  const { data, error } = await (supabase as any)
    .from('support_ticket_events')
    .insert({
      ticket_id: ticketId,
      event_type: 'comment',
      actor_id: userId,
      actor_name: actorName,
      actor_email: actorEmail,
      actor_role: 'support',
      message: cleanMessage,
    })
    .select('*')
    .single();

  if (error) throw error;

  await logAdminActivity(
    'comment_support_ticket',
    'support_tickets',
    ticketId,
    { commentLength: cleanMessage.length },
  );

  const event = data as SupportTicketEvent;
  return {
    id: event.id,
    ticketId: event.ticket_id,
    eventType: event.event_type,
    actorName: event.actor_name,
    actorEmail: event.actor_email,
    actorRole: event.actor_role,
    message: event.message,
    oldStatus: event.old_status ? normalizeTicketStatus(event.old_status) : null,
    newStatus: event.new_status ? normalizeTicketStatus(event.new_status) : null,
    createdAt: event.created_at,
  };
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

export async function upsertIfoodSaasAppSettings(
  value: IfoodSaasAppSettings
): Promise<{ data: SystemSetting[] | null; error: PostgrestError | null }> {
  const { data: currentUser } = await supabase.auth.getUser();

  return await supabase
    .from('system_settings')
    .upsert({
      key: IFOOD_SAAS_APP_SETTING_KEY,
      value: value as unknown as Json,
      description: 'Credenciais globais do aplicativo iFood SaaS Centralizado usado pelo Pubfy.',
      updated_at: new Date().toISOString(),
      updated_by: currentUser.user?.id
    }, { onConflict: 'key' })
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

