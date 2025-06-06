
import React from 'react';
import { useMenuThemes, useRestaurantMenuConfig } from '@/hooks/useMenuThemes';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Palette, Eye, AlertCircle } from 'lucide-react';
import { ColorCustomizer } from './ColorCustomizer';
import { toast } from '@/components/ui/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';

export const MenuThemeSelector = () => {
  const { user, loading: userLoading } = useCurrentUser();
  const { themes, loadingThemes, themesError } = useMenuThemes();
  const { 
    config, 
    loadingConfig, 
    updateConfig, 
    isUpdating,
    configError 
  } = useRestaurantMenuConfig(user?.restaurant_id || '');

  // Mostrar loading enquanto carrega dados essenciais
  if (userLoading || loadingThemes || loadingConfig) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 bg-gray-200 animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  // Verificar se há erros
  if (themesError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Erro ao carregar temas disponíveis. Tente recarregar a página.
        </AlertDescription>
      </Alert>
    );
  }

  if (configError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Erro ao carregar configuração do restaurante. Tente recarregar a página.
        </AlertDescription>
      </Alert>
    );
  }

  // Verificar se usuário tem restaurante
  if (!user?.restaurant_id) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Restaurante não encontrado. Verifique suas configurações de conta.
        </AlertDescription>
      </Alert>
    );
  }

  // Verificar se há temas disponíveis
  if (!themes || themes.length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Nenhum tema disponível no momento.
        </AlertDescription>
      </Alert>
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

    if (isUpdating) {
      return; // Evita múltiplas submissões
    }

    console.log('Selecionando tema:', themeId);
    
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
          {themes.map((theme) => {
            const isActive = config?.theme_id === theme.id;
            
            return (
              <Card 
                key={theme.id} 
                className={`cursor-pointer transition-all hover:shadow-md ${
                  isActive ? 'ring-2 ring-primary' : ''
                } ${isUpdating ? 'opacity-50 pointer-events-none' : ''}`}
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
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{theme.display_name}</h4>
                        {isActive && (
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
                      variant={isActive ? "default" : "outline"}
                      size="sm" 
                      className="w-full"
                      disabled={isUpdating}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleThemeSelect(theme.id);
                      }}
                    >
                      {isUpdating ? 'Aplicando...' : isActive ? 'Tema Ativo' : 'Selecionar'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

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
    </div>
  );
};
