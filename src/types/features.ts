// Types for new features: hours validation, promotions, ordering, and slug editing

export interface RestaurantHours {
  opening_time: string | null; // HH:mm format
  closing_time: string | null; // HH:mm format
}

export interface Promotion {
  id: string;
  restaurant_id: string;
  name: string;
  description?: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  applicable_to: 'product' | 'category' | 'order';
  target_id?: string; // product_id or category_id
  min_order_value?: number;
  is_active: boolean;
  valid_from: string; // ISO date
  valid_until?: string; // ISO date
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CreatePromotionInput {
  name: string;
  description?: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  applicable_to: 'product' | 'category' | 'order';
  target_id?: string;
  min_order_value?: number;
  valid_from?: string;
  valid_until?: string;
}

export interface PromotionWithDiscount {
  promotion: Promotion;
  discount_amount: number;
  final_price: number;
}

export interface OrderPosition {
  id: string;
  order_position: number;
}

export interface SlugEditResult {
  success: boolean;
  slug?: string;
  error?: string;
}

export interface IsRestaurantOpenResponse {
  isOpen: boolean;
  currentTime: string;
  openingTime: string | null;
  closingTime: string | null;
  message: string;
}
