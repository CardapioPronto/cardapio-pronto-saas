import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Coupon,
  CouponFormData,
  CouponStatistics,
  calculateCouponDiscount,
  isValidCoupon,
  generateCouponCode,
} from '@/types/coupons';

export function useCoupons(restaurantId: string) {
  const queryClient = useQueryClient();

  // Fetch all coupons for restaurant
  const {
    data: coupons = [],
    isLoading: loadingCoupons,
    error: couponsError,
  } = useQuery({
    queryKey: ['coupons', restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];

      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as Coupon[];
    },
    enabled: !!restaurantId,
  });

  // Fetch active coupons only
  const {
    data: activeCoupons = [],
    isLoading: loadingActiveCoupons,
  } = useQuery({
    queryKey: ['coupons-active', restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];

      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .eq('is_active', true)
        .gte('valid_until', new Date().toISOString())
        .order('valid_until', { ascending: true });

      if (error) throw error;
      return (data || []) as unknown as Coupon[];
    },
    enabled: !!restaurantId,
  });

  // Fetch coupon statistics
  const {
    data: statistics,
    isLoading: loadingStatistics,
  } = useQuery({
    queryKey: ['coupons-statistics', restaurantId],
    queryFn: async () => {
      if (!restaurantId) return null;

      const { data: couponsData, error: couponsError } = await supabase
        .from('coupons')
        .select('id, code, is_active, valid_until, usage_count, discount_value, discount_type')
        .eq('restaurant_id', restaurantId);

      if (couponsError) throw couponsError;
      const typedCoupons = (couponsData || []) as unknown as Coupon[];

      const couponIds = typedCoupons.map((c) => c.id).filter(Boolean);

      let typedUsage: { coupon_id: string; id: string; discount_amount: number | null }[] = [];
      if (couponIds.length > 0) {
        const { data: usageData, error: usageError } = await supabase
          .from('coupon_usage')
          .select('coupon_id, id, discount_amount')
          .in('coupon_id', couponIds);

        if (usageError) throw usageError;
        typedUsage = (usageData || []) as unknown as { coupon_id: string; id: string; discount_amount: number | null }[];
      }

      const totalDiscountedAmount = typedUsage.reduce(
        (total, usage) => total + Number(usage.discount_amount || 0),
        0,
      );

      const stats: CouponStatistics = {
        totalCoupons: typedCoupons.length,
        activeCoupons: typedCoupons.filter((c) => c.is_active).length,
        totalUsed: typedUsage.length,
        totalDiscountedAmount,
        averageDiscountPerCoupon: 0,
      };

      if (stats.totalUsed > 0) {
        stats.averageDiscountPerCoupon = stats.totalDiscountedAmount / stats.totalUsed;
      }

      // Find most used coupon
      const usageByCoupon = typedUsage.reduce(
        (acc, u) => {
          acc[u.coupon_id] = acc[u.coupon_id] || { count: 0, discountAmount: 0 };
          acc[u.coupon_id].count += 1;
          acc[u.coupon_id].discountAmount += Number(u.discount_amount || 0);
          return acc;
        },
        {} as Record<string, { count: number; discountAmount: number }>
      );

      const mostUsedCouponId = Object.entries(usageByCoupon).reduce<
        [string, { count: number; discountAmount: number }] | null
      >(
        (max, [id, usage]) => (usage.count > (max?.[1].count || 0) ? [id, usage] : max),
        null
      );

      if (mostUsedCouponId) {
        const mostUsedCoupon = typedCoupons.find((c) => c.id === mostUsedCouponId[0]);
        if (mostUsedCoupon) {
          stats.mostUsedCoupon = {
            code: mostUsedCoupon.code || mostUsedCoupon.id,
            usageCount: mostUsedCouponId[1].count,
            discountAmount: mostUsedCouponId[1].discountAmount,
          };
        }
      }

      return stats;
    },
    enabled: !!restaurantId,
  });

  // Create coupon
  const createCoupon = useMutation({
    mutationFn: async (formData: CouponFormData) => {
      const { data, error } = await supabase
        .from('coupons')
        .insert({
          restaurant_id: restaurantId,
          code: formData.code || generateCouponCode(),
          title: formData.title,
          description: formData.description,
          discount_type: formData.discountType,
          discount_value: formData.discountValue,
          max_uses: formData.maxUses,
          valid_from: formData.validFrom.toISOString(),
          valid_until: formData.validUntil.toISOString(),
          minimum_order_value: formData.minimumOrderValue,
          applicable_to: formData.applicableTo,
          applicable_products: formData.applicableProducts,
          applicable_categories: formData.applicableCategories,
          is_active: formData.isActive,
        })
        .select();

      if (error) throw error;
      return data?.[0];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons', restaurantId] });
      queryClient.invalidateQueries({ queryKey: ['coupons-active', restaurantId] });
      queryClient.invalidateQueries({ queryKey: ['coupons-statistics', restaurantId] });
    },
  });

  // Update coupon
  const updateCoupon = useMutation({
    mutationFn: async (data: { id: string; formData: CouponFormData }) => {
      const { error } = await supabase
        .from('coupons')
        .update({
          title: data.formData.title,
          description: data.formData.description,
          discount_type: data.formData.discountType,
          discount_value: data.formData.discountValue,
          max_uses: data.formData.maxUses,
          valid_from: data.formData.validFrom.toISOString(),
          valid_until: data.formData.validUntil.toISOString(),
          minimum_order_value: data.formData.minimumOrderValue,
          applicable_to: data.formData.applicableTo,
          applicable_products: data.formData.applicableProducts,
          applicable_categories: data.formData.applicableCategories,
          is_active: data.formData.isActive,
        })
        .eq('id', data.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons', restaurantId] });
      queryClient.invalidateQueries({ queryKey: ['coupons-active', restaurantId] });
      queryClient.invalidateQueries({ queryKey: ['coupons-statistics', restaurantId] });
    },
  });

  // Delete coupon
  const deleteCoupon = useMutation({
    mutationFn: async (couponId: string) => {
      const { error } = await supabase.from('coupons').delete().eq('id', couponId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons', restaurantId] });
      queryClient.invalidateQueries({ queryKey: ['coupons-active', restaurantId] });
      queryClient.invalidateQueries({ queryKey: ['coupons-statistics', restaurantId] });
    },
  });

  // Toggle coupon active status
  const toggleCouponStatus = useMutation({
    mutationFn: async (data: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('coupons')
        .update({ is_active: data.isActive })
        .eq('id', data.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons', restaurantId] });
      queryClient.invalidateQueries({ queryKey: ['coupons-active', restaurantId] });
    },
  });

  return {
    coupons,
    loadingCoupons,
    couponsError,
    activeCoupons,
    loadingActiveCoupons,
    statistics,
    loadingStatistics,
    createCoupon,
    updateCoupon,
    deleteCoupon,
    toggleCouponStatus,
  };
}

// Helper function to validate coupon on order
export async function validateCouponForOrder(
  couponCode: string,
  restaurantId: string,
  orderValue: number
): Promise<{ valid: boolean; discount?: number; message: string }> {
  try {
    const { data: coupon, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('code', couponCode.trim().toUpperCase())
      .single();

    if (error || !coupon) {
      return { valid: false, message: 'Cupom não encontrado' };
    }

    const typedCoupon = coupon as unknown as Coupon;
    if (!isValidCoupon(typedCoupon, orderValue)) {
      return { valid: false, message: 'Cupom expirado ou inválido' };
    }

    const discount = calculateCouponDiscount(
      orderValue,
      typedCoupon.discount_type,
      typedCoupon.discount_value
    );

    return { valid: true, discount, message: 'Cupom aplicado com sucesso' };
  } catch (error) {
    return { valid: false, message: 'Erro ao validar cupom' };
  }
}
