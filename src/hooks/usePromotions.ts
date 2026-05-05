import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Promotion, CreatePromotionInput } from '@/types/features';
import { useCurrentUser } from './useCurrentUser';
import { toast } from '@/components/ui/sonner';

export const usePromotions = () => {
  const { user } = useCurrentUser();
  const restaurantId = user?.restaurant_id;
  const queryClient = useQueryClient();

  // Fetch all promotions for restaurant
  const { data: promotions = [], isLoading, error } = useQuery({
    queryKey: ['promotions', restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];

      const { data, error } = await supabase
        .from('promotions' as any)
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching promotions:', error);
        throw error;
      }
      return data as Promotion[];
    },
    enabled: !!restaurantId,
  });

  // Fetch active promotions (for public menu)
  const { data: activePromotions = [] } = useQuery({
    queryKey: ['promotions-active', restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];

      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('promotions' as any)
        .select('*')
        .eq('restaurant_id', restaurantId)
        .eq('is_active', true)
        .lte('valid_from', now)
        .or(`valid_until.is.null,valid_until.gte.${now}`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching active promotions:', error);
        throw error;
      }
      return data as Promotion[];
    },
    enabled: !!restaurantId,
    staleTime: 300000, // 5 minutes
  });

  // Create promotion mutation
  const createPromotion = useMutation({
    mutationFn: async (input: CreatePromotionInput) => {
      if (!restaurantId) throw new Error('Restaurant not found');

      const { data, error } = await supabase
        .from('promotions' as any)
        .insert({
          restaurant_id: restaurantId,
          ...input,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Promotion;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promotions', restaurantId] });
      toast.success('Promoção criada com sucesso!');
    },
    onError: (error) => {
      console.error('Error creating promotion:', error);
      toast.error('Erro ao criar promoção');
    },
  });

  // Update promotion mutation
  const updatePromotion = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Promotion> & { id: string }) => {
      const { data, error } = await supabase
        .from('promotions' as any)
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Promotion;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promotions', restaurantId] });
      toast.success('Promoção atualizada com sucesso!');
    },
    onError: (error) => {
      console.error('Error updating promotion:', error);
      toast.error('Erro ao atualizar promoção');
    },
  });

  // Delete promotion mutation
  const deletePromotion = useMutation({
    mutationFn: async (promotionId: string) => {
      const { error } = await supabase
        .from('promotions' as any)
        .delete()
        .eq('id', promotionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promotions', restaurantId] });
      toast.success('Promoção deletada com sucesso!');
    },
    onError: (error) => {
      console.error('Error deleting promotion:', error);
      toast.error('Erro ao deletar promoção');
    },
  });

  // Toggle promotion status
  const togglePromotion = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { data, error } = await supabase
        .from('promotions' as any)
        .update({ is_active: !is_active })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Promotion;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promotions', restaurantId] });
    },
  });

  return {
    promotions,
    activePromotions,
    isLoading,
    error,
    createPromotion,
    updatePromotion,
    deletePromotion,
    togglePromotion,
  };
};

/**
 * Calculate promotion discount for a given price
 */
export const calculatePromotionDiscount = (
  price: number,
  promotion: Promotion
): { discountAmount: number; finalPrice: number } => {
  let discountAmount = 0;

  if (promotion.discount_type === 'percentage') {
    discountAmount = (price * promotion.discount_value) / 100;
  } else {
    discountAmount = promotion.discount_value;
  }

  const finalPrice = Math.max(0, price - discountAmount);
  return { discountAmount, finalPrice };
};

/**
 * Get applicable promotions for a product/category
 */
export const getApplicablePromotions = (
  targetId: string | null,
  targetType: 'product' | 'category' | 'order',
  promotions: Promotion[]
): Promotion[] => {
  return promotions.filter((promo) => {
    if (promo.applicable_to === 'order') return true; // Order promos apply to all

    if (targetType === 'product' && promo.applicable_to === 'product') {
      return promo.target_id === targetId;
    }

    if (targetType === 'category' && promo.applicable_to === 'category') {
      return promo.target_id === targetId;
    }

    return false;
  });
};
