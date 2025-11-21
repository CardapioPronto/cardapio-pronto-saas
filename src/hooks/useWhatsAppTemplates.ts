import { useState, useEffect, useCallback } from 'react';
import { WhatsAppTemplate, CreateTemplateData, UpdateTemplateData, TemplateType } from '@/types/whatsappTemplate';
import { WhatsAppTemplateManagementService } from '@/services/whatsapp/templateManagementService';
import { getCurrentRestaurantId } from '@/lib/supabase';

export const useWhatsAppTemplates = () => {
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [restaurantId, setRestaurantId] = useState<string>('');

  useEffect(() => {
    const loadRestaurantId = async () => {
      const id = await getCurrentRestaurantId();
      if (id) {
        setRestaurantId(id);
      }
    };
    loadRestaurantId();
  }, []);

  const loadTemplates = useCallback(async () => {
    if (!restaurantId) return;
    
    setLoading(true);
    try {
      const data = await WhatsAppTemplateManagementService.getTemplates(restaurantId);
      setTemplates(data);
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    if (restaurantId) {
      loadTemplates();
    }
  }, [restaurantId, loadTemplates]);

  const createTemplate = async (templateData: CreateTemplateData) => {
    if (!restaurantId) return false;
    
    const newTemplate = await WhatsAppTemplateManagementService.createTemplate(restaurantId, templateData);
    if (newTemplate) {
      await loadTemplates();
      return true;
    }
    return false;
  };

  const updateTemplate = async (templateId: string, templateData: UpdateTemplateData) => {
    const success = await WhatsAppTemplateManagementService.updateTemplate(templateId, templateData);
    if (success) {
      await loadTemplates();
    }
    return success;
  };

  const deleteTemplate = async (templateId: string) => {
    const success = await WhatsAppTemplateManagementService.deleteTemplate(templateId);
    if (success) {
      await loadTemplates();
    }
    return success;
  };

  const createDefaultTemplates = async () => {
    if (!restaurantId) return false;
    
    const success = await WhatsAppTemplateManagementService.createDefaultTemplates(restaurantId);
    if (success) {
      await loadTemplates();
    }
    return success;
  };

  const getTemplateByType = (templateType: TemplateType): WhatsAppTemplate | undefined => {
    return templates.find(t => t.template_type === templateType && t.is_active);
  };

  return {
    templates,
    loading,
    restaurantId,
    loadTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    createDefaultTemplates,
    getTemplateByType
  };
};
