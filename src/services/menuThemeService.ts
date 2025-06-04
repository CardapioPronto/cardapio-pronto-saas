
import { supabase } from '@/integrations/supabase/client';
import { MenuTheme, RestaurantMenuConfig } from '@/types/menuTheme';

export const menuThemeService = {
  // Buscar todos os temas disponíveis
  async getAvailableThemes(): Promise<MenuTheme[]> {
    const { data, error } = await supabase
      .from('menu_themes')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) throw error;
    return data || [];
  },

  // Buscar configuração do menu de um restaurante
  async getRestaurantMenuConfig(restaurantId: string): Promise<RestaurantMenuConfig | null> {
    const { data, error } = await supabase
      .from('restaurant_menu_config')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  // Buscar dados do cardápio público por slug
  async getPublicMenuData(slug: string) {
    // Buscar restaurante pelo slug
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select('id, name, logo_url, slug')
      .eq('slug', slug)
      .eq('active', true)
      .single();

    if (restaurantError) throw restaurantError;

    // Buscar categorias e produtos
    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select(`
        id,
        name,
        products:products(
          id,
          name,
          description,
          price,
          image_url,
          available
        )
      `)
      .eq('restaurant_id', restaurant.id)
      .order('name');

    if (categoriesError) throw categoriesError;

    // Buscar configuração do tema
    const config = await this.getRestaurantMenuConfig(restaurant.id);
    
    return {
      restaurant,
      categories: categories?.filter(cat => 
        cat.products && cat.products.length > 0
      ) || [],
      config
    };
  },

  // Atualizar configuração do tema de um restaurante
  async updateRestaurantTheme(
    restaurantId: string, 
    themeId: string, 
    customColors: Record<string, string> = {},
    customSettings: Record<string, any> = {}
  ): Promise<RestaurantMenuConfig> {
    const { data, error } = await supabase
      .from('restaurant_menu_config')
      .upsert({
        restaurant_id: restaurantId,
        theme_id: themeId,
        custom_colors: customColors,
        custom_settings: customSettings,
        is_active: true
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};
