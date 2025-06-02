
import { useState, useEffect } from "react";
import { WhatsAppService } from "@/services/whatsapp/whatsappService";
import { WhatsAppIntegration } from "@/services/whatsapp/types";
import { useCurrentUser } from "./useCurrentUser";

export const useWhatsAppIntegration = () => {
  const { user } = useCurrentUser();
  const restaurantId = user?.restaurant_id || "";
  
  const [integration, setIntegration] = useState<WhatsAppIntegration | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (restaurantId) {
      loadIntegration();
    }
  }, [restaurantId]);

  const loadIntegration = async () => {
    setLoading(true);
    try {
      const data = await WhatsAppService.getIntegration(restaurantId);
      setIntegration(data);
    } catch (error) {
      console.error('Erro ao carregar integração WhatsApp:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendOrderNotification = async (customerPhone: string, orderId: string) => {
    if (!integration?.is_enabled || !integration.auto_send_orders) {
      return false;
    }

    return await WhatsAppService.sendOrderConfirmation(
      restaurantId,
      customerPhone,
      orderId
    );
  };

  return {
    integration,
    loading,
    loadIntegration,
    sendOrderNotification,
    isEnabled: integration?.is_enabled || false,
    autoSendEnabled: integration?.auto_send_orders || false
  };
};
