import { supabase } from '@/lib/supabase';
import { DashboardOverview } from './types';

const db = supabase;
const OPEN_ORDER_STATUSES = ['pendente', 'preparo', 'em-andamento', 'pending', 'preparing'];
const PREPARING_STATUSES = ['preparo', 'em-andamento', 'preparing'];
const CANCELED_STATUSES = ['cancelado', 'cancelled', 'canceled'];

type ProductAvailabilityRow = { available: boolean | null };
type OpenOrderRow = { status: string | null; created_at: string | null };
type OrderTodayRow = { status: string | null };
type TableStatusRow = { status: string | null };
type ThreadSummaryRow = { status: string | null; unread_count: number | null };
type WhatsAppInstanceSummaryRow = { status: string | null; webhook_url: string | null };
type RestaurantSummaryRow = {
  name: string | null;
  active: boolean | null;
  slug: string | null;
  address: string | null;
  phone: string | null;
  phone_whatsapp: string | null;
};

const emptyOverview: DashboardOverview = {
  restaurantName: 'Restaurante',
  isRestaurantActive: null,
  restaurantProfileCompleted: false,
  publicMenuSlug: null,
  totalProducts: 0,
  availableProducts: 0,
  unavailableProducts: 0,
  totalOrders: 0,
  totalCategories: 0,
  ordersToday: 0,
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
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const [
      restaurantResult,
      productsResult,
      categoriesResult,
      ordersResult,
      totalOrdersResult,
      ordersTodayResult,
      tablesResult,
      threadsResult,
      instancesResult,
      menuConfigResult,
    ] = await Promise.all([
      db
        .from('restaurants')
        .select('name, active, slug, address, phone, phone_whatsapp')
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
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('restaurant_id', restaurantId),
      db
        .from('orders')
        .select('id, status')
        .eq('restaurant_id', restaurantId)
        .gte('created_at', startOfToday.toISOString()),
      db
        .from('mesas')
        .select('id, status')
        .eq('restaurant_id', restaurantId),
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
      totalOrdersResult.error,
      ordersTodayResult.error,
      tablesResult.error,
      threadsResult.error,
      instancesResult.error,
      menuConfigResult.error,
    ].filter(Boolean).forEach((error) => {
      console.warn('Métrica parcial do dashboard indisponível:', error);
    });

    const products = (productsResult.error ? [] : productsResult.data || []) as ProductAvailabilityRow[];
    const orders = (ordersResult.error ? [] : ordersResult.data || []) as OpenOrderRow[];
    const ordersTodayRows = (ordersTodayResult.error ? [] : ordersTodayResult.data || []) as OrderTodayRow[];
    const tables = (tablesResult.error ? [] : tablesResult.data || []) as TableStatusRow[];
    const threads = (threadsResult.error ? [] : threadsResult.data || []) as ThreadSummaryRow[];
    const instances = (instancesResult.error ? [] : instancesResult.data || []) as WhatsAppInstanceSummaryRow[];
    const restaurant = (restaurantResult.error ? null : restaurantResult.data) as RestaurantSummaryRow | null;

    const availableProducts = products.filter((product) => product.available !== false).length;
    const ordersToday = ordersTodayRows.filter((order) => !CANCELED_STATUSES.includes(order.status || '')).length;
    const openOrdersToday = orders.filter((order) => new Date(order.created_at || 0) >= startOfToday).length;
    const overdueOpenOrders = Math.max(0, orders.length - openOrdersToday);
    const whatsappConnectedInstances = instances.filter((instance) => instance.status === 'CONNECTED').length;
    const restaurantName = restaurant?.name || 'Restaurante';
    const restaurantProfileCompleted = Boolean(
      restaurantName.trim() &&
      restaurant?.active === true &&
      restaurant?.address?.trim() &&
      (restaurant?.phone?.trim() || restaurant?.phone_whatsapp?.trim())
    );

    return {
      restaurantName,
      isRestaurantActive: restaurantResult.error || !restaurantResult.data ? null : restaurant?.active === true,
      restaurantProfileCompleted,
      publicMenuSlug: restaurantResult.error ? null : restaurant?.slug || restaurantId,
      totalProducts: products.length,
      availableProducts,
      unavailableProducts: Math.max(0, products.length - availableProducts),
      totalOrders: totalOrdersResult.error ? 0 : totalOrdersResult.count || 0,
      totalCategories: categoriesResult.error ? 0 : categoriesResult.count || 0,
      ordersToday,
      openOrders: orders.length,
      openOrdersToday,
      overdueOpenOrders,
      pendingOrders: orders.filter((order) => order.status === 'pendente' || order.status === 'pending').length,
      preparingOrders: orders.filter((order) => PREPARING_STATUSES.includes(order.status || '')).length,
      totalTables: tables.length,
      occupiedTables: tables.filter((table) => table.status === 'ocupada').length,
      reservedTables: tables.filter((table) => table.status === 'reservada').length,
      unavailableTables: tables.filter((table) => table.status === 'indisponivel').length,
      activeCoupons: 0,
      expiringCoupons: 0,
      activePromotions: 0,
      whatsappInstances: instances.length,
      whatsappConnectedInstances,
      whatsappNeedsAttention: instances.filter((instance) => instance.status !== 'CONNECTED' || !instance.webhook_url).length,
      waitingHuman: threads.filter((thread) => thread.status === 'waiting_human').length,
      unreadMessages: threads.reduce((sum, thread) => sum + Number(thread.unread_count || 0), 0),
      menuThemeConfigured: menuConfigResult.error ? false : (menuConfigResult.count || 0) > 0,
    };
  } catch (error) {
    console.error('Erro ao buscar resumo operacional do dashboard:', error);
    return emptyOverview;
  }
};
