
import { supabase } from '@/integrations/supabase/client';
import {
  MenuTheme,
  RestaurantMenuConfig,
  DeliveryConfig,
  DEFAULT_DELIVERY_CONFIG,
  PublicMenuPromotion,
  PublicMenuPromotionApplied,
  PublicMenuProduct,
  PublicMenuUpsell,
  PublicMenuUpsellSuggestion,
} from '@/types/menuTheme';
import { restaurantPaymentService } from '@/services/restaurantPaymentService';
import type { Json } from '@/integrations/supabase/types';
import type { PostgrestError } from '@supabase/supabase-js';

type JsonRecord = Record<string, unknown>;

type PublicRestaurantRow = {
  id: string;
  name: string;
  logo_url: string | null;
  banner_url: string | null;
  slug: string | null;
  address: string | null;
  phone: string | null;
  phone_whatsapp: string | null;
  business_hours: string | null;
  category: string | null;
  active: boolean | null;
};

type PublicPaymentSettings = ReturnType<typeof restaurantPaymentService.toPublic>;
type RpcClient = {
  rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: PostgrestError | null }>;
};

type RawUpsellEntry = {
  productId: string;
  triggerProductId?: string;
  title?: string | null;
  description?: string | null;
  ordersCount?: number;
};

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const toRecord = (value: Json | null | undefined): JsonRecord =>
  isRecord(value) ? value : {};

const toStringRecord = (value: Json | null | undefined): Record<string, string> =>
  Object.fromEntries(
    Object.entries(toRecord(value)).filter((entry): entry is [string, string] => typeof entry[1] === 'string')
  );

const toJson = (value: Record<string, unknown>): Json => value as unknown as Json;

const asString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() ? value : undefined;

const asNumber = (value: unknown): number | undefined => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const parseUpsellArray = (value: unknown): RawUpsellEntry[] => {
  if (!Array.isArray(value)) return [];

  return value.flatMap((entry) => {
    if (!isRecord(entry)) return [];
    const productId = asString(entry.productId);
    if (!productId) return [];

    return [{
      productId,
      triggerProductId: asString(entry.triggerProductId),
      title: asString(entry.title) ?? null,
      description: asString(entry.description) ?? null,
      ordersCount: asNumber(entry.ordersCount),
    }];
  });
};

const addSuggestion = (
  target: Record<string, PublicMenuUpsellSuggestion[]>,
  triggerProductId: string | undefined,
  suggestion: PublicMenuUpsellSuggestion,
) => {
  if (!triggerProductId || suggestion.product.id === triggerProductId) return;
  const current = target[triggerProductId] ?? [];
  if (current.some((item) => item.product.id === suggestion.product.id)) return;
  target[triggerProductId] = [...current, suggestion].slice(0, 4);
};

const buildPublicUpsell = (
  raw: unknown,
  productById: Map<string, PublicMenuProduct>,
): PublicMenuUpsell => {
  const source = toRecord(raw as Json);
  const featuredProducts: PublicMenuUpsellSuggestion[] = [];
  const cartComboSuggestions: PublicMenuUpsellSuggestion[] = [];
  const productModalSuggestions: Record<string, PublicMenuUpsellSuggestion[]> = {};
  const alsoOrderedSuggestions: Record<string, PublicMenuUpsellSuggestion[]> = {};

  for (const entry of parseUpsellArray(source.featured)) {
    const product = productById.get(entry.productId);
    if (!product || product.is_sold_out) continue;
    if (featuredProducts.some((item) => item.product.id === product.id)) continue;
    featuredProducts.push({
      product,
      title: entry.title,
      description: entry.description,
      source: 'manual',
    });
  }

  for (const entry of parseUpsellArray(source.productModal)) {
    const product = productById.get(entry.productId);
    if (!product || product.is_sold_out) continue;
    addSuggestion(productModalSuggestions, entry.triggerProductId, {
      product,
      title: entry.title,
      description: entry.description,
      source: 'manual',
    });
  }

  for (const entry of parseUpsellArray(source.cartCombos)) {
    const product = productById.get(entry.productId);
    if (!product || product.is_sold_out) continue;
    if (cartComboSuggestions.some((item) => item.product.id === product.id)) continue;
    cartComboSuggestions.push({
      product,
      title: entry.title,
      description: entry.description,
      source: 'manual',
    });
  }

  for (const entry of parseUpsellArray(source.alsoOrderedManual)) {
    const product = productById.get(entry.productId);
    if (!product || product.is_sold_out) continue;
    addSuggestion(alsoOrderedSuggestions, entry.triggerProductId, {
      product,
      title: entry.title,
      description: entry.description,
      source: 'manual',
    });
  }

  for (const entry of parseUpsellArray(source.alsoOrderedReal)) {
    const product = productById.get(entry.productId);
    if (!product || product.is_sold_out) continue;
    addSuggestion(alsoOrderedSuggestions, entry.triggerProductId, {
      product,
      title: 'Clientes também pedem',
      description: null,
      source: 'sales',
      ordersCount: entry.ordersCount,
    });
  }

  return {
    featuredProducts: featuredProducts.slice(0, 6),
    productModalSuggestions,
    cartComboSuggestions: cartComboSuggestions.slice(0, 4),
    alsoOrderedSuggestions,
  };
};

