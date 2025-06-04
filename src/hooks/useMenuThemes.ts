
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { menuThemeService } from '@/services/menuThemeService';
import { MenuTheme, RestaurantMenuConfig } from '@/types/menuTheme';
import { toast } from '@/components/ui/use-toast';

export const useMenuThemes = () => {
  const queryClient = useQueryClient();

  // Buscar temas disponíveis
  const {
    data: themes = [],
    isLoading: loadingThemes,
    error: themesError
  } = useQuery({
    queryKey: ['menu-themes'],
    queryFn: menuThemeService.getAvailableThemes
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
    queryFn: () => menuThemeService.getRestaurantMenuConfig(restaurantId),
    enabled: !!restaurantId
  });

  // Atualizar configuração
  const updateConfigMutation = useMutation({
    mutationFn: ({ 
      themeId, 
      customColors, 
      customSettings 
    }: { 
      themeId: string; 
      customColors?: Record<string, string>; 
      customSettings?: Record<string, any>; 
    }) => menuThemeService.updateRestaurantTheme(
      restaurantId, 
      themeId, 
      customColors, 
      customSettings
    ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurant-menu-config', restaurantId] });
      toast({
        title: 'Sucesso',
        description: 'Configuração do tema atualizada com sucesso!'
      });
    },
    onError: (error) => {
      console.error('Erro ao atualizar tema:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível atualizar a configuração do tema.'
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
