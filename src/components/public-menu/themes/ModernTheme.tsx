
import { MenuData } from '@/types/menuTheme';
import { PublicMenuBase } from '../PublicMenuBase';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { QrCode } from 'lucide-react';

interface ModernThemeProps {
  data: MenuData;
}

export const ModernTheme = ({ data }: ModernThemeProps) => {
  const { restaurant, categories, theme } = data;

  const getProductImage = (imageUrl?: string) => {
    return imageUrl || 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=300&fit=crop&crop=center';
  };

  return (
    <PublicMenuBase theme={theme}>
      {/* Header com gradiente */}
      <div 
        className={`p-6 text-center theme-header ${theme.borderRadius}`}
        style={{ 
          background: `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.secondary})`
        }}
      >
        {restaurant.logo_url && (
          <div className="flex justify-center mb-3">
            <img 
              src={restaurant.logo_url} 
              alt={restaurant.name} 
              className="h-16 object-contain rounded-full bg-white/10 p-2" 
            />
          </div>
        )}
        <h1 className="text-2xl font-bold text-white theme-heading mb-1">
          {restaurant.name}
        </h1>
        <Badge variant="secondary" className="bg-white/20 text-white border-0">
          Cardápio Digital
        </Badge>
      </div>

      {/* Content */}
      <div className={`p-6 pb-24 ${theme.spacing.section}`}>
        {categories.map(category => (
          <div key={category.id}>
            <div className="flex items-center mb-6">
              <div 
                className="w-1 h-8 mr-3 rounded-full"
                style={{ backgroundColor: theme.colors.primary }}
              />
              <h2 className="text-xl font-bold theme-primary theme-heading">
                {category.name}
              </h2>
            </div>
            
            <div className="grid gap-4">
              {category.products
                .filter(product => product.available)
                .map(product => (
                <Card 
                  key={product.id} 
                  className={`theme-card ${theme.borderRadius} hover:scale-105 transition-transform overflow-hidden`}
                >
                  <CardContent className="p-0">
                    <div className="flex">
                      {/* Imagem do produto */}
                      <div className="w-24 h-24 flex-shrink-0">
                        <img 
                          src={getProductImage(product.image_url)} 
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      
                      {/* Conteúdo do produto */}
                      <div className="flex-1 p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="font-bold text-lg theme-heading mb-1">
                              {product.name}
                            </h3>
                            {product.description && (
                              <p className="text-sm opacity-70 leading-relaxed">
                                {product.description}
                              </p>
                            )}
                          </div>
                          <div className="ml-4 text-right">
                            <div 
                              className="text-xl font-bold"
                              style={{ color: theme.colors.secondary }}
                            >
                              R$ {product.price.toFixed(2)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Footer moderno */}
      <div 
        className="fixed bottom-0 left-0 right-0 p-4 text-center backdrop-blur-sm"
        style={{ 
          backgroundColor: `${theme.colors.background}95`,
          borderTop: `1px solid ${theme.colors.primary}20`
        }}
      >
        <div className="flex justify-center items-center text-sm opacity-60">
          <QrCode className="h-4 w-4 mr-2" />
          <span>Powered by <strong>CardápioPronto</strong></span>
        </div>
      </div>
    </PublicMenuBase>
  );
};
