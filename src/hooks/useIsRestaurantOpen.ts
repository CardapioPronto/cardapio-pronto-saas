import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { IsRestaurantOpenResponse } from '@/types/features';

/**
 * Hook to check if a restaurant is currently open based on its configured hours
 * @param restaurantId - The restaurant ID to check
 * @returns Object with isOpen status, current time, and message
 */
export const useIsRestaurantOpen = (restaurantId?: string | null) => {
  return useQuery({
    queryKey: ['restaurant-is-open', restaurantId],
    queryFn: async (): Promise<IsRestaurantOpenResponse> => {
      if (!restaurantId) {
        return {
          isOpen: true, // Default to open if no restaurant ID
          currentTime: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          openingTime: null,
          closingTime: null,
          message: 'Sem validação de horário',
        };
      }

      try {
        // Fetch restaurant settings
        const { data: settings, error: settingsError } = await supabase
          .from('restaurant_settings')
          .select('setting_value')
          .eq('restaurant_id', restaurantId)
          .eq('setting_key', 'hours')
          .maybeSingle();

        if (settingsError) {
          console.error('Error fetching hours:', settingsError);
          return {
            isOpen: true,
            currentTime: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            openingTime: null,
            closingTime: null,
            message: 'Erro ao verificar horários',
          };
        }

        // If no hours configured, assume always open
        if (!settings?.setting_value) {
          return {
            isOpen: true,
            currentTime: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            openingTime: null,
            closingTime: null,
            message: 'Horário não configurado (sempre aberto)',
          };
        }

        const hours = settings.setting_value as any;
        const openingTime = hours.opening_time;
        const closingTime = hours.closing_time;

        if (!openingTime || !closingTime) {
          return {
            isOpen: true,
            currentTime: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            openingTime,
            closingTime,
            message: 'Horário não configurado completamente',
          };
        }

        // Compare current time with opening and closing times
        const now = new Date();
        const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        
        const isOpen = currentTimeStr >= openingTime && currentTimeStr < closingTime;

        return {
          isOpen,
          currentTime: currentTimeStr,
          openingTime,
          closingTime,
          message: isOpen 
            ? `Aberto até ${closingTime}`
            : `Fechado. Abre às ${openingTime}`,
        };
      } catch (error) {
        console.error('Error checking restaurant hours:', error);
        return {
          isOpen: true,
          currentTime: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          openingTime: null,
          closingTime: null,
          message: 'Erro ao verificar horários',
        };
      }
    },
    enabled: !!restaurantId,
    staleTime: 60000, // 1 minute
    refetchInterval: 60000, // Refetch every minute to keep status accurate
  });
};

/**
 * Utility function to save restaurant hours
 */
export const saveRestaurantHours = async (
  restaurantId: string,
  openingTime: string,
  closingTime: string
) => {
  try {
    const { error } = await supabase
      .from('restaurant_settings')
      .upsert(
        {
          restaurant_id: restaurantId,
          setting_key: 'hours',
          setting_value: { opening_time: openingTime, closing_time: closingTime },
        },
        { onConflict: 'restaurant_id,setting_key' }
      );

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error saving hours:', error);
    throw error;
  }
};

/**
 * Parse time string (HH:mm) to minutes since midnight
 */
export const timeToMinutes = (timeStr: string): number => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

/**
 * Format minutes since midnight to time string (HH:mm)
 */
export const minutesToTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
};
