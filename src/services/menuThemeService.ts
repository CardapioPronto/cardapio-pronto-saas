
import { supabase } from '@/integrations/supabase/client';
import { MenuTheme, RestaurantMenuConfig, DeliveryConfig, DEFAULT_DELIVERY_CONFIG } from '@/types/menuTheme';

export const menuThemeService = {
  // Buscar todos os temas disponíveis
  async getAvailableThemes(): Promise<MenuTheme[]> {
    console.log('Buscando temas disponíveis...');
    
    try {
      const { data, error } = await supabase
        .from('menu_themes')
        .select('*')
        .order('name');

      if (error) {
        console.error('Erro ao buscar temas:', error);
        throw new Error(`Erro ao buscar temas: ${error.message}`);
      }
      
      console.log('Temas encontrados:', data);

      const dbThemes: MenuTheme[] = (data || []).map(theme => ({
        ...theme,
        description: theme.description || undefined,
        preview_image_url: theme.preview_image_url || undefined,
      }));

      // Retorna todos os temas; o seletor exibirá os inativos como "Em breve"
      // Reordenar: ativos primeiro, e dentro dos ativos, "delivery" primeiro
      dbThemes.sort((a, b) => {
        if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
        if (a.name === 'delivery') return -1;
        if (b.name === 'delivery') return 1;
        return a.display_name.localeCompare(b.display_name);
      });

      return dbThemes;
    } catch (error) {
      console.error('Erro na função getAvailableThemes:', error);
      throw error;
    }
  },

  // Buscar configuração do menu de um restaurante
  async getRestaurantMenuConfig(restaurantId: string): Promise<RestaurantMenuConfig | null> {
    console.log('Buscando configuração do restaurante:', restaurantId);
    
    if (!restaurantId) {
      console.warn('Restaurant ID não fornecido');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('restaurant_menu_config')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        console.error('Erro ao buscar configuração:', error);
        throw new Error(`Erro ao buscar configuração: ${error.message}`);
      }
      
      console.log('Configuração encontrada:', data);
      
      if (!data) {
        console.log('Nenhuma configuração encontrada, retornando null');
        return null;
      }
      
      // Transformar os tipos para compatibilidade
      return {
        ...data,
        custom_colors: (data.custom_colors as Record<string, string>) || {},
        custom_settings: (data.custom_settings as Record<string, any>) || {}
      };
    } catch (error) {
      console.error('Erro na função getRestaurantMenuConfig:', error);
      throw error;
    }
  },

  // Buscar dados do cardápio público por slug
  async getPublicMenuData(slug: string) {
    console.log('Getting public menu data for slug:', slug);
    
    try {
      // Buscar restaurante pelo slug ou ID
      const { data: restaurant, error: restaurantError } = await supabase
        .from('restaurants')
        .select('id, name, logo_url, banner_url, slug, address, phone, phone_whatsapp, business_hours, category')
        .or(`slug.eq.${slug},id.eq.${slug}`)
        .eq('active', true)
        .single();

      if (restaurantError) {
        console.error('Restaurant error:', restaurantError);
        throw new Error(`Erro ao buscar restaurante: ${restaurantError.message}`);
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
            available,
            category_id
          )
        `)
        .eq('restaurant_id', restaurant.id)
        .order('name');

      if (categoriesError) {
        console.error('Categories error:', categoriesError);
        throw new Error(`Erro ao buscar categorias: ${categoriesError.message}`);
      }

      console.log('Categories found:', categories);

      // Buscar configuração do tema
      const config = await this.getRestaurantMenuConfig(restaurant.id);
      console.log('Config found:', config);

      // Buscar configuração de delivery (restaurant_settings)
      const deliveryConfig = await this.getDeliveryConfig(restaurant.id);
      
      // Transformar os dados para o formato esperado
      const transformedRestaurant = {
        ...restaurant,
        logo_url: restaurant.logo_url || undefined,
        banner_url: restaurant.banner_url || undefined,
        address: restaurant.address || undefined,
        phone: restaurant.phone || undefined,
        phone_whatsapp: restaurant.phone_whatsapp || undefined,
        business_hours: restaurant.business_hours || undefined,
        category: restaurant.category || undefined,
        slug: restaurant.slug || restaurant.id // fallback se slug for null
      };

      const transformedCategories = (categories || [])
        .filter(cat => cat.products && cat.products.length > 0)
        .map(category => ({
          ...category,
          products: category.products
            .filter((p: any) => p.available !== false)
            .map((product: any) => ({
              ...product,
              description: product.description || undefined,
              image_url: product.image_url || undefined,
            })),
        }));
      
      return {
        restaurant: transformedRestaurant,
        categories: transformedCategories,
        config,
        deliveryConfig,
      };
    } catch (error) {
      console.error('Erro na função getPublicMenuData:', error);
      throw error;
    }
  },

  // Buscar configuração de delivery do restaurante
  async getDeliveryConfig(restaurantId: string): Promise<DeliveryConfig> {
    try {
      const { data, error } = await supabase
        .from('restaurant_settings')
        .select('setting_value')
        .eq('restaurant_id', restaurantId)
        .eq('setting_key', 'delivery_config')
        .maybeSingle();

      if (error) {
        console.warn('Erro ao buscar delivery_config:', error);
        return DEFAULT_DELIVERY_CONFIG;
      }
      if (!data) return DEFAULT_DELIVERY_CONFIG;
      return { ...DEFAULT_DELIVERY_CONFIG, ...((data.setting_value as Partial<DeliveryConfig>) || {}) };
    } catch (e) {
      console.warn('Falha em getDeliveryConfig', e);
      return DEFAULT_DELIVERY_CONFIG;
    }
  },

  // Salvar config de delivery
  async saveDeliveryConfig(restaurantId: string, config: DeliveryConfig) {
    const { error } = await supabase
      .from('restaurant_settings')
      .upsert(
        {
          restaurant_id: restaurantId,
          setting_key: 'delivery_config',
          setting_value: config as any,
        },
        { onConflict: 'restaurant_id,setting_key' }
      );
    if (error) throw error;
    return config;
  },

  // Atualizar dados do restaurante (banner, logo, etc.)
  async updateRestaurantInfo(restaurantId: string, updates: {
    banner_url?: string | null;
    logo_url?: string | null;
    name?: string;
    address?: string;
    phone?: string;
    phone_whatsapp?: string;
    business_hours?: string;
    category?: string;
  }) {
    const { data, error } = await supabase
      .from('restaurants')
      .update(updates)
      .eq('id', restaurantId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Upload de asset (banner ou logo)
  async uploadRestaurantAsset(restaurantId: string, file: File, kind: 'banner' | 'logo'): Promise<string> {
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const path = `${restaurantId}/${kind}-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from('restaurant-assets')
      .upload(path, file, { upsert: true, cacheControl: '3600' });
    if (upErr) throw upErr;
    const { data } = supabase.storage.from('restaurant-assets').getPublicUrl(path);
    return data.publicUrl;
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
          throw new Error(`Erro ao atualizar tema: ${error.message}`);
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
          throw new Error(`Erro ao criar tema: ${error.message}`);
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
