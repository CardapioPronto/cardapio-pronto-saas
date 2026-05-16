
import { MenuData } from '@/types/menuTheme';
import { PublicMenuBase } from '../PublicMenuBase';
import { Card, CardContent } from '@/components/ui/card';
import { QrCode } from 'lucide-react';
import produtoPadrao from "@/assets/produto-padrao.jpg";

interface DefaultThemeProps {
  data: MenuData;
}

export const DefaultTheme = ({ data }: DefaultThemeProps) => {
  const { restaurant, categories, theme } = data;

  const getProductImage = (imageUrl?: string) => {
    return imageUrl || produtoPadrao;
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
                <Card key={product.id} className={`theme-card ${theme.borderRadius} ${product.is_sold_out ? 'opacity-70' : ''}`}>
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
                            <h3 className="font-bold theme-heading flex items-center gap-2">
                              {product.name}
                              {product.is_sold_out && (
                                <span className="text-[10px] font-bold uppercase tracking-wide bg-zinc-800 text-white px-2 py-0.5 rounded-full">
                                  Esgotado
                                </span>
                              )}
                              {product.promotion && (
                                <span
                                  className="text-[10px] font-bold uppercase tracking-wide text-white px-2 py-0.5 rounded-full"
                                  style={{ backgroundColor: theme.colors.primary }}
                                >
                                  {product.promotion.discount_type === 'percentage'
                                    ? `${product.promotion.discount_value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% OFF`
                                    : 'PROMO'}
                                </span>
                              )}
                            </h3>
                            {product.description && (
                              <p className="text-sm opacity-70 mt-1">
                                {product.description}
                              </p>
                            )}
                          </div>
                          <div className="text-right ml-4 whitespace-nowrap">
                            {product.promotion ? (
                              <>
                                <div className="text-xs opacity-60 line-through">
                                  R$ {product.price.toFixed(2)}
                                </div>
                                <div className="font-bold" style={{ color: theme.colors.secondary }}>
                                  R$ {product.promotion.final_price.toFixed(2)}
                                </div>
                              </>
                            ) : (
                              <div className="font-bold" style={{ color: theme.colors.secondary }}>
                                R$ {product.price.toFixed(2)}
                              </div>
                            )}
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
          <span>Cardápio Digital por <strong>Pubfy</strong></span>
        </div>
      </div>
    </PublicMenuBase>
  );
};
