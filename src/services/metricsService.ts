import { supabase } from "@/integrations/supabase/client";

export interface MesaMetric {
  id: string;
  label: string;
  status: string;
  orders: number;
  revenue: number;
}

export interface MetricsOverview {
  periodDays: number;
  // Vendas / pedidos
  totalSales: number;
  totalOrders: number;
  averageTicket: number;
  canceledOrders: number;
  openOrders: number;
  ordersByType: { type: string; orders: number; revenue: number }[];
  // Cardápio
  totalProducts: number;
  availableProducts: number;
  totalCategories: number;
  topProducts: { name: string; quantity: number; revenue: number }[];
  // Mesas
  totalTables: number;
  occupiedTables: number;
  tablesWithOrders: number;
  ordersPerTableAverage: number;
  tableOrders: number;
  tableRevenue: number;
  mesas: MesaMetric[];
  // Clientes
  totalCustomers: number;
  importedCustomers: number;
  convertedImportedCustomers: number;
  importedConversionRate: number;
  newCustomersInPeriod: number;
}

const CANCELED = new Set(["cancelled", "canceled", "cancelado", "cancelada"]);
const OPEN = new Set(["pending", "pendente", "preparing", "preparando", "em_preparo", "ready", "pronto"]);

const isImportedSource = (source: string | null, tags: string[] | null) => {
  const normalized = (source ?? "").toLowerCase();
  if (normalized.includes("import") || normalized.includes("csv") || normalized.includes("planilha")) {
    return true;
  }
  return (tags ?? []).some((tag) => tag.toLowerCase().includes("import"));
};

const onlyDigits = (value: string | null | undefined) => (value ?? "").replace(/\D/g, "");

