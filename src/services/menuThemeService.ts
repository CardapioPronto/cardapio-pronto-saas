
import { supabase } from '@/integrations/supabase/client';
import { MenuTheme, RestaurantMenuConfig } from '@/types/menuTheme';

export const menuThemeService = {
  // Buscar todos os temas disponíveis
  async getAvailableThemes(): Promise<MenuTheme[]> {
    console.log('Buscando temas disponíveis...');
    
    const { data, error } = await supabase
      .from('menu_themes')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('Erro ao buscar temas:', error);
      throw error;
    }
    
    console.log('Temas encontrados:', data);
    
    // Transformar null em undefined para compatibilidade com TypeScript
    const themes = (data || []).map(theme => ({
      ...theme,
      description: theme.description || undefined,
      preview_image_url: theme.preview_image_url || undefined
    }));
    
    return themes;
  },

  // Buscar configuração do menu de um restaurante
  async getRestaurantMenuConfig(restaurantId: string): Promise<RestaurantMenuConfig | null> {
    console.log('Buscando configuração do restaurante:', restaurantId);
    
    if (!restaurantId) {
      console.warn('Restaurant ID não fornecido');
      return null;
    }

    const { data, error } = await supabase
      .from('restaurant_menu_config')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      console.error('Erro ao buscar configuração:', error);
      throw error;
    }
    
    console.log('Configuração encontrada:', data);
    
    if (!data) return null;
    
    // Transformar os tipos para compatibilidade
    return {
      ...data,
      custom_colors: (data.custom_colors as Record<string, string>) || {},
      custom_settings: (data.custom_settings as Record<string, any>) || {}
    };
  },

  // Buscar dados do cardápio público por slug
  async getPublicMenuData(slug: string) {
    console.log('Getting public menu data for slug:', slug);
    
    // Buscar restaurante pelo slug ou ID
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select('id, name, logo_url, slug')
      .or(`slug.eq.${slug},id.eq.${slug}`)
      .eq('active', true)
      .single();

    if (restaurantError) {
      console.error('Restaurant error:', restaurantError);
      throw restaurantError;
    }

    console.log('Restaurant found:', restaurant);

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

    if (categoriesError) {
      console.error('Categories error:', categoriesError);
      throw categoriesError;
    }

    console.log('Categories found:', categories);

    // Buscar configuração do tema
    const config = await this.getRestaurantMenuConfig(restaurant.id);
    console.log('Config found:', config);
    
    // Transformar os dados para o formato esperado
    const transformedRestaurant = {
      ...restaurant,
      logo_url: restaurant.logo_url || undefined,
      slug: restaurant.slug || restaurant.id // fallback se slug for null
    };

    const transformedCategories = (categories || [])
      .filter(cat => cat.products && cat.products.length > 0)
      .map(category => ({
        ...category,
        products: category.products.map(product => ({
          ...product,
          description: product.description || undefined,
          image_url: product.image_url || undefined
        }))
      }));
    
    return {
      restaurant: transformedRestaurant,
      categories: transformedCategories,
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
    console.log('Updating restaurant theme:', {
      restaurantId,
      themeId,
      customColors,
      customSettings
    });

    if (!restaurantId) {
      throw new Error('Restaurant ID é obrigatório');
    }

    if (!themeId) {
      throw new Error('Theme ID é obrigatório');
    }

    try {
      // Buscar configuração existente
      const { data: existingConfig } = await supabase
        .from('restaurant_menu_config')
        .select('id')
        .eq('restaurant_id', restaurantId)
        .eq('is_active', true)
        .maybeSingle();

      if (existingConfig) {
        console.log('Atualizando configuração existente:', existingConfig.id);
        
        // Atualizar configuração existente
        const { data, error } = await supabase
          .from('restaurant_menu_config')
          .update({
            theme_id: themeId,
            custom_colors: customColors,
            custom_settings: customSettings,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingConfig.id)
          .select()
          .single();

        if (error) {
          console.error('Error updating restaurant theme:', error);
          throw error;
        }

        console.log('Theme updated successfully:', data);
        
        return {
          ...data,
          custom_colors: (data.custom_colors as Record<string, string>) || {},
          custom_settings: (data.custom_settings as Record<string, any>) || {}
        };
      } else {
        console.log('Criando nova configuração');
        
        // Criar nova configuração
        const { data, error } = await supabase
          .from('restaurant_menu_config')
          .insert({
            restaurant_id: restaurantId,
            theme_id: themeId,
            custom_colors: customColors,
            custom_settings: customSettings,
            is_active: true
          })
          .select()
          .single();

        if (error) {
          console.error('Error creating restaurant theme:', error);
          throw error;
        }
        
        console.log('Theme created successfully:', data);
        
        return {
          ...data,
          custom_colors: (data.custom_colors as Record<string, string>) || {},
          custom_settings: (data.custom_settings as Record<string, any>) || {}
        };
      }
    } catch (error) {
      console.error('Error in updateRestaurantTheme:', error);
      throw error;
    }
  }
};
