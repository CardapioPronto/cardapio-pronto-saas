import { useState, useEffect, useCallback } from 'react';
import { ConversationThread, ThreadStatus } from '@/types/atendimento';
import { ConversationsService } from '@/services/atendimento/conversationsService';
import { getCurrentRestaurantId } from '@/lib/supabase';
import { useCurrentUser } from './useCurrentUser';
import { supabase } from '@/integrations/supabase/client';

export const useConversations = (filters?: {
  status?: ThreadStatus;
  instanceId?: string;
  search?: string;
}) => {
  const { user } = useCurrentUser();
  const [threads, setThreads] = useState<ConversationThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [restaurantId, setRestaurantId] = useState<string>('');
  const filterStatus = filters?.status;
  const filterInstanceId = filters?.instanceId;
  const filterSearch = filters?.search;

  useEffect(() => {
    const load = async () => {
      const id = await getCurrentRestaurantId();
      if (id) setRestaurantId(id);
    };
    load();
  }, [user]);

  const loadThreads = useCallback(async () => {
    if (!restaurantId) return;
    setLoading(true);
    try {
      const data = await ConversationsService.listThreads(restaurantId, {
        status: filterStatus,
        instanceId: filterInstanceId,
        search: filterSearch,
      });
      setThreads(data);
    } catch (error) {
      console.error('Erro ao carregar conversas:', error);
    } finally {
      setLoading(false);
    }
  }, [restaurantId, filterStatus, filterInstanceId, filterSearch]);

  useEffect(() => {
    if (restaurantId) loadThreads();
  }, [restaurantId, loadThreads]);

  // Realtime subscription
  useEffect(() => {
    if (!restaurantId) return;

    const channel = ConversationsService.subscribeToThreads(restaurantId, (updatedThread) => {
      setThreads(prev => {
        const idx = prev.findIndex(t => t.id === updatedThread.id);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = updatedThread;
          return updated.sort((a, b) => 
            new Date(b.last_message_at || b.created_at).getTime() - 
            new Date(a.last_message_at || a.created_at).getTime()
          );
        }
        return [updatedThread, ...prev];
      });
    });

    return () => { supabase.removeChannel(channel); };
  }, [restaurantId]);

  const totalUnread = threads.reduce((sum, t) => sum + (t.unread_count || 0), 0);

  const threadsByStatus = {
    bot_active: threads.filter(t => t.status === 'bot_active'),
    waiting_human: threads.filter(t => t.status === 'waiting_human'),
    human_active: threads.filter(t => t.status === 'human_active'),
    closed: threads.filter(t => t.status === 'closed'),
  };

  return {
    threads,
    loading,
    restaurantId,
    totalUnread,
    threadsByStatus,
    refetch: loadThreads,
  };
};