const parsePromotionRow = (row: unknown): PublicMenuPromotion | null => {
  if (!isRecord(row)) return null;
  const id = typeof row.id === 'string' ? row.id : null;
  const name = typeof row.name === 'string' ? row.name : null;
  const discountType = row.discount_type === 'fixed' || row.discount_type === 'percentage' ? row.discount_type : null;
  const discountValue = typeof row.discount_value === 'number'
    ? row.discount_value
    : Number(row.discount_value);
  const applicableTo = row.applicable_to === 'product' || row.applicable_to === 'category' || row.applicable_to === 'order'
    ? row.applicable_to
    : null;
  const validFrom = typeof row.valid_from === 'string' ? row.valid_from : null;

  if (!id || !name || !discountType || !applicableTo || !validFrom || !Number.isFinite(discountValue)) {
    return null;
  }

  const minOrderRaw = row.min_order_value;
  const minOrder = typeof minOrderRaw === 'number'
    ? minOrderRaw
    : minOrderRaw == null
      ? null
      : Number(minOrderRaw);

  return {
    id,
    name,
    description: typeof row.description === 'string' ? row.description : null,
    discount_type: discountType,
    discount_value: discountValue,
    applicable_to: applicableTo,
    target_id: typeof row.target_id === 'string' ? row.target_id : null,
    min_order_value: Number.isFinite(minOrder) ? minOrder as number : null,
    valid_from: validFrom,
    valid_until: typeof row.valid_until === 'string' ? row.valid_until : null,
  };
};

const round2 = (value: number) => Math.round(value * 100) / 100;

const computeUnitDiscount = (price: number, promotion: PublicMenuPromotion): number => {
  if (!Number.isFinite(price) || price <= 0) return 0;
  const raw = promotion.discount_type === 'percentage'
    ? (price * promotion.discount_value) / 100
    : promotion.discount_value;
  return Math.min(price, Math.max(0, round2(raw)));
};

const pickApplicablePromotion = (
  product: { id: string; price: number; category_id?: string | null },
  promotions: PublicMenuPromotion[],
): PublicMenuPromotionApplied | null => {
  let best: PublicMenuPromotionApplied | null = null;

  for (const promo of promotions) {
    if (promo.applicable_to === 'product' && promo.target_id !== product.id) continue;
    if (promo.applicable_to === 'category' && promo.target_id !== product.category_id) continue;
    if (promo.applicable_to !== 'product' && promo.applicable_to !== 'category') continue;

    const unitDiscount = computeUnitDiscount(product.price, promo);
    if (unitDiscount <= 0) continue;

    if (!best || unitDiscount > best.unit_discount) {
      best = {
        id: promo.id,
        name: promo.name,
        discount_type: promo.discount_type,
        discount_value: promo.discount_value,
        applicable_to: promo.applicable_to,
        unit_discount: unitDiscount,
        final_price: Math.max(0, round2(product.price - unitDiscount)),
      };
    }
  }

  return best;
};

const toDeliveryConfig = (value: Json | null | undefined): DeliveryConfig => {
  const record = toRecord(value);

  return {
    delivery_enabled: typeof record.delivery_enabled === 'boolean' ? record.delivery_enabled : DEFAULT_DELIVERY_CONFIG.delivery_enabled,
    delivery_fee: typeof record.delivery_fee === 'number' ? record.delivery_fee : DEFAULT_DELIVERY_CONFIG.delivery_fee,
    min_order_value: typeof record.min_order_value === 'number' ? record.min_order_value : DEFAULT_DELIVERY_CONFIG.min_order_value,
    estimated_delivery_minutes: typeof record.estimated_delivery_minutes === 'number' ? record.estimated_delivery_minutes : DEFAULT_DELIVERY_CONFIG.estimated_delivery_minutes,
    delivery_radius_km: typeof record.delivery_radius_km === 'number' ? record.delivery_radius_km : DEFAULT_DELIVERY_CONFIG.delivery_radius_km,
    payment_methods: Array.isArray(record.payment_methods)
      ? record.payment_methods.filter((method): method is string => typeof method === 'string')
      : DEFAULT_DELIVERY_CONFIG.payment_methods,
    pickup_enabled: typeof record.pickup_enabled === 'boolean' ? record.pickup_enabled : DEFAULT_DELIVERY_CONFIG.pickup_enabled,
  };
};

