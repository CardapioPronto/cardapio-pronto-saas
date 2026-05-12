import { supabase } from '@/lib/supabase';
import { createLogger } from '@/lib/log';
import type { DashboardStats, PopularProduct } from './types';

const log = createLogger('dashboard.metrics');

const EMPTY_STATS: DashboardStats = {
  totalPedidos: 0,
  faturamento: 0,
  itensVendidos: 0,
  pedidosAbertos: 0,
  ticketMedio: 0,
  crescimentoPedidos: 0,
  crescimentoFaturamento: 0,
};

export interface DashboardMetrics {
  stats: DashboardStats;
  popularProducts: PopularProduct[];
  windowDays: number;
}

// Cache curto in-memory para evitar duas chamadas idênticas próximas
// (statsService e productsService disparam em paralelo no mount do
// dashboard). TTL pequeno o suficiente para não ofuscar mudanças.
const CACHE_TTL_MS = 5_000;

type CacheEntry = {
  key: string;
  expiresAt: number;
  promise: Promise<DashboardMetrics>;
};

let cacheEntry: CacheEntry | null = null;

const cacheKey = (restaurantId: string, includeFinancials: boolean) =>
  `${restaurantId}::${includeFinancials ? '1' : '0'}`;

type RawMetrics = {
  stats?: Partial<DashboardStats> | null;
  popular_products?: unknown;
  window_days?: number | null;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const toPopularProducts = (raw: unknown): PopularProduct[] => {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(isRecord)
    .map((item) => ({
      id: String(item.id ?? item.product_id ?? 'produto-sem-id'),
      name: String(item.name ?? 'Produto'),
      sales: Number(item.sales ?? 0),
      revenue: Number(item.revenue ?? 0),
      category: String(item.category ?? 'Produto'),
    }));
};

const toStats = (raw: Partial<DashboardStats> | null | undefined): DashboardStats => ({
  totalPedidos: Number(raw?.totalPedidos ?? 0),
  faturamento: Number(raw?.faturamento ?? 0),
  itensVendidos: Number(raw?.itensVendidos ?? 0),
  pedidosAbertos: Number(raw?.pedidosAbertos ?? 0),
  ticketMedio: Number(raw?.ticketMedio ?? 0),
  crescimentoPedidos: Number(raw?.crescimentoPedidos ?? 0),
  crescimentoFaturamento: Number(raw?.crescimentoFaturamento ?? 0),
});

export const fetchDashboardMetrics = async (
  restaurantId: string,
  includeFinancials: boolean
): Promise<DashboardMetrics> => {
  const key = cacheKey(restaurantId, includeFinancials);
  const now = Date.now();

  if (cacheEntry && cacheEntry.key === key && cacheEntry.expiresAt > now) {
    return cacheEntry.promise;
  }

  const promise = (async (): Promise<DashboardMetrics> => {
    const { data, error } = await supabase.rpc(
      'get_restaurant_dashboard_metrics',
      {
        p_restaurant_id: restaurantId,
        p_window_days: 30,
        p_include_financials: includeFinancials,
      },
    );

    if (error) {
      log.error('RPC get_restaurant_dashboard_metrics falhou:', error.message);
      throw error;
    }

    const raw = (data ?? {}) as RawMetrics;
    return {
      stats: toStats(raw.stats),
      popularProducts: toPopularProducts(raw.popular_products),
      windowDays: Number(raw.window_days ?? 30),
    };
  })();

  cacheEntry = {
    key,
    expiresAt: now + CACHE_TTL_MS,
    promise: promise.catch((error) => {
      // Invalida cache em caso de erro para permitir retry na próxima
      if (cacheEntry?.key === key) cacheEntry = null;
      throw error;
    }),
  };

  return cacheEntry.promise;
};

export const __resetDashboardMetricsCacheForTests = () => {
  cacheEntry = null;
};

export const emptyDashboardStats = (): DashboardStats => ({ ...EMPTY_STATS });
