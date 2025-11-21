import { supabase } from "@/integrations/supabase/client";
import { WhatsAppTemplate, CreateTemplateData, UpdateTemplateData, TemplateType, DEFAULT_TEMPLATES } from "@/types/whatsappTemplate";
import { toast } from "sonner";

export class WhatsAppTemplateManagementService {
  /**
   * Buscar todos os templates de um restaurante
   */
  static async getTemplates(restaurantId: string): Promise<WhatsAppTemplate[]> {
    try {
      const { data, error } = await supabase
        .from('whatsapp_message_templates')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('template_type', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar templates:', error);
        throw error;
      }

      return (data || []) as WhatsAppTemplate[];
    } catch (error) {
      console.error('Erro ao buscar templates:', error);
      toast.error('Erro ao carregar templates de mensagens');
      return [];
    }
  }

  /**
   * Buscar template por tipo
   */
  static async getTemplateByType(restaurantId: string, templateType: TemplateType): Promise<WhatsAppTemplate | null> {
    try {
      const { data, error } = await supabase
        .from('whatsapp_message_templates')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .eq('template_type', templateType)
        .eq('is_active', true)
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao buscar template:', error);
        return null;
      }

      return data as WhatsAppTemplate | null;
    } catch (error) {
      console.error('Erro ao buscar template:', error);
      return null;
    }
  }

  /**
   * Criar novo template
   */
  static async createTemplate(restaurantId: string, templateData: CreateTemplateData): Promise<WhatsAppTemplate | null> {
    try {
      const { data, error } = await supabase
        .from('whatsapp_message_templates')
        .insert({
          restaurant_id: restaurantId,
          ...templateData
        })
        .select()
        .single();

      if (error) {
        console.error('Erro ao criar template:', error);
        toast.error('Erro ao criar template');
        return null;
      }

      toast.success('Template criado com sucesso!');
      return data as WhatsAppTemplate;
    } catch (error) {
      console.error('Erro ao criar template:', error);
      toast.error('Erro ao criar template');
      return null;
    }
  }

  /**
   * Atualizar template existente
   */
  static async updateTemplate(templateId: string, templateData: UpdateTemplateData): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('whatsapp_message_templates')
        .update(templateData)
        .eq('id', templateId);

      if (error) {
        console.error('Erro ao atualizar template:', error);
        toast.error('Erro ao atualizar template');
        return false;
      }

      toast.success('Template atualizado com sucesso!');
      return true;
    } catch (error) {
      console.error('Erro ao atualizar template:', error);
      toast.error('Erro ao atualizar template');
      return false;
    }
  }

  /**
   * Deletar template
   */
  static async deleteTemplate(templateId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('whatsapp_message_templates')
        .delete()
        .eq('id', templateId);

      if (error) {
        console.error('Erro ao deletar template:', error);
        toast.error('Erro ao deletar template');
        return false;
      }

      toast.success('Template deletado com sucesso!');
      return true;
    } catch (error) {
      console.error('Erro ao deletar template:', error);
      toast.error('Erro ao deletar template');
      return false;
    }
  }

  /**
   * Criar templates padrão para um restaurante
   */
  static async createDefaultTemplates(restaurantId: string): Promise<boolean> {
    try {
      const templates: CreateTemplateData[] = Object.entries(DEFAULT_TEMPLATES).map(([type, content]) => ({
        template_type: type as TemplateType,
        template_name: `Template Padrão - ${type}`,
        message_content: content,
        is_active: true,
        description: 'Template padrão criado automaticamente'
      }));

      const { error } = await supabase
        .from('whatsapp_message_templates')
        .insert(templates.map(t => ({ ...t, restaurant_id: restaurantId })));

      if (error) {
        console.error('Erro ao criar templates padrão:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Erro ao criar templates padrão:', error);
      return false;
    }
  }

  /**
   * Processar variáveis em um template
   */
  static processTemplateVariables(
    template: string,
    variables: Record<string, string | number>
  ): string {
    let processedMessage = template;

    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`\\{${key}\\}`, 'g');
      processedMessage = processedMessage.replace(regex, String(value));
    });

    return processedMessage;
  }

  /**
   * Enviar mensagem usando template
   */
  static async sendTemplateMessage(
    restaurantId: string,
    templateType: TemplateType,
    phoneNumber: string,
    variables: Record<string, string | number>
  ): Promise<boolean> {
    try {
      const template = await this.getTemplateByType(restaurantId, templateType);

      if (!template) {
        console.error('Template não encontrado:', templateType);
        return false;
      }

      const message = this.processTemplateVariables(template.message_content, variables);

      // Importar o serviço de mensagens para enviar
      const { WhatsAppMessageService } = await import('./messageService');
      return await WhatsAppMessageService.sendMessage(restaurantId, phoneNumber, message);
    } catch (error) {
      console.error('Erro ao enviar mensagem com template:', error);
      return false;
    }
  }
}
