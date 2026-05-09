
export interface MenuTheme {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  preview_image_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RestaurantMenuConfig {
  id: string;
  restaurant_id: string;
  theme_id: string;
  custom_colors: Record<string, string>;
  custom_settings: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ThemeConfig {
  colors: {
    primary: string;
    secondary: string;
    background: string;
    text: string;
    accent: string;
  };
  fonts: {
    heading: string;
    body: string;
  };
  spacing: {
    container: string;
    section: string;
    card: string;
  };
  borderRadius: string;
  shadows: {
    card: string;
    header: string;
  };
}

export interface MenuData {
  restaurant: {
    id: string;
    name: string;
    logo_url?: string;
    banner_url?: string;
    slug: string;
    address?: string;
    phone?: string;
    phone_whatsapp?: string;
    business_hours?: string;
    category?: string;
  };
  categories: Array<{
    id: string;
    name: string;
    order_position?: number | null;
    products: Array<{
      id: string;
      name: string;
      description?: string;
      price: number;
      image_url?: string;
      available: boolean;
      category_id?: string;
      order_position?: number | null;
    }>;
  }>;
  theme: ThemeConfig;
  deliveryConfig?: DeliveryConfig;
  paymentSettings?: PublicPaymentSettings;
  context?: {
    fulfillmentType?: 'delivery' | 'pickup' | 'table' | 'counter';
    tableId?: string;
  };
}

export interface DeliveryConfig {
  delivery_enabled: boolean;
  delivery_fee: number;
  min_order_value: number;
  estimated_delivery_minutes: number;
  delivery_radius_km: number;
  payment_methods: string[]; // 'pix' | 'dinheiro' | 'cartao_credito' | 'cartao_debito'
  pickup_enabled: boolean;
}

export const DEFAULT_DELIVERY_CONFIG: DeliveryConfig = {
  delivery_enabled: true,
  delivery_fee: 0,
  min_order_value: 0,
  estimated_delivery_minutes: 45,
  delivery_radius_km: 5,
  payment_methods: ['pix', 'dinheiro', 'cartao_credito', 'cartao_debito'],
  pickup_enabled: true,
};

export interface PublicPaymentSettings {
  enabled: boolean;
  methods: Array<'pix' | 'credit_card'>;
  allowedFulfillment: Array<'delivery' | 'pickup' | 'table' | 'counter'>;
  onboardingStatus: 'not_started' | 'pending' | 'approved' | 'rejected';
}
