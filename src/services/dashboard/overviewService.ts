import { supabase } from '@/lib/supabase';
import { DashboardOverview } from './types';

const db = supabase as any;
const OPEN_ORDER_STATUSES = ['pendente', 'preparo', 'em-andamento', 'pending', 'preparing'];
const PREPARING_STATUSES = ['preparo', 'em-andamento', 'preparing'];

const emptyOverview: DashboardOverview = {
  restaurantName: 'Restaurante',
  isRestaurantActive: null,
  publicMenuSlug: null,
  totalProducts: 0,
  availableProducts: 0,
  unavailableProducts: 0,
  totalCategories: 0,
  openOrders: 0,
  openOrdersToday: 0,
  overdueOpenOrders: 0,
  pendingOrders: 0,
  preparingOrders: 0,
  totalTables: 0,
  occupiedTables: 0,
  reservedTables: 0,
  unavailableTables: 0,
  activeCoupons: 0,
  expiringCoupons: 0,
  activePromotions: 0,
  whatsappInstances: 0,
  whatsappConnectedInstances: 0,
  whatsappNeedsAttention: 0,
  waitingHuman: 0,
  unreadMessages: 0,
  menuThemeConfigured: false,
};

export const getDashboardOverview = async (restaurantId: string): Promise<DashboardOverview> => {
  if (!restaurantId) return emptyOverview;

  try {
    const now = new Date();
    const nowIso = now.toISOString();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const sevenDaysFromNow = new Date(now);
    sevenDaysFromNow.setDate(now.getDate() + 7);

    const [
      restaurantResult,
      productsResult,
      categoriesResult,
      ordersResult,
      tablesResult,
      couponsResult,
      promotionsResult,
      threadsResult,
      instancesResult,
      menuConfigResult,
    ] = await Promise.all([
      db
        .from('restaurants')
        .select('name, active, slug')
        .eq('id', restaurantId)
        .maybeSingle(),
      db
        .from('products')
        .select('id, available')
        .eq('restaurant_id', restaurantId),
      db
        .from('categories')
        .select('id', { count: 'exact', head: true })
        .eq('restaurant_id', restaurantId),
      db
        .from('orders')
        .select('id, status, created_at')
        .eq('restaurant_id', restaurantId)
        .in('status', OPEN_ORDER_STATUSES),
      db
        .from('mesas')
        .select('id, status')
        .eq('restaurant_id', restaurantId),
      db
        .from('coupons')
        .select('id, valid_until')
        .eq('restaurant_id', restaurantId)
        .eq('is_active', true)
        .lte('valid_from', nowIso)
        .gte('valid_until', nowIso),
      db
        .from('promotions')
        .select('id')
        .eq('restaurant_id', restaurantId)
        .eq('is_active', true)
        .lte('valid_from', nowIso)
        .or(`valid_until.is.null,valid_until.gte.${nowIso}`),
      db
        .from('conversation_threads')
        .select('id, status, unread_count')
        .eq('restaurant_id', restaurantId)
        .neq('status', 'closed'),
      db
        .from('whatsapp_instances')
        .select('id, status, webhook_url')
        .eq('restaurant_id', restaurantId)
        .eq('is_active', true),
      db
        .from('restaurant_menu_config')
        .select('id', { count: 'exact', head: true })
        .eq('restaurant_id', restaurantId)
        .eq('is_active', true),
    ]);

    [
      restaurantResult.error,
      productsResult.error,
      categoriesResult.error,
      ordersResult.error,
      tablesResult.error,
      couponsResult.error,
      promotionsResult.error,
      threadsResult.error,
      instancesResult.error,
      menuConfigResult.error,
    ].filter(Boolean).forEach((error) => {
      console.warn('Métrica parcial do dashboard indisponível:', error);
    });

    const products = productsResult.error ? [] : productsResult.data || [];
    const orders = ordersResult.error ? [] : ordersResult.data || [];
    const tables = tablesResult.error ? [] : tablesResult.data || [];
    const coupons = couponsResult.error ? [] : couponsResult.data || [];
    const threads = threadsResult.error ? [] : threadsResult.data || [];
    const instances = instancesResult.error ? [] : instancesResult.data || [];

    const availableProducts = products.filter((product: any) => product.available !== false).length;
    const openOrdersToday = orders.filter((order: any) => new Date(order.created_at) >= startOfToday).length;
    const overdueOpenOrders = Math.max(0, orders.length - openOrdersToday);
    const whatsappConnectedInstances = instances.filter((instance: any) => instance.status === 'CONNECTED').length;

    return {
      restaurantName: restaurantResult.error ? 'Restaurante' : restaurantResult.data?.name || 'Restaurante',
      isRestaurantActive: restaurantResult.error || !restaurantResult.data ? null : restaurantResult.data.active === true,
      publicMenuSlug: restaurantResult.error ? null : restaurantResult.data?.slug || restaurantId,
      totalProducts: products.length,
      availableProducts,
      unavailableProducts: Math.max(0, products.length - availableProducts),
      totalCategories: categoriesResult.error ? 0 : categoriesResult.count || 0,
      openOrders: orders.length,
      openOrdersToday,
      overdueOpenOrders,
      pendingOrders: orders.filter((order: any) => order.status === 'pendente' || order.status === 'pending').length,
      preparingOrders: orders.filter((order: any) => PREPARING_STATUSES.includes(order.status)).length,
      totalTables: tables.length,
      occupiedTables: tables.filter((table: any) => table.status === 'ocupada').length,
      reservedTables: tables.filter((table: any) => table.status === 'reservada').length,
      unavailableTables: tables.filter((table: any) => table.status === 'indisponivel').length,
      activeCoupons: coupons.length,
      expiringCoupons: coupons.filter((coupon: any) => {
        const validUntil = new Date(coupon.valid_until);
        return validUntil <= sevenDaysFromNow;
      }).length,
      activePromotions: promotionsResult.error ? 0 : promotionsResult.data?.length || 0,
      whatsappInstances: instances.length,
      whatsappConnectedInstances,
      whatsappNeedsAttention: instances.filter((instance: any) => instance.status !== 'CONNECTED' || !instance.webhook_url).length,
      waitingHuman: threads.filter((thread: any) => thread.status === 'waiting_human').length,
      unreadMessages: threads.reduce((sum: number, thread: any) => sum + Number(thread.unread_count || 0), 0),
      menuThemeConfigured: menuConfigResult.error ? false : (menuConfigResult.count || 0) > 0,
    };
  } catch (error) {
    console.error('Erro ao buscar resumo operacional do dashboard:', error);
    return emptyOverview;
  }
};
