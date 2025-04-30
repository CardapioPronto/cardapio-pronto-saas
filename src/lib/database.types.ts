
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      restaurants: {
        Row: {
          id: string;
          name: string;
          owner_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          owner_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          owner_id?: string;
          updated_at?: string;
        };
      };
      products: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          price: number;
          category: string;
          image_url: string | null;
          available: boolean;
          restaurant_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          price: number;
          category: string;
          image_url?: string | null;
          available?: boolean;
          restaurant_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          price?: number;
          category?: string;
          image_url?: string | null;
          available?: boolean;
          restaurant_id?: string;
          updated_at?: string;
        };
      };
      orders: {
        Row: {
          id: string;
          order_number: string;
          customer_name: string;
          customer_phone: string | null;
          order_type: string;
          table_number: string | null;
          status: string;
          total: number;
          payment_method: string | null;
          restaurant_id: string;
          created_at: string;
          updated_at: string;
          source: string | null;
          ifood_id: string | null;
        };
        Insert: {
          id?: string;
          order_number?: string;
          customer_name: string;
          customer_phone?: string | null;
          order_type: string;
          table_number?: string | null;
          status: string;
          total: number;
          payment_method?: string | null;
          restaurant_id: string;
          created_at?: string;
          updated_at?: string;
          source?: string | null;
          ifood_id?: string | null;
        };
        Update: {
          id?: string;
          order_number?: string;
          customer_name?: string;
          customer_phone?: string | null;
          order_type?: string;
          table_number?: string | null;
          status?: string;
          total?: number;
          payment_method?: string | null;
          restaurant_id?: string;
          updated_at?: string;
          source?: string | null;
          ifood_id?: string | null;
        };
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string;
          product_name: string;
          quantity: number;
          price: number;
          observations: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          product_id: string;
          product_name: string;
          quantity: number;
          price: number;
          observations?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          product_id?: string;
          product_name?: string;
          quantity?: number;
          price?: number;
          observations?: string | null;
        };
      };
      menus: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          active: boolean;
          restaurant_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          active?: boolean;
          restaurant_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          active?: boolean;
          restaurant_id?: string;
          updated_at?: string;
        };
      };
      menu_categories: {
        Row: {
          id: string;
          menu_id: string;
          name: string;
          description: string | null;
          order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          menu_id: string;
          name: string;
          description?: string | null;
          order: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          menu_id?: string;
          name?: string;
          description?: string | null;
          order?: number;
          updated_at?: string;
        };
      };
      menu_items: {
        Row: {
          id: string;
          menu_id: string;
          category_id: string;
          product_id: string;
          order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          menu_id: string;
          category_id: string;
          product_id: string;
          order: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          menu_id?: string;
          category_id?: string;
          product_id?: string;
          order?: number;
          updated_at?: string;
        };
      };
      subscriptions: {
        Row: {
          id: string;
          restaurant_id: string;
          plan_id: string;
          status: string;
          start_date: string;
          end_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          plan_id: string;
          status: string;
          start_date: string;
          end_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          restaurant_id?: string;
          plan_id?: string;
          status?: string;
          start_date?: string;
          end_date?: string | null;
          updated_at?: string;
        };
      };
      restaurant_settings: {
        Row: {
          restaurant_id: string;
          setting_key: string;
          setting_value: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          restaurant_id: string;
          setting_key: string;
          setting_value: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          restaurant_id?: string;
          setting_key?: string;
          setting_value?: Json;
          updated_at?: string;
        };
      };
      ifood_integration: {
        Row: {
          restaurant_id: string;
          client_id: string;
          client_secret: string;
          merchant_id: string;
          restaurant_ifood_id: string | null;
          is_enabled: boolean;
          webhook_url: string | null;
          polling_enabled: boolean;
          polling_interval: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          restaurant_id: string;
          client_id: string;
          client_secret: string;
          merchant_id: string;
          restaurant_ifood_id?: string | null;
          is_enabled?: boolean;
          webhook_url?: string | null;
          polling_enabled?: boolean;
          polling_interval?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          restaurant_id?: string;
          client_id?: string;
          client_secret?: string;
          merchant_id?: string;
          restaurant_ifood_id?: string | null;
          is_enabled?: boolean;
          webhook_url?: string | null;
          polling_enabled?: boolean;
          polling_interval?: number;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
