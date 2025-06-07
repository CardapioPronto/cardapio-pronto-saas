
import { MenuData } from '@/types/menuTheme';
import { PublicMenuBase } from '../PublicMenuBase';
import { Card, CardContent } from '@/components/ui/card';
import { QrCode } from 'lucide-react';

interface DefaultThemeProps {
  data: MenuData;
}

export const DefaultTheme = ({ data }: DefaultThemeProps) => {
  const { restaurant, categories, theme } = data;

  const getProductImage = (imageUrl?: string) => {
    return imageUrl || 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=300&fit=crop&crop=center';
  };

  return (
    <PublicMenuBase theme={theme}>
      {/* Header */}
      <div 
        className={`p-4 text-center theme-header ${theme.borderRadius}`}
        style={{ backgroundColor: theme.colors.primary }}
      >
        {restaurant.logo_url && (
          <div className="flex justify-center mb-2">
            <img 
              src={restaurant.logo_url} 
              alt={restaurant.name} 
              className="h-12 object-contain" 
            />
          </div>
        )}
        <h1 className="text-xl font-bold text-white theme-heading">
          {restaurant.name}
        </h1>
        <p className="text-white/80 text-sm">Cardápio Digital</p>
      </div>

      {/* Content */}
      <div className={`p-4 pb-24 ${theme.spacing.section}`}>
        {categories.map(category => (
          <div key={category.id}>
            <h2 className="text-lg font-bold mb-4 theme-primary theme-heading">
              {category.name}
            </h2>
            
            <div className="space-y-3">
              {category.products
                .filter(product => product.available)
                .map(product => (
                <Card key={product.id} className={`theme-card ${theme.borderRadius}`}>
                  <CardContent className={theme.spacing.card}>
                    <div className="flex gap-3">
                      {/* Imagem do produto */}
                      <div className="w-20 h-20 flex-shrink-0 overflow-hidden rounded-md">
                        <img 
                          src={getProductImage(product.image_url)} 
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      
                      {/* Conteúdo do produto */}
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="font-bold theme-heading">{product.name}</h3>
                            {product.description && (
                              <p className="text-sm opacity-70 mt-1">
                                {product.description}
                              </p>
                            )}
                          </div>
                          <div 
                            className="font-bold whitespace-nowrap ml-4"
                            style={{ color: theme.colors.secondary }}
                          >
                            R$ {product.price.toFixed(2)}
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

      {/* Footer */}
      <div 
        className="fixed bottom-0 left-0 right-0 p-3 text-center border-t"
        style={{ backgroundColor: theme.colors.background }}
      >
        <div className="flex justify-center items-center text-sm opacity-60">
          <QrCode className="h-4 w-4 mr-1" />
          <span>Cardápio Digital por <strong>CardápioPronto</strong></span>
        </div>
      </div>
    </PublicMenuBase>
  );
};
