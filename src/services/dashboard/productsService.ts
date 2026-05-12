import { createLogger } from '@/lib/log';
import { PopularProduct } from './types';
import { fetchDashboardMetrics } from './metricsService';

const log = createLogger('dashboard.popularProducts');

export const getPopularProducts = async (
  restaurantId: string,
  includeFinancials = false
): Promise<PopularProduct[]> => {
  try {
    if (!restaurantId) {
      throw new Error('Restaurant ID not found');
    }

    const metrics = await fetchDashboardMetrics(restaurantId, includeFinancials);
    return metrics.popularProducts;
  } catch (error) {
    log.error('Erro ao buscar produtos populares:', error);
    return [];
  }
};
