
import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { menuThemeService } from "@/services/menuThemeService";
import { getThemeConfig } from "@/themes/menuThemes";
import { PublicMenuRenderer } from "@/components/public-menu/PublicMenuRenderer";
import { MenuData } from "@/types/menuTheme";

const CardapioPublico = () => {
  const { slug } = useParams<{ slug: string }>();
  const [menuData, setMenuData] = useState<MenuData | null>(null);
  const [themeName, setThemeName] = useState('default');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        let selectedTheme = 'default';
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
          theme: themeConfig
        });
        
        setThemeName(selectedTheme);
        setLoading(false);
      } catch (error) {
        console.error('Erro ao carregar cardápio:', error);
        setError('Não foi possível carregar o cardápio. Verifique se o link está correto.');
        setLoading(false);
      }
    };

    loadMenuData();
  }, [slug]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
        <div className="animate-pulse bg-white rounded-lg shadow-md w-full max-w-md p-6">
          <div className="w-full h-12 bg-gray-300 rounded mb-6"></div>
          <div className="space-y-4">
            <div className="h-8 bg-gray-300 rounded"></div>
            <div className="h-24 bg-gray-300 rounded"></div>
            <div className="h-24 bg-gray-300 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !menuData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
        <div className="bg-white rounded-lg shadow-md w-full max-w-md p-6 text-center">
          <h1 className="text-xl font-bold text-red-500 mb-2">Ops!</h1>
          <p className="text-gray-700 mb-4">{error}</p>
        </div>
      </div>
    );
  }

  return <PublicMenuRenderer data={menuData} themeName={themeName} />;
};

export default CardapioPublico;
