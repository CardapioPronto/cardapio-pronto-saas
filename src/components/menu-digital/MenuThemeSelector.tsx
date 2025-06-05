
import React from 'react';
import { useMenuThemes, useRestaurantMenuConfig } from '@/hooks/useMenuThemes';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Palette, Eye } from 'lucide-react';
import { ColorCustomizer } from './ColorCustomizer';
import { toast } from '@/components/ui/use-toast';

export const MenuThemeSelector = () => {
  const { user } = useCurrentUser();
  const { themes, loadingThemes } = useMenuThemes();
  const { 
    config, 
    loadingConfig, 
    updateConfig, 
    isUpdating 
  } = useRestaurantMenuConfig(user?.restaurant_id || '');

  if (loadingThemes || loadingConfig) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 bg-gray-200 animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  const handleThemeSelect = (themeId: string) => {
    if (!user?.restaurant_id) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Restaurante não encontrado'
      });
      return;
    }

    updateConfig({
      themeId,
      customColors: config?.custom_colors || {},
      customSettings: config?.custom_settings || {}
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Escolha um Tema
        </h3>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {themes.map((theme) => (
            <Card 
              key={theme.id} 
              className={`cursor-pointer transition-all hover:shadow-md ${
                config?.theme_id === theme.id 
                  ? 'ring-2 ring-primary' 
                  : ''
              }`}
              onClick={() => handleThemeSelect(theme.id)}
            >
              <CardContent className="p-4">
                <div className="space-y-3">
                  {theme.preview_image_url && (
                    <div className="aspect-video bg-gray-100 rounded-md overflow-hidden">
                      <img 
                        src={theme.preview_image_url} 
                        alt={theme.display_name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{theme.display_name}</h4>
                      {config?.theme_id === theme.id && (
                        <Badge variant="default">Ativo</Badge>
                      )}
                    </div>
                    
                    {theme.description && (
                      <p className="text-sm text-muted-foreground">
                        {theme.description}
                      </p>
                    )}
                  </div>
                  
                  <Button 
                    variant={config?.theme_id === theme.id ? "default" : "outline"}
                    size="sm" 
                    className="w-full"
                    disabled={isUpdating}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleThemeSelect(theme.id);
                    }}
                  >
                    {config?.theme_id === theme.id ? 'Tema Ativo' : 'Selecionar'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {config && (
        <ColorCustomizer 
          config={config}
          onUpdateColors={(colors) => {
            updateConfig({
              themeId: config.theme_id,
              customColors: colors,
              customSettings: config.custom_settings
            });
          }}
        />
      )}
    </div>
  );
};
