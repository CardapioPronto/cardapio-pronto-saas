import { useState, useEffect, useCallback } from 'react';
import { ConversationMessage, ConversationNote, ConversationThread } from '@/types/atendimento';
import { ConversationsService } from '@/services/atendimento/conversationsService';
import { useCurrentUser } from './useCurrentUser';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useConversationDetail = (threadId: string | null) => {
  const { user } = useCurrentUser();
  const [thread, setThread] = useState<ConversationThread | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [notes, setNotes] = useState<ConversationNote[]>([]);
  const [loading, setLoading] = useState(true);

  const loadThread = useCallback(async () => {
    if (!threadId) return;
    setLoading(true);
    try {
      const [threadData, messagesData, notesData] = await Promise.all([
        ConversationsService.getThread(threadId),
        ConversationsService.getMessages(threadId),
        ConversationsService.getNotes(threadId),
      ]);
      setThread(threadData);
      setMessages(messagesData);
      setNotes(notesData);

      // Mark as read
      if (threadData && threadData.unread_count > 0) {
        await ConversationsService.markAsRead(threadId);
      }
    } catch (error) {
      console.error('Erro ao carregar conversa:', error);
    } finally {
      setLoading(false);
    }
  }, [threadId]);

  useEffect(() => {
    loadThread();
  }, [loadThread]);

  // Realtime messages
  useEffect(() => {
    if (!threadId) return;

    const channel = ConversationsService.subscribeToMessages(threadId, (newMsg) => {
      setMessages(prev => [...prev, newMsg]);
    });

    return () => { supabase.removeChannel(channel); };
  }, [threadId]);

  const sendMessage = async (content: string, isInternal = false) => {
    if (!threadId || !user?.id || !thread?.restaurant_id) return;
    try {
      await ConversationsService.sendMessage({
        threadId,
        restaurantId: thread.restaurant_id,
        instanceId: thread.instance_id,
        remoteJid: thread.remote_jid,
        content,
        senderType: 'human',
        senderId: user.id,
        isInternal,
      });
      if (!isInternal) toast.success('Mensagem enviada');
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao enviar mensagem');
      throw error;
    }
  };

  const assumeConversation = async () => {
    if (!threadId || !user?.id) return;
    try {
      await ConversationsService.assignToHuman(threadId, user.id);
      setThread(prev => prev ? { ...prev, status: 'human_active', assigned_to: user.id } : null);
    } catch (error) {
      console.error('Erro ao assumir conversa:', error);
    }
  };

  const releaseToBot = async () => {
    if (!threadId || !user?.id) return;
    try {
      await ConversationsService.releaseToBot(threadId, user.id);
      setThread(prev => prev ? { ...prev, status: 'bot_active', assigned_to: null } : null);
    } catch (error) {
      console.error('Erro ao devolver para IA:', error);
    }
  };

  const closeConversation = async () => {
    if (!threadId) return;
    try {
      await ConversationsService.closeThread(threadId);
      setThread(prev => prev ? { ...prev, status: 'closed', assigned_to: null } : null);
    } catch (error) {
      console.error('Erro ao encerrar conversa:', error);
    }
  };

  const addNote = async (content: string) => {
    if (!threadId || !user?.id) return;
    try {
      const note = await ConversationsService.addNote(threadId, user.id, content);
      setNotes(prev => [note, ...prev]);
    } catch (error) {
      console.error('Erro ao adicionar nota:', error);
    }
  };

  const deleteNote = async (noteId: string) => {
    try {
      await ConversationsService.deleteNote(noteId);
      setNotes(prev => prev.filter(n => n.id !== noteId));
    } catch (error) {
      console.error('Erro ao remover nota:', error);
    }
  };

  return {
    thread,
    messages,
    notes,
    loading,
    sendMessage,
    assumeConversation,
    releaseToBot,
    closeConversation,
    addNote,
    deleteNote,
    refetch: loadThread,
  };
};
