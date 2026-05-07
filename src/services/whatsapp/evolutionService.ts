import { supabase } from "@/integrations/supabase/client";
import { 
  WhatsAppAIConfig, 
  WhatsAppChatMessage, 
  CreateWhatsAppAIConfig, 
  UpdateWhatsAppAIConfig,
  EvolutionAction,
  EvolutionResponse,
  ChatConversation
} from "@/types/whatsappAI";
import { toast } from "sonner";

export class EvolutionService {
  /**
   * Chama a Edge Function do Evolution API
   */
  static async callEvolutionAPI(
    action: EvolutionAction,
    instanceName: string,
    restaurantId: string
  ): Promise<EvolutionResponse> {
    try {
      const { data, error } = await supabase.functions.invoke('evolution-api', {
        body: { action, instanceName, restaurantId }
      });

      if (error) {
        console.error('Evolution API error:', error);
        throw new Error(error.message);
      }

      return data;
    } catch (error) {
      console.error('Error calling Evolution API:', error);
      throw error;
    }
  }

  /**
   * Obtém a configuração do WhatsApp AI
   */
  static async getConfig(restaurantId: string): Promise<WhatsAppAIConfig | null> {
    try {
      const { data, error } = await supabase
        .from('whatsapp_ai_config')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .maybeSingle();

      if (error) throw error;
      return data as WhatsAppAIConfig | null;
    } catch (error) {
      console.error('Error fetching WhatsApp AI config:', error);
      return null;
    }
  }

  /**
   * Cria uma nova configuração e instância
   */
  static async createConfig(config: CreateWhatsAppAIConfig): Promise<WhatsAppAIConfig | null> {
    try {
      // Primeiro cria no banco
      const { data, error } = await supabase
        .from('whatsapp_ai_config')
        .insert({
          restaurant_id: config.restaurant_id,
          instance_name: config.instance_name,
          bot_name: config.bot_name || 'Atendente Virtual',
          ai_persona: config.ai_persona || 'Você é um atendente virtual simpático e profissional.',
          additional_instructions: config.additional_instructions,
          use_menu_knowledge: config.use_menu_knowledge ?? true,
          status: 'DISCONNECTED'
        })
        .select()
        .single();

      if (error) throw error;

      // Cria a instância na Evolution API
      await this.callEvolutionAPI('create_instance', config.instance_name, config.restaurant_id);
      
      toast.success('Instância criada com sucesso!');
      return data as WhatsAppAIConfig;
    } catch (error) {
      console.error('Error creating WhatsApp AI config:', error);
      toast.error('Erro ao criar configuração');
      return null;
    }
  }

  /**
   * Atualiza a configuração
   */
  static async updateConfig(
    restaurantId: string, 
    updates: UpdateWhatsAppAIConfig
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('whatsapp_ai_config')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('restaurant_id', restaurantId);

      if (error) throw error;
      
      toast.success('Configuração atualizada!');
      return true;
    } catch (error) {
      console.error('Error updating config:', error);
      toast.error('Erro ao atualizar configuração');
      return false;
    }
  }

  /**
   * Conecta a instância (gera QR Code)
   */
  static async connect(instanceName: string, restaurantId: string): Promise<EvolutionResponse> {
    try {
      const result = await this.callEvolutionAPI('connect', instanceName, restaurantId);
      return result;
    } catch (error) {
      console.error('Error connecting:', error);
      toast.error('Erro ao conectar');
      throw error;
    }
  }

  /**
   * Obtém o status da conexão
   */
  static async getStatus(instanceName: string, restaurantId: string): Promise<EvolutionResponse> {
    try {
      return await this.callEvolutionAPI('get_status', instanceName, restaurantId);
    } catch (error) {
      console.error('Error getting status:', error);
      throw error;
    }
  }

  /**
   * Desconecta (logout)
   */
  static async disconnect(instanceName: string, restaurantId: string): Promise<void> {
    try {
      await this.callEvolutionAPI('disconnect', instanceName, restaurantId);
      toast.success('WhatsApp desconectado');
    } catch (error) {
      console.error('Error disconnecting:', error);
      toast.error('Erro ao desconectar');
      throw error;
    }
  }

  /**
   * Deleta a instância completamente
   */
  static async deleteInstance(instanceName: string, restaurantId: string): Promise<void> {
    try {
      await this.callEvolutionAPI('delete_instance', instanceName, restaurantId);
      
      // Remove do banco
      await supabase
        .from('whatsapp_ai_config')
        .delete()
        .eq('restaurant_id', restaurantId);

      toast.success('Instância removida');
    } catch (error) {
      console.error('Error deleting instance:', error);
      toast.error('Erro ao remover instância');
      throw error;
    }
  }

  /**
   * Obtém histórico de conversas
   */
  static async getChatHistory(restaurantId: string): Promise<WhatsAppChatMessage[]> {
    try {
      const { data, error } = await supabase
        .from('whatsapp_chat_history')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;
      return (data || []) as WhatsAppChatMessage[];
    } catch (error) {
      console.error('Error fetching chat history:', error);
      return [];
    }
  }

  /**
   * Agrupa mensagens por conversa
   */
  static groupMessagesByConversation(messages: WhatsAppChatMessage[]): ChatConversation[] {
    const conversations = new Map<string, ChatConversation>();

    messages.forEach(msg => {
      const key = msg.remote_jid;
      
      if (!conversations.has(key)) {
        conversations.set(key, {
          remoteJid: msg.remote_jid,
          customerPhone: msg.customer_phone,
          customerName: msg.customer_name,
          lastMessage: msg.message_content,
          lastMessageAt: msg.created_at,
          unreadCount: 0,
          messages: []
        });
      }

      const conv = conversations.get(key)!;
      conv.messages.push(msg);
      
      // Atualiza última mensagem se for mais recente
      if (new Date(msg.created_at) > new Date(conv.lastMessageAt)) {
        conv.lastMessage = msg.message_content;
        conv.lastMessageAt = msg.created_at;
      }
    });

    // Ordena conversas por última mensagem
    return Array.from(conversations.values())
      .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
  }

  /**
   * Escuta mudanças em tempo real no chat
   */
  static subscribeToChat(
    restaurantId: string, 
    callback: (message: WhatsAppChatMessage) => void
  ) {
    return supabase
      .channel(`whatsapp-chat-${restaurantId}`, { config: { private: true } })
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'whatsapp_chat_history',
          filter: `restaurant_id=eq.${restaurantId}`
        },
        (payload) => {
          callback(payload.new as WhatsAppChatMessage);
        }
      )
      .subscribe();
  }
}