export const fetchMetricsOverview = async (
  restaurantId: string,
  periodDays: number,
): Promise<MetricsOverview> => {
  const since = new Date();
  since.setDate(since.getDate() - periodDays);
  const sinceIso = since.toISOString();

  const [ordersRes, allOrderPhonesRes, mesasRes, productsRes, categoriesRes, customersRes] =
    await Promise.all([
      supabase
        .from("orders")
        .select("id, total, status, table_id, order_type, customer_phone, created_at")
        .eq("restaurant_id", restaurantId)
        .gte("created_at", sinceIso),
      supabase
        .from("orders")
        .select("customer_phone, status")
        .eq("restaurant_id", restaurantId)
        .not("customer_phone", "is", null),
      supabase
        .from("mesas")
        .select("id, number, name, status, is_active")
        .eq("restaurant_id", restaurantId),
      supabase
        .from("products")
        .select("id, available")
        .eq("restaurant_id", restaurantId),
      supabase
        .from("categories")
        .select("id")
        .eq("restaurant_id", restaurantId),
      supabase
        .from("crm_customer_profiles")
        .select("phone_normalized, source, tags, created_at")
        .eq("restaurant_id", restaurantId),
    ]);

  const firstError =
    ordersRes.error ||
    allOrderPhonesRes.error ||
    mesasRes.error ||
    productsRes.error ||
    categoriesRes.error ||
    customersRes.error;
  if (firstError) throw firstError;

  const orders = ordersRes.data ?? [];
  const validOrders = orders.filter((order) => !CANCELED.has(String(order.status ?? "").toLowerCase()));

  const totalSales = validOrders.reduce((sum, order) => sum + Number(order.total ?? 0), 0);
  const totalOrders = validOrders.length;
  const canceledOrders = orders.length - totalOrders;
  const openOrders = validOrders.filter((order) =>
    OPEN.has(String(order.status ?? "").toLowerCase()),
  ).length;

  // Itens dos pedidos do período (top produtos)
  const orderIds = validOrders.map((order) => order.id);
  let topProducts: MetricsOverview["topProducts"] = [];
  if (orderIds.length > 0) {
    const { data: items } = await supabase
      .from("order_items")
      .select("product_name, quantity, price, order_id")
      .in("order_id", orderIds.slice(0, 900));

    const byProduct = new Map<string, { quantity: number; revenue: number }>();
    (items ?? []).forEach((item) => {
      const name = String(item.product_name ?? "Produto");
      const quantity = Number(item.quantity ?? 0);
      const revenue = quantity * Number(item.price ?? 0);
      const current = byProduct.get(name) ?? { quantity: 0, revenue: 0 };
      byProduct.set(name, {
        quantity: current.quantity + quantity,
        revenue: current.revenue + revenue,
      });
    });
    topProducts = Array.from(byProduct.entries())
      .map(([name, value]) => ({ name, ...value }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 8);
  }

  // Pedidos por tipo
  const byType = new Map<string, { orders: number; revenue: number }>();
  validOrders.forEach((order) => {
    const type = String(order.order_type ?? "outros");
    const current = byType.get(type) ?? { orders: 0, revenue: 0 };
    byType.set(type, {
      orders: current.orders + 1,
      revenue: current.revenue + Number(order.total ?? 0),
    });
  });

  // Pedidos por mesa
  const mesasData = (mesasRes.data ?? []).filter((mesa) => mesa.is_active !== false);
  const byTable = new Map<string, { orders: number; revenue: number }>();
  validOrders.forEach((order) => {
    if (!order.table_id) return;
    const current = byTable.get(order.table_id) ?? { orders: 0, revenue: 0 };
    byTable.set(order.table_id, {
      orders: current.orders + 1,
      revenue: current.revenue + Number(order.total ?? 0),
    });
  });

  const mesas: MesaMetric[] = mesasData
    .map((mesa) => {
      const stats = byTable.get(mesa.id) ?? { orders: 0, revenue: 0 };
      return {
        id: mesa.id,
        label: String(mesa.name || `Mesa ${mesa.number ?? ""}`).trim(),
        status: String(mesa.status ?? "available"),
        orders: stats.orders,
        revenue: stats.revenue,
      };
    })
    .sort((a, b) => b.orders - a.orders || a.label.localeCompare(b.label));

  const tableOrders = mesas.reduce((sum, mesa) => sum + mesa.orders, 0);
  const tableRevenue = mesas.reduce((sum, mesa) => sum + mesa.revenue, 0);
  const tablesWithOrders = mesas.filter((mesa) => mesa.orders > 0).length;

  // Clientes
  const customers = customersRes.data ?? [];
  const phonesWithOrders = new Set(
    (allOrderPhonesRes.data ?? [])
      .filter((order) => !CANCELED.has(String(order.status ?? "").toLowerCase()))
      .map((order) => onlyDigits(order.customer_phone))
      .filter(Boolean),
  );

  const imported = customers.filter((customer) =>
    isImportedSource(customer.source, customer.tags as string[] | null),
  );
  const convertedImported = imported.filter((customer) =>
    phonesWithOrders.has(onlyDigits(customer.phone_normalized)),
  ).length;

  const newCustomersInPeriod = customers.filter(
    (customer) => customer.created_at && customer.created_at >= sinceIso,
  ).length;

  const products = productsRes.data ?? [];

  return {
    periodDays,
    totalSales,
    totalOrders,
    averageTicket: totalOrders > 0 ? totalSales / totalOrders : 0,
    canceledOrders,
    openOrders,
    ordersByType: Array.from(byType.entries())
      .map(([type, value]) => ({ type, ...value }))
      .sort((a, b) => b.orders - a.orders),
    totalProducts: products.length,
    availableProducts: products.filter((product) => product.available !== false).length,
    totalCategories: (categoriesRes.data ?? []).length,
    topProducts,
    totalTables: mesas.length,
    occupiedTables: mesas.filter((mesa) => mesa.status === "occupied" || mesa.status === "ocupada").length,
    tablesWithOrders,
    ordersPerTableAverage: mesas.length > 0 ? tableOrders / mesas.length : 0,
    tableOrders,
    tableRevenue,
    mesas,
    totalCustomers: customers.length,
    importedCustomers: imported.length,
    convertedImportedCustomers: convertedImported,
    importedConversionRate: imported.length > 0 ? (convertedImported / imported.length) * 100 : 0,
    newCustomersInPeriod,
  };
};
