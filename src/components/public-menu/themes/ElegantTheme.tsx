
import { MenuData } from '@/types/menuTheme';
import { PublicMenuBase } from '../PublicMenuBase';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { QrCode } from 'lucide-react';

interface ElegantThemeProps {
  data: MenuData;
}

export const ElegantTheme = ({ data }: ElegantThemeProps) => {
  const { restaurant, categories, theme } = data;

  return (
    <PublicMenuBase theme={theme}>
      {/* Header elegante */}
      <div 
        className="p-8 text-center border-b-2"
        style={{ 
          backgroundColor: theme.colors.background,
          borderColor: theme.colors.secondary
        }}
      >
        {restaurant.logo_url && (
          <div className="flex justify-center mb-4">
            <img 
              src={restaurant.logo_url} 
              alt={restaurant.name} 
              className="h-20 object-contain" 
            />
          </div>
        )}
        <h1 
          className="text-3xl font-bold theme-heading mb-2"
          style={{ color: theme.colors.primary }}
        >
          {restaurant.name}
        </h1>
        <div className="flex items-center justify-center">
          <div 
            className="w-12 h-0.5"
            style={{ backgroundColor: theme.colors.secondary }}
          />
          <span className="mx-4 text-sm tracking-wider uppercase opacity-70">
            Menu
          </span>
          <div 
            className="w-12 h-0.5"
            style={{ backgroundColor: theme.colors.secondary }}
          />
        </div>
      </div>

      {/* Content elegante */}
      <div className={`p-8 pb-32 ${theme.spacing.section}`}>
        {categories.map((category, categoryIndex) => (
          <div key={category.id}>
            {categoryIndex > 0 && (
              <Separator className="my-12" style={{ backgroundColor: theme.colors.secondary }} />
            )}
            
            <div className="text-center mb-8">
              <h2 
                className="text-2xl font-bold theme-heading"
                style={{ color: theme.colors.primary }}
              >
                {category.name}
              </h2>
              <div 
                className="w-16 h-0.5 mx-auto mt-2"
                style={{ backgroundColor: theme.colors.secondary }}
              />
            </div>
            
            <div className="space-y-6">
              {category.products
                .filter(product => product.available)
                .map(product => (
                <Card 
                  key={product.id} 
                  className={`theme-card border-0 ${theme.borderRadius}`}
                  style={{ backgroundColor: theme.colors.accent }}
                >
                  <CardContent className={theme.spacing.card}>
                    <div className="text-center">
                      <h3 
                        className="text-xl font-bold theme-heading mb-2"
                        style={{ color: theme.colors.primary }}
                      >
                        {product.name}
                      </h3>
                      
                      {product.description && (
                        <p className="text-sm opacity-80 mb-4 leading-relaxed italic">
                          {product.description}
                        </p>
                      )}
                      
                      <div className="flex items-center justify-center">
                        <div 
                          className="w-8 h-0.5"
                          style={{ backgroundColor: theme.colors.secondary }}
                        />
                        <span 
                          className="mx-4 text-2xl font-bold theme-heading"
                          style={{ color: theme.colors.secondary }}
                        >
                          R$ {product.price.toFixed(2)}
                        </span>
                        <div 
                          className="w-8 h-0.5"
                          style={{ backgroundColor: theme.colors.secondary }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Footer elegante */}
      <div 
        className="fixed bottom-0 left-0 right-0 p-6 text-center border-t-2"
        style={{ 
          backgroundColor: theme.colors.background,
          borderColor: theme.colors.secondary
        }}
      >
        <div className="flex justify-center items-center text-xs opacity-50 tracking-wider uppercase">
          <QrCode className="h-3 w-3 mr-2" />
          <span>Digital Menu by <strong>CardápioPronto</strong></span>
        </div>
      </div>
    </PublicMenuBase>
  );
};
