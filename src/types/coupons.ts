import type { Database } from '@/integrations/supabase/types';

export type Coupon = Database['public']['Tables']['coupons']['Row'];
export type CouponInsert = Database['public']['Tables']['coupons']['Insert'];
export type CouponUpdate = Database['public']['Tables']['coupons']['Update'];

export type CouponUsage = Database['public']['Tables']['coupon_usage']['Row'];
export type CouponUsageInsert = Database['public']['Tables']['coupon_usage']['Insert'];

export type DiscountType = 'percentage' | 'fixed';
export type ApplicableTo = 'all' | 'products' | 'categories';

export interface CouponFormData {
  code: string;
  title: string;
  description?: string;
  discountType: DiscountType;
  discountValue: number;
  maxUses?: number;
  validFrom: Date;
  validUntil: Date;
  minimumOrderValue?: number;
  applicableTo: ApplicableTo;
  applicableProducts?: string[];
  applicableCategories?: string[];
  isActive: boolean;
}

export interface CouponStatistics {
  totalCoupons: number;
  activeCoupons: number;
  totalUsed: number;
  totalDiscountedAmount: number;
  averageDiscountPerCoupon: number;
  mostUsedCoupon?: {
    code: string;
    usageCount: number;
    discountAmount: number;
  };
}

export function calculateCouponDiscount(
  orderValue: number,
  discountType: DiscountType,
  discountValue: number,
  maxDiscount?: number
): number {
  if (discountType === 'percentage') {
    const discount = (orderValue * discountValue) / 100;
    return maxDiscount ? Math.min(discount, maxDiscount) : discount;
  } else {
    return Math.min(discountValue, orderValue);
  }
}

export function isValidCoupon(coupon: Coupon, orderValue: number): boolean {
  const now = new Date();
  
  // Check if coupon is active
  if (!coupon.is_active) {
    return false;
  }
  
  // Check validity period
  if (new Date(coupon.valid_from) > now || new Date(coupon.valid_until) < now) {
    return false;
  }
  
  // Check usage limit
  if (coupon.max_uses && (coupon.usage_count ?? 0) >= coupon.max_uses) {
    return false;
  }
  
  // Check minimum order value
  if (coupon.minimum_order_value && orderValue < coupon.minimum_order_value) {
    return false;
  }
  
  return true;
}

export function generateCouponCode(prefix: string = 'PROMO'): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}${timestamp}${random}`.substring(0, 50);
}
