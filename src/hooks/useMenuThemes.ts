
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { menuThemeService } from '@/services/menuThemeService';
import { toast } from '@/components/ui/use-toast';

export const useMenuThemes = () => {
  const {
    data: themes = [],
    isLoading: loadingThemes,
    error: themesError
  } = useQuery({
    queryKey: ['menu-themes'],
    queryFn: async () => {
      try {
        const result = await menuThemeService.getAvailableThemes();
        return result;
      } catch (error) {
        console.error('Erro ao buscar temas:', error);
        throw error;
      }
    },
    retry: 2,
    retryDelay: 1000
  });

  return {
    themes,
    loadingThemes,
    themesError
  };
};

export const useRestaurantMenuConfig = (restaurantId: string) => {
  const queryClient = useQueryClient();

  // Buscar configuração atual
  const {
    data: config,
    isLoading: loadingConfig,
    error: configError
  } = useQuery({
    queryKey: ['restaurant-menu-config', restaurantId],
    queryFn: async () => {
      if (!restaurantId) {
        return null;
      }
      try {
        const result = await menuThemeService.getRestaurantMenuConfig(restaurantId);
        return result;
      } catch (error) {
        console.error('Erro ao buscar configuração:', error);
        // Se não encontrar configuração, não é erro crítico
        return null;
      }
    },
    enabled: !!restaurantId,
    retry: 1
  });

  // Atualizar configuração
  const updateConfigMutation = useMutation({
    mutationFn: async ({ 
      themeId, 
      customColors, 
      customSettings 
    }: { 
      themeId: string; 
      customColors?: Record<string, string>; 
      customSettings?: Record<string, unknown>;
    }) => {
      if (!restaurantId) {
        throw new Error('Restaurant ID é obrigatório');
      }

      return await menuThemeService.updateRestaurantTheme(
        restaurantId, 
        themeId, 
        customColors || {}, 
        customSettings || {}
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurant-menu-config', restaurantId] });
      toast({
        title: 'Sucesso',
        description: 'Configuração do tema atualizada com sucesso!'
      });
    },
    onError: (error: Error) => {
      console.error('Erro ao atualizar tema:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: error.message || 'Não foi possível atualizar a configuração do tema.'
      });
    }
  });

  return {
    config,
    loadingConfig,
    configError,
    updateConfig: updateConfigMutation.mutate,
    isUpdating: updateConfigMutation.isPending
  };
};
