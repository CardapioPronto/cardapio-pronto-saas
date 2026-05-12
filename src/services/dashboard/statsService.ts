import { createLogger } from '@/lib/log';
import { DashboardStats } from './types';
import { emptyDashboardStats, fetchDashboardMetrics } from './metricsService';

const log = createLogger('dashboard.stats');

export const getDashboardStats = async (
  restaurantId: string,
  includeFinancials = false
): Promise<DashboardStats> => {
  try {
    if (!restaurantId) {
      throw new Error('Restaurant ID not found');
    }

    const metrics = await fetchDashboardMetrics(restaurantId, includeFinancials);
    return metrics.stats;
  } catch (error) {
    log.error('Erro ao buscar estatísticas do dashboard:', error);
    return emptyDashboardStats();
  }
};
