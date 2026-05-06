import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';
import { useCurrentUser } from './useCurrentUser';

export interface OrderableItem {
  id: string;
  name: string;
  order_position: number;
}

/**
 * Hook to manage product/category ordering
 */
export const useOrderPosition = (type: 'products' | 'categories', restaurantId?: string) => {
  const queryClient = useQueryClient();

  const updateOrderPosition = useMutation({
    mutationFn: async (items: Array<{ id: string; order_position: number }>) => {
      const table = type === 'products' ? 'products' : 'categories';

      // Use Promise.all to batch updates
      const updates = items.map((item) =>
        supabase
          .from(table)
          .update({ order_position: item.order_position } as any)
          .eq('id', item.id)
      );

      const results = await Promise.all(updates);

      // Check for errors
      const errors = results.filter((result) => result.error);
      if (errors.length > 0) {
        throw new Error(`Erro ao atualizar posições: ${errors[0].error?.message}`);
      }

      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [type, restaurantId] });
      toast.success('Ordem atualizada com sucesso!');
    },
    onError: (error) => {
      console.error('Error updating order:', error);
      toast.error('Erro ao atualizar ordem');
    },
  });

  const reorderItems = (items: OrderableItem[], fromIndex: number, toIndex: number): OrderableItem[] => {
    const result = Array.from(items);
    const [removed] = result.splice(fromIndex, 1);
    result.splice(toIndex, 0, removed);

    // Recalculate positions
    return result.map((item, index) => ({
      ...item,
      order_position: index,
    }));
  };

  return {
    updateOrderPosition,
    reorderItems,
  };
};

/**
 * Batch reorder items by their new positions
 */
export const reorderItemsBatch = async (
  table: 'products' | 'categories',
  items: Array<{ id: string; order_position: number }>,
  restaurantId?: string
) => {
  const updates = items.map((item) => {
    let query = supabase
      .from(table)
      .update({ order_position: item.order_position } as any)
      .eq('id', item.id);

    if (restaurantId) {
      query = query.eq('restaurant_id', restaurantId);
    }

    return query;
  });

  const results = await Promise.all(updates);
  const firstError = results.find((r) => r.error)?.error;

  if (firstError) {
    throw new Error(`Erro ao atualizar posições: ${firstError.message}`);
  }

  return true;
};

/**
 * Get items sorted by order_position
 */
export const getSortedItems = (items: OrderableItem[]): OrderableItem[] => {
  return [...items].sort((a, b) => (a.order_position || 0) - (b.order_position || 0));
};
