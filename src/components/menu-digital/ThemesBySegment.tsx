import React, { useState } from 'react';
import { useMenuThemes, useRestaurantMenuConfig } from '@/hooks/useMenuThemes';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { restaurantSegments, getThemesForSegment, themesBySegment, type RestaurantSegment } from '@/themes/menuThemes';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Palette, Loader2, AlertCircle } from 'lucide-react';
import { ColorCustomizer } from './ColorCustomizer';
import { toast } from '@/components/ui/use-toast';

export const ThemesBySegment: React.FC = () => {
  const { user, loading: userLoading } = useCurrentUser();
  const { themes, loadingThemes, themesError } = useMenuThemes();
  const { 
    config, 
    loadingConfig, 
    updateConfig, 
    isUpdating,
  } = useRestaurantMenuConfig(user?.restaurant_id ?? '');

  const [selectedSegment, setSelectedSegment] = useState<RestaurantSegment>('outro');

  if (userLoading || loadingThemes || loadingConfig) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (themesError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Erro ao carregar temas. Tente novamente.
        </AlertDescription>
      </Alert>
    );
  }

  if (!user?.restaurant_id) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Restaurante não encontrado
        </AlertDescription>
      </Alert>
    );
  }

  const handleThemeSelect = async (themeId: string) => {
    if (isUpdating) return;

    try {
      updateConfig({
        themeId,
        customColors: config?.custom_colors || {},
        customSettings: config?.custom_settings || {}
      });
    } catch (error) {
      console.error('Error selecting theme:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Erro ao selecionar tema'
      });
    }
  };

  const segmentEntries = Object.entries(restaurantSegments) as Array<
    [RestaurantSegment, typeof restaurantSegments[RestaurantSegment]]
  >;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Temas por Segmento
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Escolha temas personalizados para seu tipo de restaurante
        </p>
      </div>

      <Tabs value={selectedSegment} onValueChange={(value) => setSelectedSegment(value as RestaurantSegment)}>
        <TabsList className="grid grid-cols-4 lg:grid-cols-8 w-full">
          {segmentEntries.map(([segmentKey, segment]) => (
            <TabsTrigger key={segmentKey} value={segmentKey} className="text-xs">
              <span className="mr-1">{segment.icon}</span>
              <span className="hidden sm:inline">{segment.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {segmentEntries.map(([segmentKey, segment]) => (
          <TabsContent key={segmentKey} value={segmentKey} className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">{segment.label}</h4>
              <p className="text-sm text-muted-foreground mb-4">{segment.description}</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {themes.map((theme) => {
                // Mostrar apenas temas deste segmento
                const themesForSegment = themesBySegment[segmentKey];
                if (!themesForSegment.includes(theme.name as any)) {
                  return null;
                }

                const isActive = config?.theme_id === theme.id;
                const isComingSoon = !theme.is_active;

                return (
                  <Card
                    key={theme.id}
                    className={`relative transition-all cursor-pointer ${
                      isComingSoon
                        ? 'opacity-70 cursor-not-allowed'
                        : 'hover:shadow-md'
                    } ${isActive ? 'ring-2 ring-primary' : ''} ${
                      isUpdating && !isComingSoon ? 'opacity-50 pointer-events-none' : ''
                    }`}
                    onClick={() => !isComingSoon && handleThemeSelect(theme.id)}
                  >
                    {isComingSoon && (
                      <div className="absolute top-2 right-2 z-10">
                        <Badge variant="secondary">Em breve</Badge>
                      </div>
                    )}
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        {theme.preview_image_url && (
                          <div className="aspect-video bg-gray-100 rounded-md overflow-hidden">
                            <img
                              src={theme.preview_image_url}
                              alt={theme.display_name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          </div>
                        )}

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium text-sm">{theme.display_name}</h4>
                            {isActive && !isComingSoon && (
                              <Badge variant="default">Ativo</Badge>
                            )}
                          </div>

                          {theme.description && (
                            <p className="text-xs text-muted-foreground">
                              {theme.description}
                            </p>
                          )}
                        </div>

                        <Button
                          variant={isActive ? 'default' : 'outline'}
                          size="sm"
                          className="w-full"
                          disabled={isUpdating || isComingSoon}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!isComingSoon) handleThemeSelect(theme.id);
                          }}
                        >
                          {isComingSoon ? (
                            'Em breve'
                          ) : isUpdating ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Aplicando...
                            </>
                          ) : isActive ? (
                            'Tema Ativo'
                          ) : (
                            'Selecionar'
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {config && (
        <ColorCustomizer
          config={config}
          onUpdateColors={(colors) => {
            if (isUpdating) return;

            updateConfig({
              themeId: config.theme_id,
              customColors: colors,
              customSettings: config.custom_settings || {}
            });
          }}
        />
      )}

      <Alert className="bg-blue-50 border-blue-200">
        <AlertCircle className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-900 text-sm">
          💡 Dica: Os temas são otimizados para cada tipo de restaurante com cores, fontes e espaçamento apropriados.
        </AlertDescription>
      </Alert>
    </div>
  );
};
