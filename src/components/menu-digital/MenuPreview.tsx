
import React from 'react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useRestaurantMenuConfig } from '@/hooks/useMenuThemes';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink, QrCode } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

export const MenuPreview = () => {
  const { user } = useCurrentUser();
  const { config, loadingConfig } = useRestaurantMenuConfig(user?.restaurant_id || '');

  if (loadingConfig) {
    return (
      <div className="space-y-4">
        <div className="h-32 bg-gray-200 animate-pulse rounded-lg" />
      </div>
    );
  }

  const handlePreview = () => {
    if (!user?.restaurant_id) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Restaurante não encontrado'
      });
      return;
    }

    // Abrir preview em nova aba
    const previewUrl = `/cardapio/${user.restaurant_id}`;
    window.open(previewUrl, '_blank');
  };

  const handleCopyLink = () => {
    if (!user?.restaurant_id) return;
    
    const menuUrl = `${window.location.origin}/cardapio/${user.restaurant_id}`;
    navigator.clipboard.writeText(menuUrl);
    
    toast({
      title: 'Link copiado!',
      description: 'O link do seu cardápio foi copiado para a área de transferência.'
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Visualizar Cardápio
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Visualize como seu cardápio aparecerá para os clientes com o tema selecionado.
          </p>
          
          <div className="flex gap-2">
            <Button onClick={handlePreview} className="flex items-center gap-2">
              <ExternalLink className="h-4 w-4" />
              Abrir Preview
            </Button>
            
            <Button onClick={handleCopyLink} variant="outline">
              Copiar Link
            </Button>
          </div>
          
          {config && (
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm">
                <strong>Tema atual:</strong> {config.theme_id}
              </p>
              {Object.keys(config.custom_colors || {}).length > 0 && (
                <p className="text-sm text-muted-foreground">
                  Com cores personalizadas
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
