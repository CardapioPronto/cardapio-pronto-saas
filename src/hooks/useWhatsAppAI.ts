import { useState, useEffect, useCallback } from 'react';
import { WhatsAppAIConfig, WhatsAppChatMessage, UpdateWhatsAppAIConfig, ChatConversation } from '@/types/whatsappAI';
import { EvolutionService } from '@/services/whatsapp/evolutionService';
import { getCurrentRestaurantId } from '@/lib/supabase';
import { supabase } from '@/integrations/supabase/client';

export const useWhatsAppAI = () => {
  const [config, setConfig] = useState<WhatsAppAIConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [restaurantId, setRestaurantId] = useState<string>('');
  const [chatHistory, setChatHistory] = useState<WhatsAppChatMessage[]>([]);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);

  // Carrega o restaurant_id
  useEffect(() => {
    const loadRestaurantId = async () => {
      const id = await getCurrentRestaurantId();
      if (id) {
        setRestaurantId(id);
      }
    };
    loadRestaurantId();
  }, []);

  // Carrega a configuração
  const loadConfig = useCallback(async () => {
    if (!restaurantId) return;

    setLoading(true);
    try {
      const data = await EvolutionService.getConfig(restaurantId);
      setConfig(data);
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  // Carrega histórico de chat
  const loadChatHistory = useCallback(async () => {
    if (!restaurantId) return;

    const messages = await EvolutionService.getChatHistory(restaurantId);
    setChatHistory(messages);
    setConversations(EvolutionService.groupMessagesByConversation(messages));
  }, [restaurantId]);

  // Efeito para carregar dados iniciais
  useEffect(() => {
    if (restaurantId) {
      loadConfig();
      loadChatHistory();
    }
  }, [restaurantId, loadConfig, loadChatHistory]);

  // Subscrição realtime para chat
  useEffect(() => {
    if (!restaurantId) return;

    const channel = EvolutionService.subscribeToChat(restaurantId, (newMessage) => {
      setChatHistory(prev => [newMessage, ...prev]);
      setConversations(prev => {
        const updated = [...prev];
        const existingIndex = updated.findIndex(c => c.remoteJid === newMessage.remote_jid);
        
        if (existingIndex >= 0) {
          updated[existingIndex].messages.unshift(newMessage);
          updated[existingIndex].lastMessage = newMessage.message_content;
          updated[existingIndex].lastMessageAt = newMessage.created_at;
        } else {
          updated.unshift({
            remoteJid: newMessage.remote_jid,
            customerPhone: newMessage.customer_phone,
            customerName: newMessage.customer_name,
            lastMessage: newMessage.message_content,
            lastMessageAt: newMessage.created_at,
            unreadCount: 1,
            messages: [newMessage]
          });
        }
        
        return updated.sort((a, b) => 
          new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
        );
      });
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurantId]);

  // Polling para verificar status da conexão
  useEffect(() => {
    if (!config?.instance_name || !restaurantId) return;
    if (config.status !== 'QRCODE' && config.status !== 'CONNECTING') return;

    const interval = setInterval(async () => {
      try {
        const status = await EvolutionService.getStatus(config.instance_name, restaurantId);
        if (status.state === 'open') {
          setConfig(prev => prev ? { ...prev, status: 'CONNECTED' } : null);
          clearInterval(interval);
        }
      } catch (error) {
        console.error('Error polling status:', error);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [config?.instance_name, config?.status, restaurantId]);

  // Cria uma nova instância
  const createInstance = async (instanceName: string) => {
    if (!restaurantId) return false;

    setLoading(true);
    try {
      const newConfig = await EvolutionService.createConfig({
        restaurant_id: restaurantId,
        instance_name: instanceName
      });
      
      if (newConfig) {
        setConfig(newConfig);
        return true;
      }
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Conecta (gera QR Code)
  const connect = async () => {
    if (!config?.instance_name || !restaurantId) return null;

    setConnecting(true);
    try {
      const result = await EvolutionService.connect(config.instance_name, restaurantId);
      
      if (result.base64) {
        setConfig(prev => prev ? { 
          ...prev, 
          status: 'QRCODE', 
          qrcode_base64: result.base64 || null 
        } : null);
      }
      
      return result;
    } finally {
      setConnecting(false);
    }
  };

  // Desconecta
  const disconnect = async () => {
    if (!config?.instance_name || !restaurantId) return;

    await EvolutionService.disconnect(config.instance_name, restaurantId);
    setConfig(prev => prev ? { ...prev, status: 'DISCONNECTED', qrcode_base64: null } : null);
  };

  // Deleta instância
  const deleteInstance = async () => {
    if (!config?.instance_name || !restaurantId) return;

    await EvolutionService.deleteInstance(config.instance_name, restaurantId);
    setConfig(null);
  };

  // Atualiza configuração
  const updateConfig = async (updates: UpdateWhatsAppAIConfig) => {
    if (!restaurantId) return false;

    const success = await EvolutionService.updateConfig(restaurantId, updates);
    if (success) {
      setConfig(prev => prev ? { ...prev, ...updates } : null);
    }
    return success;
  };

  // Verifica status
  const checkStatus = async () => {
    if (!config?.instance_name || !restaurantId) return;

    try {
      const result = await EvolutionService.getStatus(config.instance_name, restaurantId);
      const newStatus = result.state === 'open' ? 'CONNECTED' : 'DISCONNECTED';
      setConfig(prev => prev ? { ...prev, status: newStatus } : null);
    } catch (error) {
      console.error('Error checking status:', error);
    }
  };

  return {
    config,
    loading,
    connecting,
    restaurantId,
    chatHistory,
    conversations,
    createInstance,
    connect,
    disconnect,
    deleteInstance,
    updateConfig,
    checkStatus,
    loadConfig,
    loadChatHistory
  };
};