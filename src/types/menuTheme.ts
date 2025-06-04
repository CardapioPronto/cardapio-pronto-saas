
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
  custom_settings: Record<string, any>;
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
    slug: string;
  };
  categories: Array<{
    id: string;
    name: string;
    products: Array<{
      id: string;
      name: string;
      description?: string;
      price: number;
      image_url?: string;
      available: boolean;
    }>;
  }>;
  theme: ThemeConfig;
}
