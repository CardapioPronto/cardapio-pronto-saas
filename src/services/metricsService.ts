import { supabase } from "@/integrations/supabase/client";

export interface MesaMetric {
  id: string;
  label: string;
  status: string;
  orders: number;
  revenue: number;
}

export interface MetricsFilters {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  categoryId?: string | null;
  tableId?: string | null;
}

export interface MetricsOverview {
  startDate: string;
  endDate: string;
  // Vendas / pedidos
  totalSales: number;
  totalOrders: number;
  averageTicket: number;
  canceledOrders: number;
  openOrders: number;
  ordersByType: { type: string; orders: number; revenue: number }[];
  salesByDay: { date: string; orders: number; revenue: number }[];
  // Cardápio
  totalProducts: number;
  availableProducts: number;
  totalCategories: number;
  topProducts: { name: string; quantity: number; revenue: number }[];
  categories: { id: string; name: string }[];
  // Mesas
  totalTables: number;
  occupiedTables: number;
  tablesWithOrders: number;
  ordersPerTableAverage: number;
  tableOrders: number;
  tableRevenue: number;
  mesas: MesaMetric[];
  tableOptions: { id: string; label: string }[];
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

const chunk = <T,>(items: T[], size: number): T[][] => {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
};

interface OrderItemRow {
  order_id: string;
  product_id: string | null;
  product_name: string | null;
  quantity: number | null;
  price: number | null;
}

const fetchOrderItems = async (orderIds: string[]): Promise<OrderItemRow[]> => {
  if (orderIds.length === 0) return [];
  const batches = await Promise.all(
    chunk(orderIds, 300).map((ids) =>
      supabase
        .from("order_items")
        .select("order_id, product_id, product_name, quantity, price")
        .in("order_id", ids),
    ),
  );
  return batches.flatMap((batch) => (batch.data ?? []) as OrderItemRow[]);
};

export const fetchMetricsOverview = async (
  restaurantId: string,
  filters: MetricsFilters,
): Promise<MetricsOverview> => {
  const startIso = new Date(`${filters.startDate}T00:00:00`).toISOString();
  const endIso = new Date(`${filters.endDate}T23:59:59.999`).toISOString();
  const categoryId = filters.categoryId || null;
  const tableId = filters.tableId || null;

  const [ordersRes, allOrderPhonesRes, mesasRes, productsRes, categoriesRes, customersRes] =
    await Promise.all([
      supabase
        .from("orders")
        .select("id, total, status, table_id, order_type, customer_phone, created_at")
        .eq("restaurant_id", restaurantId)
        .gte("created_at", startIso)
        .lte("created_at", endIso),
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
        .select("id, available, category_id")
        .eq("restaurant_id", restaurantId),
      supabase
        .from("categories")
        .select("id, name")
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

  const allProducts = (productsRes.data ?? []) as {
    id: string;
    available: boolean | null;
    category_id: string | null;
  }[];
  const products = categoryId
    ? allProducts.filter((product) => product.category_id === categoryId)
    : allProducts;

  let orders = ordersRes.data ?? [];
  if (tableId) {
    orders = orders.filter((order) => order.table_id === tableId);
  }

  // Itens dos pedidos (necessários para top produtos e filtro por categoria)
  const items = await fetchOrderItems(orders.map((order) => order.id));

  if (categoryId) {
    const categoryProductIds = new Set(products.map((product) => product.id));
    const ordersWithCategory = new Set(
      items
        .filter((item) => item.product_id && categoryProductIds.has(item.product_id))
        .map((item) => item.order_id),
    );
    orders = orders.filter((order) => ordersWithCategory.has(order.id));
  }

  const validOrders = orders.filter((order) => !CANCELED.has(String(order.status ?? "").toLowerCase()));
  const validOrderIds = new Set(validOrders.map((order) => order.id));

  const totalSales = validOrders.reduce((sum, order) => sum + Number(order.total ?? 0), 0);
  const totalOrders = validOrders.length;
  const canceledOrders = orders.length - totalOrders;
  const openOrders = validOrders.filter((order) =>
    OPEN.has(String(order.status ?? "").toLowerCase()),
  ).length;

  // Top produtos (respeitando os filtros aplicados)
  const categoryProductIds = new Set(products.map((product) => product.id));
  const byProduct = new Map<string, { quantity: number; revenue: number }>();
  items
    .filter((item) => validOrderIds.has(item.order_id))
    .filter((item) => !categoryId || (item.product_id ? categoryProductIds.has(item.product_id) : false))
    .forEach((item) => {
      const name = String(item.product_name ?? "Produto");
      const quantity = Number(item.quantity ?? 0);
      const revenue = quantity * Number(item.price ?? 0);
      const current = byProduct.get(name) ?? { quantity: 0, revenue: 0 };
      byProduct.set(name, {
        quantity: current.quantity + quantity,
        revenue: current.revenue + revenue,
      });
    });
  const topProducts = Array.from(byProduct.entries())
    .map(([name, value]) => ({ name, ...value }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 8);

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

  // Vendas por dia
  const byDay = new Map<string, { orders: number; revenue: number }>();
  validOrders.forEach((order) => {
    const date = String(order.created_at ?? "").slice(0, 10);
    if (!date) return;
    const current = byDay.get(date) ?? { orders: 0, revenue: 0 };
    byDay.set(date, {
      orders: current.orders + 1,
      revenue: current.revenue + Number(order.total ?? 0),
    });
  });
  const salesByDay = Array.from(byDay.entries())
    .map(([date, value]) => ({ date, ...value }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Pedidos por mesa
  const mesasData = (mesasRes.data ?? [])
    .filter((mesa) => mesa.is_active !== false)
    .filter((mesa) => !tableId || mesa.id === tableId);
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
    (customer) =>
      customer.created_at && customer.created_at >= startIso && customer.created_at <= endIso,
  ).length;

  const categories = ((categoriesRes.data ?? []) as { id: string; name: string | null }[])
    .map((category) => ({ id: category.id, name: String(category.name ?? "Sem nome") }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    startDate: filters.startDate,
    endDate: filters.endDate,
    totalSales,
    totalOrders,
    averageTicket: totalOrders > 0 ? totalSales / totalOrders : 0,
    canceledOrders,
    openOrders,
    ordersByType: Array.from(byType.entries())
      .map(([type, value]) => ({ type, ...value }))
      .sort((a, b) => b.orders - a.orders),
    salesByDay,
    totalProducts: products.length,
    availableProducts: products.filter((product) => product.available !== false).length,
    totalCategories: categoryId ? 1 : categories.length,
    topProducts,
    categories,
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
