import { supabase } from "@/integrations/supabase/client";
import { ConversationThread, ConversationMessage, ConversationNote, ConversationAssignment, ThreadStatus } from "@/types/atendimento";

const db = supabase;

function escapePostgrestSearch(value: string): string {
  return value.replace(/[%_*(),.]/g, '\\$&').trim();
}

export const ConversationsService = {
  async listThreads(restaurantId: string, filters?: {
    status?: ThreadStatus;
    instanceId?: string;
    assignedTo?: string;
    search?: string;
  }): Promise<ConversationThread[]> {
    let query = db
      .from('conversation_threads')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('last_message_at', { ascending: false, nullsFirst: false });

    if (filters?.status) query = query.eq('status', filters.status);
    if (filters?.instanceId) query = query.eq('instance_id', filters.instanceId);
    if (filters?.assignedTo) query = query.eq('assigned_to', filters.assignedTo);
    if (filters?.search) {
      const search = escapePostgrestSearch(filters.search);
      if (search) {
        query = query.or(`customer_name.ilike.%${search}%,customer_phone.ilike.%${search}%`);
      }
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as ConversationThread[];
  },

  async getThread(threadId: string): Promise<ConversationThread | null> {
    const { data, error } = await db
      .from('conversation_threads')
      .select('*')
      .eq('id', threadId)
      .single();

    if (error) return null;
    return data as ConversationThread;
  },

  async getMessages(threadId: string): Promise<ConversationMessage[]> {
    const { data, error } = await db
      .from('conversation_messages')
      .select('*')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data || []) as ConversationMessage[];
  },

  async sendMessage(params: {
    threadId: string;
    restaurantId: string;
    instanceId: string;
    remoteJid: string;
    content: string;
    senderType: 'human';
    senderId: string;
    isInternal?: boolean;
  }): Promise<ConversationMessage> {
    let sendResult: unknown = null;

    if (!params.isInternal) {
      const { data: instance, error: instanceError } = await db
        .from('whatsapp_instances')
        .select('instance_name, status')
        .eq('id', params.instanceId)
        .eq('restaurant_id', params.restaurantId)
        .maybeSingle();

      if (instanceError || !instance?.instance_name) {
        throw new Error('Instância WhatsApp não encontrada para esta conversa.');
      }

      if (instance.status !== 'CONNECTED') {
        throw new Error('A instância WhatsApp precisa estar conectada para enviar mensagens.');
      }

      const { data: evoResult, error: evoError } = await supabase.functions.invoke('evolution-api', {
        body: {
          action: 'send_text',
          instanceName: instance.instance_name,
          restaurantId: params.restaurantId,
          number: params.remoteJid,
          text: params.content,
        },
      });

      if (evoError) throw evoError;
      if (evoResult?.error) throw new Error(evoResult.error);
      sendResult = evoResult;
    }

    const { data, error } = await db
      .from('conversation_messages')
      .insert({
        thread_id: params.threadId,
        restaurant_id: params.restaurantId,
        content: params.content,
        sender_type: params.senderType,
        sender_id: params.senderId,
        is_internal: params.isInternal || false,
        message_type: 'text',
        metadata: sendResult ? ({ evolution_result: sendResult } as unknown as Record<string, unknown>) : {},
      })
      .select()
      .single();

    if (error) throw error;

    await db
      .from('conversation_threads')
      .update({
        last_message_at: new Date().toISOString(),
        last_message_preview: params.content.substring(0, 100),
      })
      .eq('id', params.threadId);

    return data as ConversationMessage;
  },

  async assignToHuman(threadId: string, userId: string, assignedBy?: string): Promise<void> {
    await db
      .from('conversation_threads')
      .update({ status: 'human_active', assigned_to: userId })
      .eq('id', threadId);

    await db.from('conversation_assignments').insert({
      thread_id: threadId,
      assigned_to: userId,
      assigned_by: assignedBy || userId,
      action: 'assigned',
    });
  },

  async releaseToBot(threadId: string, userId: string): Promise<void> {
    await db
      .from('conversation_threads')
      .update({ status: 'bot_active', assigned_to: null })
      .eq('id', threadId);

    await db.from('conversation_assignments').insert({
      thread_id: threadId,
      assigned_to: userId,
      assigned_by: userId,
      action: 'released',
    });
  },

  async closeThread(threadId: string): Promise<void> {
    await db
      .from('conversation_threads')
      .update({ status: 'closed', assigned_to: null })
      .eq('id', threadId);
  },

  async markAsRead(threadId: string): Promise<void> {
    await db
      .from('conversation_threads')
      .update({ unread_count: 0 })
      .eq('id', threadId);
  },

  async getNotes(threadId: string): Promise<ConversationNote[]> {
    const { data, error } = await db
      .from('conversation_notes')
      .select('*')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as ConversationNote[];
  },

  async addNote(threadId: string, userId: string, content: string): Promise<ConversationNote> {
    const { data, error } = await db
      .from('conversation_notes')
      .insert({ thread_id: threadId, user_id: userId, content })
      .select()
      .single();

    if (error) throw error;
    return data as ConversationNote;
  },

  async deleteNote(noteId: string): Promise<void> {
    const { error } = await db
      .from('conversation_notes')
      .delete()
      .eq('id', noteId);
    if (error) throw error;
  },

  async getAssignments(threadId: string): Promise<ConversationAssignment[]> {
    const { data, error } = await db
      .from('conversation_assignments')
      .select('*')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as ConversationAssignment[];
  },

  subscribeToMessages(threadId: string, restaurantId: string, callback: (msg: ConversationMessage) => void) {
    return supabase
      .channel(`messages-${restaurantId}-${threadId}`, { config: { private: true } })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'conversation_messages',
        filter: `thread_id=eq.${threadId}`,
      }, (payload) => {
        callback(payload.new as ConversationMessage);
      })
      .subscribe();
  },

  subscribeToThreads(restaurantId: string, callback: (thread: ConversationThread) => void) {
    return supabase
      .channel(`threads-${restaurantId}`, { config: { private: true } })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'conversation_threads',
        filter: `restaurant_id=eq.${restaurantId}`,
      }, (payload) => {
        callback(payload.new as ConversationThread);
      })
      .subscribe();
  },
};
