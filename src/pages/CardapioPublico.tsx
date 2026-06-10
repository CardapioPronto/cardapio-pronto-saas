
import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { menuThemeService } from "@/services/menuThemeService";
import { getThemeConfig } from "@/themes/menuThemes";
import { PublicMenuRenderer } from "@/components/public-menu/PublicMenuRenderer";
import { MenuData } from "@/types/menuTheme";
import { Loader2, AlertCircle, Smartphone } from "lucide-react";
import { trackPublicMenuEventQuietly } from "@/services/publicMenuAnalyticsService";

const CardapioPublico = () => {
  const params = useParams<{ slug?: string; id?: string }>();
  const slug = params.slug || params.id;
  const [menuData, setMenuData] = useState<MenuData | null>(null);
  const [themeName, setThemeName] = useState('default');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const trackedMenuViewRef = useRef<string | null>(null);

  useEffect(() => {
    const loadMenuData = async () => {
      if (!slug) {
        setError('Slug do restaurante não encontrado');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await menuThemeService.getPublicMenuData(slug);
        
        // Determinar o tema
        let selectedTheme = 'delivery';
        let customColors = {};
        
        if (data.config) {
          // Buscar o tema pelo ID
          const themes = await menuThemeService.getAvailableThemes();
          const theme = themes.find(t => t.id === data.config?.theme_id);
          if (theme) {
            selectedTheme = theme.name;
            customColors = data.config.custom_colors || {};
          }
        }

        const themeConfig = getThemeConfig(selectedTheme, customColors);
        
        setMenuData({
          restaurant: data.restaurant,
          categories: data.categories,
          theme: themeConfig,
          deliveryConfig: data.deliveryConfig,
          paymentSettings: data.paymentSettings,
          context: getPublicMenuContext(),
        });

        if (trackedMenuViewRef.current !== data.restaurant.id) {
          trackedMenuViewRef.current = data.restaurant.id;
          trackPublicMenuEventQuietly({
            restaurantId: data.restaurant.id,
            eventType: "menu_view",
            metadata: {
              category_count: data.categories.length,
              product_count: data.categories.reduce((sum, category) => sum + category.products.length, 0),
            },
          });
        }
        
        setThemeName(selectedTheme);
        setError(null);
      } catch (error) {
        console.error('Erro ao carregar cardápio:', error);
        setError('Não foi possível carregar o cardápio. Verifique se o link está correto.');
      } finally {
        setLoading(false);
      }
    };

    loadMenuData();
  }, [slug]);

  if (loading) {
    return (
      <>
        <Helmet>
          <title>Carregando cardápio...</title>
          <meta name="robots" content="noindex, nofollow" />
        </Helmet>
        
        <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 text-center">
            <Loader2 className="h-12 w-12 text-primary mx-auto mb-4 animate-spin" />
            <h1 className="text-xl font-bold text-gray-900 mb-2">Carregando cardápio</h1>
            <p className="text-gray-600 text-sm">Preparando uma experiência deliciosa para você...</p>
            
            {/* Skeleton loading */}
            <div className="mt-8 space-y-4">
              <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
              <div className="space-y-3">
                <div className="h-20 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-20 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-20 bg-gray-200 rounded animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (error || !menuData) {
    return (
      <>
        <Helmet>
          <title>Cardápio não encontrado - Erro</title>
          <meta name="robots" content="noindex, nofollow" />
        </Helmet>
        
        <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-red-50 to-orange-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 text-center">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Ops!</h1>
            <p className="text-gray-700 mb-6">{error}</p>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <Smartphone className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600">
                Verifique se o link do cardápio está correto ou entre em contato com o restaurante.
              </p>
            </div>
            
            <button 
              onClick={() => window.location.reload()} 
              className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>{`${menuData.restaurant.name} - Cardápio Digital`}</title>
        <meta name="description" content={`Confira o cardápio digital do ${menuData.restaurant.name}. Pratos deliciosos com fotos e preços atualizados. Peça já!`} />
        <meta name="keywords" content={`${menuData.restaurant.name}, cardápio, restaurante, delivery, comida, pratos`} />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content={`${menuData.restaurant.name} - Cardápio Digital`} />
        <meta property="og:description" content={`Confira o cardápio digital do ${menuData.restaurant.name}. Pratos deliciosos com fotos e preços atualizados.`} />
        {menuData.restaurant.logo_url && (
          <meta property="og:image" content={menuData.restaurant.logo_url} />
        )}
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${menuData.restaurant.name} - Cardápio Digital`} />
        <meta name="twitter:description" content={`Confira o cardápio digital do ${menuData.restaurant.name}. Pratos deliciosos com fotos e preços atualizados.`} />
        {menuData.restaurant.logo_url && (
          <meta name="twitter:image" content={menuData.restaurant.logo_url} />
        )}
        
        {/* Additional SEO */}
        <meta name="robots" content="index, follow" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="canonical" href={window.location.href} />
        
        {/* Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Restaurant",
            "name": menuData.restaurant.name,
            "url": window.location.href,
            ...(menuData.restaurant.logo_url && { "logo": menuData.restaurant.logo_url }),
            "hasMenu": {
              "@type": "Menu",
              "hasMenuSection": menuData.categories.map(category => ({
                "@type": "MenuSection",
                "name": category.name,
                "hasMenuItem": category.products.map(product => ({
                  "@type": "MenuItem",
                  "name": product.name,
                  "description": product.description,
                  "offers": {
                    "@type": "Offer",
                    "price": product.price,
                    "priceCurrency": "BRL"
                  }
                }))
              }))
            }
          })}
        </script>
      </Helmet>
      
      <PublicMenuRenderer data={menuData} themeName={themeName} />
    </>
  );
};

function getPublicMenuContext(): MenuData['context'] {
  if (typeof window === 'undefined') return undefined;

  const params = new URLSearchParams(window.location.search);
  const tableId = params.get('mesa') || params.get('table') || undefined;
  const mode = params.get('modo') || params.get('mode') || undefined;

  const fulfillmentType =
    mode === 'mesa' || mode === 'table'
      ? 'table'
      : mode === 'retirada' || mode === 'pickup'
        ? 'pickup'
        : mode === 'balcao' || mode === 'counter'
          ? 'counter'
          : mode === 'delivery'
            ? 'delivery'
            : tableId
              ? 'table'
              : undefined;

  return {
    fulfillmentType,
    tableId,
  };
}

export default CardapioPublico;