export const menuThemeService = {
  // Buscar todos os temas disponíveis
  async getAvailableThemes(): Promise<MenuTheme[]> {
    try {
      const { data, error } = await supabase
        .from('menu_themes')
        .select('*')
        .order('name');

      if (error) {
        console.error('Erro ao buscar temas:', error);
        throw new Error(`Erro ao buscar temas: ${error.message}`);
      }

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
      
      if (!data) {
        return null;
      }
      
      // Transformar os tipos para compatibilidade
      return {
        ...data,
        custom_colors: toStringRecord(data.custom_colors),
        custom_settings: toRecord(data.custom_settings)
      };
    } catch (error) {
      console.error('Erro na função getRestaurantMenuConfig:', error);
      throw error;
    }
  },

  // Buscar dados do cardápio público por slug
  async getPublicMenuData(slug: string) {
    try {
      // Detectar se é UUID (id) ou slug textual
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);
      const columns = 'id, name, logo_url, banner_url, slug, address, phone, phone_whatsapp, business_hours, category, active';

      let restaurant: PublicRestaurantRow | null = null;
      let restaurantError: PostgrestError | null = null;

      if (isUuid) {
        const res = await supabase
          .from('restaurants')
          .select(columns)
          .eq('id', slug)
          .eq('active', true)
          .maybeSingle();
        restaurant = res.data;
        restaurantError = res.error;
      } else {
        const res = await supabase
          .from('restaurants')
          .select(columns)
          .eq('slug', slug)
          .eq('active', true)
          .maybeSingle();
        restaurant = res.data;
        restaurantError = res.error;
      }

      if (restaurantError) {
        console.error('Restaurant error:', restaurantError);
        throw new Error(`Erro ao buscar restaurante: ${restaurantError.message}`);
      }

      if (!restaurant) {
        throw new Error('Restaurante não encontrado. Verifique o link do cardápio.');
      }

      // Buscar categorias e produtos respeitando a ordenação configurada pelo restaurante
      const { data: categories, error: categoriesError } = await supabase
        .from('categories')
        .select('id, name, order_position')
        .eq('restaurant_id', restaurant.id)
        .order('order_position', { ascending: true, nullsFirst: false })
        .order('name', { ascending: true });

      if (categoriesError) {
        console.error('Categories error:', categoriesError);
        throw new Error(`Erro ao buscar categorias: ${categoriesError.message}`);
      }

      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id, name, description, price, image_url, available, category_id, order_position, stock_tracking_enabled, stock_quantity')
        .eq('restaurant_id', restaurant.id)
        .eq('available', true)
        .not('category_id', 'is', null)
        .order('order_position', { ascending: true, nullsFirst: false })
        .order('name', { ascending: true });

      if (productsError) {
        console.error('Products error:', productsError);
        throw new Error(`Erro ao buscar produtos: ${productsError.message}`);
      }

      // Buscar configuração do tema
      const config = await this.getRestaurantMenuConfig(restaurant.id);

      // Buscar configuração de delivery (restaurant_settings)
      const deliveryConfig = await this.getDeliveryConfig(restaurant.id);
      const paymentSettings = await this.getPublicPaymentSettings(restaurant.id);
      const promotions = await this.getPublicPromotions(restaurant.id);
      
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

      const orderedProducts = [...(products || [])].sort(sortMenuItems);
      const productsByCategory = orderedProducts.reduce<Record<string, typeof orderedProducts>>((acc, product) => {
        if (!product.category_id) return acc;
        acc[product.category_id] = acc[product.category_id] || [];
        acc[product.category_id].push(product);
        return acc;
      }, {});

      const transformedCategories = [...(categories || [])]
        .sort(sortMenuItems)
        .map(category => ({
          ...category,
          products: (productsByCategory[category.id] || []).map(product => {
            const price = Number(product.price) || 0;
            const isSoldOut = Boolean(product.stock_tracking_enabled) && Number(product.stock_quantity ?? 0) <= 0;

            // Não retornamos stock_quantity/stock_tracking_enabled no payload público.
            return {
              id: product.id,
              name: product.name,
              description: product.description || undefined,
              price,
              image_url: product.image_url || undefined,
              available: product.available,
              category_id: product.category_id || undefined,
              order_position: product.order_position,
              is_sold_out: isSoldOut,
              promotion: pickApplicablePromotion(
                { id: product.id, price, category_id: product.category_id },
                promotions,
              ),
            };
          }),
        }))
        .filter(cat => cat.products && cat.products.length > 0);

      const productById = new Map<string, PublicMenuProduct>();
      for (const category of transformedCategories) {
        for (const product of category.products) {
          productById.set(product.id, product);
        }
      }

      const upsell = await this.getPublicMenuUpsell(restaurant.id, productById);

      return {
        restaurant: transformedRestaurant,
        categories: transformedCategories,
        config,
        deliveryConfig,
        paymentSettings,
        promotions,
        orderPromotions: promotions.filter(p => p.applicable_to === 'order'),
        upsell,
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
      return toDeliveryConfig(data.setting_value);
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
          setting_value: toJson(config as unknown as Record<string, unknown>),
        },
        { onConflict: 'restaurant_id,setting_key' }
      );
    if (error) throw error;
    return config;
  },

  async getPublicPromotions(restaurantId: string): Promise<PublicMenuPromotion[]> {
    try {
      const { data, error } = await supabase.rpc('get_public_restaurant_promotions', {
        p_restaurant_id: restaurantId,
      });
      if (error) throw error;
      if (!Array.isArray(data)) return [];
      return data.map(parsePromotionRow).filter((p): p is PublicMenuPromotion => p !== null);
    } catch (error) {
      console.warn('Falha ao buscar promoções públicas', error);
      return [];
    }
  },

  async getPublicMenuUpsell(
    restaurantId: string,
    productById: Map<string, PublicMenuProduct>,
  ): Promise<PublicMenuUpsell> {
    try {
      const client = supabase as unknown as RpcClient;
      const { data, error } = await client.rpc('get_public_menu_upsell', {
        p_restaurant_id: restaurantId,
      });
      if (error) throw error;
      return buildPublicUpsell(data, productById);
    } catch (error) {
      console.warn('Falha ao buscar inteligência pública do cardápio', error);
      return buildPublicUpsell(null, productById);
    }
  },

  async getPublicPaymentSettings(restaurantId: string) {
    try {
      const { data, error } = await supabase.rpc('get_public_restaurant_payment_settings', {
        p_restaurant_id: restaurantId,
      });
      if (error) throw error;
      return (data || restaurantPaymentService.toPublic(null)) as PublicPaymentSettings;
    } catch (error) {
      console.warn('Falha ao buscar configurações públicas de pagamento', error);
      return restaurantPaymentService.toPublic(null);
    }
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
    customSettings: Record<string, unknown> = {}
  ): Promise<RestaurantMenuConfig> {
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
        // Atualizar configuração existente
        const { data, error } = await supabase
          .from('restaurant_menu_config')
          .update({
            theme_id: themeId,
            custom_colors: customColors,
            custom_settings: toJson(customSettings),
            updated_at: new Date().toISOString()
          })
          .eq('id', existingConfig.id)
          .select()
          .single();

        if (error) {
          console.error('Error updating restaurant theme:', error);
          throw new Error(`Erro ao atualizar tema: ${error.message}`);
        }

        return {
          ...data,
          custom_colors: toStringRecord(data.custom_colors),
          custom_settings: toRecord(data.custom_settings)
        };
      } else {
        // Criar nova configuração
        const { data, error } = await supabase
          .from('restaurant_menu_config')
          .insert({
            restaurant_id: restaurantId,
            theme_id: themeId,
            custom_colors: customColors,
            custom_settings: toJson(customSettings),
            is_active: true
          })
          .select()
          .single();

        if (error) {
          console.error('Error creating restaurant theme:', error);
          throw new Error(`Erro ao criar tema: ${error.message}`);
        }
        
        return {
          ...data,
          custom_colors: toStringRecord(data.custom_colors),
          custom_settings: toRecord(data.custom_settings)
        };
      }
    } catch (error) {
      console.error('Error in updateRestaurantTheme:', error);
      throw error;
    }
  }
};

const sortMenuItems = <T extends { name?: string | null; order_position?: number | null }>(a: T, b: T) => {
  const aPosition = a.order_position ?? Number.MAX_SAFE_INTEGER;
  const bPosition = b.order_position ?? Number.MAX_SAFE_INTEGER;

  if (aPosition !== bPosition) {
    return aPosition - bPosition;
  }

  return (a.name || '').localeCompare(b.name || '', 'pt-BR');
};
