
import { useState, useEffect } from "react";
import { WhatsAppService } from "@/services/whatsapp/whatsappService";
import { WhatsAppIntegration } from "@/services/whatsapp/types";
import { useCurrentUser } from "./useCurrentUser";
import { getCurrentRestaurantId } from "@/lib/supabase";

export const useWhatsAppIntegration = () => {
  const { user } = useCurrentUser();
  const [restaurantId, setRestaurantId] = useState<string>("");
  
  const [integration, setIntegration] = useState<WhatsAppIntegration | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadRestaurantId = async () => {
      if (user) {
        try {
          const id = await getCurrentRestaurantId();
          if (id) {
            setRestaurantId(id);
          }
        } catch (error) {
          console.error('Erro ao obter ID do restaurante:', error);
        }
      }
    };

    loadRestaurantId();
  }, [user]);

  useEffect(() => {
    if (restaurantId) {
      loadIntegration();
    }
  }, [restaurantId]);

  const loadIntegration = async () => {
    if (!restaurantId) return;
    
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
    if (!integration?.is_enabled || !integration.auto_send_orders || !restaurantId) {
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
    autoSendEnabled: integration?.auto_send_orders || false,
    restaurantId
  };
};
