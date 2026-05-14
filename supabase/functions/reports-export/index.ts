import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.105.4";
import { captureEdgeException } from "../_shared/observability.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, accept",
  "Access-Control-Expose-Headers": "Content-Disposition, X-Export-Limited",
};

const CSV_DELIMITER = ";";
const EXPORT_MAX_RANGE_DAYS = 120;
const EXPORT_MAX_ORDER_ROWS = 2500;
const PAGE_SIZE = 1000;
const FATURAMENTO_STATUS = "finalizado";
const REPORT_TIME_ZONE = "America/Sao_Paulo";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(supabaseUrl, serviceRoleKey);

type ExportSection =
  | "dashboard"
  | "vendas"
  | "produtos"
  | "clientes"
  | "categorias"
  | "funcionarios"
  | "performance"
  | "evolucao";

type ExportPayload = {
  dateFrom?: string;
  dateTo?: string;
  dados?: string[];
  status?: string;
  canal?: string;
  titulo?: string;
  periodoComparacao?: string;
  restaurantId?: string;
};

type ExportRow = Record<string, string | number | boolean | null>;

type Profile = {
  id: string;
  restaurant_id: string | null;
  user_type: string | null;
  role: string | null;
};

type PedidoItemExportQuery = {
  product_name: string;
  quantity: number;
  price: number;
  observations: string | null;
};

type PedidoExportQuery = {
  id: string;
  order_number: string;
  total: number;
  created_at: string;
  customer_name: string | null;
  customer_phone: string | null;
  status: string;
  order_type: string;
  payment_method: string | null;
  source: string | null;
  order_items?: PedidoItemExportQuery[] | null;
};

type ProdutoExportQuery = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  available: boolean;
  created_at: string;
  categories?: { name: string | null } | Array<{ name: string | null }> | null;
};

type ClientePedidoExportQuery = {
  customer_name: string | null;
  customer_phone: string | null;
  total: number;
  created_at: string;
  status: string;
};

type ClienteAgrupado = {
  nome: string | null;
  telefone: string | null;
  totalGasto: number;
  totalPedidos: number;
  ultimoPedido: string;
};

type ProdutoCategoriaExportQuery = {
  id: string;
  name: string;
  price: number;
  available: boolean;
};

type CategoriaExportQuery = {
  id: string;
  name: string;
  created_at: string;
  products?: ProdutoCategoriaExportQuery[] | null;
};

type FuncionarioExportQuery = {
  id: string;
  employee_name: string;
  employee_email: string | null;
  user_type: string;
  is_active: boolean;
  created_at: string;
  employee_permissions?: Array<{ permission: string }> | null;
};

type PeriodMetrics = {
  faturamento: number;
  pedidos: number;
  ticketMedio: number;
  produtosVendidos: number;
  evolucao: Array<{ data: string; faturamento: number; pedidos: number }>;
};

type PagedQuery<T> = {
  range: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>;
};

const TITULOS_SECOES: Record<ExportSection, string> = {
  dashboard: "Estatísticas",
  vendas: "Vendas",
  produtos: "Produtos",
  clientes: "Clientes",
  categorias: "Categorias",
  funcionarios: "Funcionários",
  performance: "Performance",
  evolucao: "Evolução",
};

const SECTION_ORDER: ExportSection[] = [
  "dashboard",
  "vendas",
  "produtos",
  "clientes",
  "categorias",
  "funcionarios",
  "performance",
  "evolucao",
];

const ALLOWED_SECTIONS = new Set<ExportSection>(SECTION_ORDER);

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

const csvResponse = (content: string, filename: string, limited: boolean) =>
  new Response(content, {
    status: 200,
    headers: {
      "Content-Type": "text/csv;charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "X-Export-Limited": limited ? "true" : "false",
      ...corsHeaders,
    },
  });

const sanitizeSpreadsheetCell = (value: string | number | boolean | null) => {
  const text = String(value ?? "");
  return /^[=+\-@]/.test(text.trim()) ? `'${text}` : value;
};

const escapeCsvCell = (value: string | number | boolean | null) => {
  const sanitized = sanitizeSpreadsheetCell(value);
  const text = String(sanitized ?? "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  if (text.includes(CSV_DELIMITER) || text.includes('"') || text.includes("\n")) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
};

const appendCsvRow = (lines: string[], cells: Array<string | number | boolean | null>) => {
  lines.push(cells.map(escapeCsvCell).join(CSV_DELIMITER));
};

const getColumns = (rows: ExportRow[]) =>
  Array.from(new Set(rows.flatMap((row) => Object.keys(row))));

const formatarMoeda = (valor: unknown) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(valor || 0));

const formatarData = (valor: unknown) => {
  if (!valor) return "";
  return new Date(String(valor)).toLocaleString("pt-BR", { timeZone: REPORT_TIME_ZONE });
};

const labelCanal = (canal = "todos") => {
  const labels: Record<string, string> = {
    todos: "Todas",
    "source:app": "PDV",
    "source:cardapio": "Cardápio digital",
    "source:ifood": "iFood",
    "tipo:mesa": "Mesa",
    "tipo:balcao": "Balcão",
    "tipo:delivery": "Delivery",
  };
  return labels[canal] || canal;
};

const labelStatus = (status = "todos") => {
  const labels: Record<string, string> = {
    todos: "Todos",
    finalizado: "Finalizados",
    pendente: "Pendentes",
    preparo: "Em preparo",
    "em-andamento": "Em andamento",
    cancelado: "Cancelados",
  };
  return labels[status] || status;
};

const formatarDataCurta = (date: Date) =>
  date.toLocaleDateString("pt-BR", { timeZone: REPORT_TIME_ZONE });

const fileDate = (date: Date) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: REPORT_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value || "";
  return `${get("year")}-${get("month")}-${get("day")}`;
};

const getDateRangeDays = (from: Date, to: Date) =>
  Math.floor((to.getTime() - from.getTime()) / 86_400_000) + 1;

const parseDateRange = (payload: ExportPayload) => {
  const dateFrom = new Date(String(payload.dateFrom || ""));
  const dateTo = new Date(String(payload.dateTo || ""));

  if (Number.isNaN(dateFrom.getTime()) || Number.isNaN(dateTo.getTime())) {
    throw new Error("Período inválido.");
  }

  if (dateFrom > dateTo) {
    throw new Error("A data inicial não pode ser maior que a data final.");
  }

  const days = getDateRangeDays(dateFrom, dateTo);
  if (days < 1 || days > EXPORT_MAX_RANGE_DAYS) {
    throw new Error(`Exportação limitada a ${EXPORT_MAX_RANGE_DAYS} dias. Reduza o intervalo.`);
  }

  return { dateFrom, dateTo };
};

const normalizeSections = (dados?: string[]) => {
  const sections = Array.from(
    new Set((dados || []).filter((item): item is ExportSection => ALLOWED_SECTIONS.has(item as ExportSection))),
  );

  if (sections.length === 0) {
    throw new Error("Selecione ao menos um dado para exportar.");
  }

  return sections;
};

const parseCanal = (canal = "todos") => {
  if (!canal || canal === "todos") return null;
  const [tipoFiltro, valor] = canal.split(":");
  if (!valor) return null;
  if (tipoFiltro === "tipo") return { column: "order_type", value: valor } as const;
  return { column: "source", value: valor } as const;
};

const getAuthenticatedUser = async (req: Request) => {
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace("Bearer ", "");
  if (!token) throw new Error("Usuário não autenticado");

  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) throw new Error("Usuário não autenticado");
  return data.user;
};

const loadProfile = async (userId: string): Promise<Profile> => {
  const { data, error } = await admin
    .from("users")
    .select("id, restaurant_id, user_type, role")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) throw new Error("Perfil do usuário não encontrado");
  return data as Profile;
};

const isSuperAdmin = async (userId: string) => {
  const { data, error } = await admin.rpc("is_super_admin", { user_id: userId });
  if (error) throw error;
  return !!data;
};

const hasReportPermission = async (userId: string) => {
  const { data: employee } = await admin
    .from("employees")
    .select("id")
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();

  if (!employee?.id) return false;

  const { data } = await admin
    .from("employee_permissions")
    .select("permission")
    .eq("employee_id", employee.id)
    .in("permission", ["orders_metrics_view", "reports_view"])
    .limit(1);

  return Boolean(data?.length);
};

const resolveRestaurantId = async (userId: string, requestedRestaurantId?: string) => {
  const profile = await loadProfile(userId);
  const superAdmin = profile.role === "super_admin" || await isSuperAdmin(userId);
  const restaurantId = requestedRestaurantId || profile.restaurant_id;

  if (!restaurantId) throw new Error("Restaurante não encontrado para este usuário");
  if (superAdmin) return restaurantId;
  if (restaurantId !== profile.restaurant_id) throw new Error("Sem permissão para este restaurante");
  if (profile.user_type === "owner" || await hasReportPermission(userId)) return restaurantId;

  throw new Error("Sem permissão para relatórios deste restaurante");
};

async function fetchPaged<T>(build: () => PagedQuery<T>, maxRows?: number) {
  const rows: T[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const remaining = maxRows ? maxRows - rows.length : PAGE_SIZE;
    if (remaining <= 0) break;

    const size = Math.min(PAGE_SIZE, remaining);
    const { data, error } = await build().range(from, from + size - 1);
    if (error) throw new Error(error.message);

    const page = data || [];
    rows.push(...page);
    if (page.length < size) break;
  }

  return rows;
}

const fetchOrders = async (
  restaurantId: string,
  dateFrom: Date,
  dateTo: Date,
  status: string,
  canal: string,
  includeItems: boolean,
) => {
  const select = includeItems
    ? `
      id,
      order_number,
      total,
      created_at,
      customer_name,
      customer_phone,
      status,
      order_type,
      payment_method,
      source,
      order_items (
        product_name,
        quantity,
        price,
        observations
      )
    `
    : `
      id,
      order_number,
      total,
      created_at,
      customer_name,
      customer_phone,
      status,
      order_type,
      payment_method,
      source
    `;

  const canalFilter = parseCanal(canal);
  const rows = await fetchPaged<PedidoExportQuery>(() => {
    let query = admin
      .from("orders")
      .select(select)
      .eq("restaurant_id", restaurantId)
      .gte("created_at", dateFrom.toISOString())
      .lte("created_at", dateTo.toISOString());

    if (status !== "todos") {
      query = query.eq("status", status);
    }

    if (canalFilter?.column === "order_type") {
      query = query.eq("order_type", canalFilter.value);
    } else if (canalFilter?.column === "source") {
      query = query.eq("source", canalFilter.value);
    }

    return query.order("created_at", { ascending: false });
  }, EXPORT_MAX_ORDER_ROWS);

  return {
    rows,
    limited: rows.length === EXPORT_MAX_ORDER_ROWS,
  };
};

const fetchClientePedidos = async (
  restaurantId: string,
  dateFrom: Date,
  dateTo: Date,
  status: string,
  canal: string,
) => {
  const canalFilter = parseCanal(canal);

  return await fetchPaged<ClientePedidoExportQuery>(() => {
    let query = admin
      .from("orders")
      .select("customer_name, customer_phone, total, created_at, status, source, order_type")
      .eq("restaurant_id", restaurantId)
      .not("customer_name", "is", null)
      .gte("created_at", dateFrom.toISOString())
      .lte("created_at", dateTo.toISOString());

    if (status !== "todos") {
      query = query.eq("status", status);
    }

    if (canalFilter?.column === "order_type") {
      query = query.eq("order_type", canalFilter.value);
    } else if (canalFilter?.column === "source") {
      query = query.eq("source", canalFilter.value);
    }

    return query.order("created_at", { ascending: false });
  });
};

const fetchProducts = async (restaurantId: string) =>
  await fetchPaged<ProdutoExportQuery>(() =>
    admin
      .from("products")
      .select(`
        id,
        name,
        description,
        price,
        available,
        created_at,
        categories (name)
      `)
      .eq("restaurant_id", restaurantId)
      .order("name", { ascending: true })
  );

const fetchCategories = async (restaurantId: string) =>
  await fetchPaged<CategoriaExportQuery>(() =>
    admin
      .from("categories")
      .select(`
        id,
        name,
        created_at,
        products (id, name, price, available)
      `)
      .eq("restaurant_id", restaurantId)
      .order("name", { ascending: true })
  );

const fetchEmployees = async (restaurantId: string) =>
  await fetchPaged<FuncionarioExportQuery>(() =>
    admin
      .from("employees")
      .select(`
        id,
        employee_name,
        employee_email,
        user_type,
        is_active,
        created_at,
        employee_permissions (permission)
      `)
      .eq("restaurant_id", restaurantId)
      .order("employee_name", { ascending: true })
  );

const fetchMetricOrders = async (
  restaurantId: string,
  dateFrom: Date,
  dateTo: Date,
  canal: string,
) => {
  const canalFilter = parseCanal(canal);

  return await fetchPaged<Pick<PedidoExportQuery, "id" | "total" | "created_at">>(() => {
    let query = admin
      .from("orders")
      .select("id, total, created_at, source, order_type")
      .eq("restaurant_id", restaurantId)
      .eq("status", FATURAMENTO_STATUS)
      .gte("created_at", dateFrom.toISOString())
      .lte("created_at", dateTo.toISOString());

    if (canalFilter?.column === "order_type") {
      query = query.eq("order_type", canalFilter.value);
    } else if (canalFilter?.column === "source") {
      query = query.eq("source", canalFilter.value);
    }

    return query.order("created_at", { ascending: true });
  });
};

const fetchItemsQuantity = async (orderIds: string[]) => {
  let total = 0;
  const chunkSize = 250;

  for (let index = 0; index < orderIds.length; index += chunkSize) {
    const chunk = orderIds.slice(index, index + chunkSize);
    const rows = await fetchPaged<{ quantity: number }>(() =>
      admin
        .from("order_items")
        .select("quantity")
        .in("order_id", chunk)
    );
    total += rows.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  }

  return total;
};

const dateKey = (date: Date) => date.toISOString().split("T")[0];

const addDays = (date: Date, amount: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
};

const addMonths = (date: Date, amount: number) => {
  const next = new Date(date);
  next.setMonth(next.getMonth() + amount);
  return next;
};

const addYears = (date: Date, amount: number) => {
  const next = new Date(date);
  next.setFullYear(next.getFullYear() + amount);
  return next;
};

const listDenseDays = (from: Date, to: Date) => {
  const days: string[] = [];
  let cursor = new Date(`${dateKey(from)}T00:00:00.000Z`);
  const end = new Date(`${dateKey(to)}T00:00:00.000Z`);

  while (cursor <= end) {
    days.push(dateKey(cursor));
    cursor = addDays(cursor, 1);
  }

  return days;
};

const fetchPeriodMetrics = async (
  restaurantId: string,
  dateFrom: Date,
  dateTo: Date,
  canal: string,
): Promise<PeriodMetrics> => {
  const orders = await fetchMetricOrders(restaurantId, dateFrom, dateTo, canal);
  const orderIds = orders.map((order) => order.id);
  const faturamento = orders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const pedidos = orders.length;
  const produtosVendidos = orderIds.length > 0 ? await fetchItemsQuantity(orderIds) : 0;
  const daily = new Map<string, { faturamento: number; pedidos: number }>();

  for (const order of orders) {
    const key = dateKey(new Date(order.created_at));
    const current = daily.get(key) || { faturamento: 0, pedidos: 0 };
    current.faturamento += Number(order.total || 0);
    current.pedidos += 1;
    daily.set(key, current);
  }

  return {
    faturamento,
    pedidos,
    ticketMedio: pedidos > 0 ? faturamento / pedidos : 0,
    produtosVendidos,
    evolucao: listDenseDays(dateFrom, dateTo).map((day) => ({
      data: day,
      faturamento: daily.get(day)?.faturamento || 0,
      pedidos: daily.get(day)?.pedidos || 0,
    })),
  };
};

const calcularVariacao = (atual: number, anterior: number) => {
  if (anterior === 0) return atual > 0 ? 100 : 0;
  return ((atual - anterior) / anterior) * 100;
};

const calcularPeriodoComparacao = (dateFrom: Date, dateTo: Date, tipo = "mes-anterior") => {
  switch (tipo) {
    case "ano-anterior":
      return {
        from: addYears(dateFrom, -1),
        to: addYears(dateTo, -1),
        label: "Mesmo período do ano anterior",
      };
    default:
      return {
        from: addMonths(dateFrom, -1),
        to: addMonths(dateTo, -1),
        label: "Mês anterior",
      };
  }
};

const buildPerformanceSections = async (
  restaurantId: string,
  dateFrom: Date,
  dateTo: Date,
  canal: string,
  periodoComparacao = "mes-anterior",
) => {
  const current = await fetchPeriodMetrics(restaurantId, dateFrom, dateTo, canal);
  const quantidadeMedia =
    periodoComparacao === "media-3meses" ? 3 : periodoComparacao === "media-6meses" ? 6 : 0;
  let previous: PeriodMetrics;
  let comparacaoLabel: string;

  if (quantidadeMedia > 0) {
    const diasPeriodo = Math.max(1, getDateRangeDays(dateFrom, dateTo));
    const periodos: PeriodMetrics[] = [];

    for (let index = 0; index < quantidadeMedia; index += 1) {
      const periodoFim = addDays(dateFrom, -(index * diasPeriodo + 1));
      const periodoComeco = addDays(periodoFim, -(diasPeriodo - 1));
      periodos.push(await fetchPeriodMetrics(restaurantId, periodoComeco, periodoFim, canal));
    }

    previous = {
      faturamento: periodos.reduce((sum, item) => sum + item.faturamento, 0) / quantidadeMedia,
      pedidos: periodos.reduce((sum, item) => sum + item.pedidos, 0) / quantidadeMedia,
      ticketMedio: 0,
      produtosVendidos: periodos.reduce((sum, item) => sum + item.produtosVendidos, 0) / quantidadeMedia,
      evolucao: [],
    };
    previous.ticketMedio = previous.pedidos > 0 ? previous.faturamento / previous.pedidos : 0;
    comparacaoLabel = `Média dos ${quantidadeMedia} períodos anteriores`;
  } else {
    const comparacao = calcularPeriodoComparacao(dateFrom, dateTo, periodoComparacao);
    previous = await fetchPeriodMetrics(restaurantId, comparacao.from, comparacao.to, canal);
    comparacaoLabel = comparacao.label;
  }

  return {
    performance: [
      {
        metrica: "Faturamento",
        atual: formatarMoeda(current.faturamento),
        comparacao: formatarMoeda(previous.faturamento),
        variacao: `${calcularVariacao(current.faturamento, previous.faturamento).toFixed(1)}%`,
      },
      {
        metrica: "Pedidos finalizados",
        atual: current.pedidos,
        comparacao: Number(previous.pedidos.toFixed(1)),
        variacao: `${calcularVariacao(current.pedidos, previous.pedidos).toFixed(1)}%`,
      },
      {
        metrica: "Ticket médio",
        atual: formatarMoeda(current.ticketMedio),
        comparacao: formatarMoeda(previous.ticketMedio),
        variacao: `${calcularVariacao(current.ticketMedio, previous.ticketMedio).toFixed(1)}%`,
      },
      {
        metrica: "Produtos vendidos",
        atual: current.produtosVendidos,
        comparacao: Number(previous.produtosVendidos.toFixed(1)),
        variacao: `${calcularVariacao(current.produtosVendidos, previous.produtosVendidos).toFixed(1)}%`,
      },
      {
        metrica: "Comparação",
        atual: comparacaoLabel,
        comparacao: "",
        variacao: "",
      },
    ],
    evolucao: current.evolucao.map((row) => ({
          data: formatarDataCurta(new Date(`${row.data}T00:00:00`)),
      faturamento: formatarMoeda(row.faturamento),
      pedidos: row.pedidos,
    })),
  };
};

const categoryNameFor = (product: ProdutoExportQuery) => {
  const categories = product.categories;
  if (Array.isArray(categories)) return categories[0]?.name || "";
  return categories?.name || "";
};

const getRestaurantName = async (restaurantId: string) => {
  const { data, error } = await admin
    .from("restaurants")
    .select("name")
    .eq("id", restaurantId)
    .maybeSingle();

  if (error) throw error;
  return data?.name || "Pubfy";
};

const buildCsv = async (
  restaurantId: string,
  payload: ExportPayload,
  dateFrom: Date,
  dateTo: Date,
  sections: ExportSection[],
) => {
  const status = payload.status || "todos";
  const canal = payload.canal || "todos";
  const dadosParaExportar: Partial<Record<ExportSection, ExportRow[]>> = {};
  let pedidosBasicos: PedidoExportQuery[] | null = null;
  let pedidosComItens: PedidoExportQuery[] | null = null;
  let exportLimited = false;

  const ensurePedidosBasicos = async () => {
    if (!pedidosBasicos) {
      const result = await fetchOrders(restaurantId, dateFrom, dateTo, status, canal, false);
      pedidosBasicos = result.rows;
      exportLimited = exportLimited || result.limited;
    }
    return pedidosBasicos;
  };

  const ensurePedidosComItens = async () => {
    if (!pedidosComItens) {
      const result = await fetchOrders(restaurantId, dateFrom, dateTo, status, canal, true);
      pedidosComItens = result.rows;
      exportLimited = exportLimited || result.limited;
    }
    return pedidosComItens;
  };

  if (sections.includes("dashboard")) {
    const rows = sections.includes("vendas") ? await ensurePedidosComItens() : await ensurePedidosBasicos();
    const faturaveis = rows.filter((order) => order.status === FATURAMENTO_STATUS);
    const totalVendas = faturaveis.reduce((sum, order) => sum + Number(order.total), 0);
    const ticketMedio = faturaveis.length > 0 ? totalVendas / faturaveis.length : 0;

    dadosParaExportar.dashboard = [{
      periodo: `${formatarDataCurta(dateFrom)} - ${formatarDataCurta(dateTo)}`,
      status: labelStatus(status),
      origem: labelCanal(canal),
      faturamento: formatarMoeda(totalVendas),
      pedidos: rows.length,
      pedidosFinalizados: faturaveis.length,
      ticketMedio: formatarMoeda(ticketMedio),
      geradoEm: new Date().toLocaleString("pt-BR"),
    }];
  }

  if (sections.includes("vendas")) {
    const rows = await ensurePedidosComItens();
    dadosParaExportar.vendas = rows.map((order) => ({
      numero: order.order_number,
      data: formatarData(order.created_at),
      cliente: order.customer_name,
      telefone: order.customer_phone,
      status: order.status,
      tipo: order.order_type,
      origem: order.source,
      pagamento: order.payment_method,
      total: formatarMoeda(order.total),
      itens: (order.order_items || [])
        .map((item) => `${item.quantity}x ${item.product_name} (${formatarMoeda(item.price)})`)
        .join("; "),
    }));
  }

  if (sections.includes("produtos")) {
    const products = await fetchProducts(restaurantId);
    dadosParaExportar.produtos = products.map((product) => ({
      nome: product.name,
      descricao: product.description,
      preco: formatarMoeda(product.price),
      disponivel: product.available ? "Sim" : "Não",
      categoria: categoryNameFor(product),
      criadoEm: formatarData(product.created_at),
    }));
  }

  if (sections.includes("clientes")) {
    const clientesAgrupados = (await fetchClientePedidos(restaurantId, dateFrom, dateTo, status, canal))
      .filter((order) => order.status === FATURAMENTO_STATUS)
      .reduce<Record<string, ClienteAgrupado>>((acc, order) => {
        const key = `${order.customer_name || "Cliente"}-${order.customer_phone || ""}`;
        if (!acc[key]) {
          acc[key] = {
            nome: order.customer_name,
            telefone: order.customer_phone,
            totalGasto: 0,
            totalPedidos: 0,
            ultimoPedido: order.created_at,
          };
        }
        acc[key].totalGasto += Number(order.total);
        acc[key].totalPedidos += 1;
        if (new Date(order.created_at) > new Date(acc[key].ultimoPedido)) {
          acc[key].ultimoPedido = order.created_at;
        }
        return acc;
      }, {});

    dadosParaExportar.clientes = Object.values(clientesAgrupados).map((cliente) => ({
      nome: cliente.nome,
      telefone: cliente.telefone,
      totalGasto: formatarMoeda(cliente.totalGasto),
      totalPedidos: cliente.totalPedidos,
      ultimoPedido: formatarData(cliente.ultimoPedido),
    }));
  }

  if (sections.includes("categorias")) {
    const categories = await fetchCategories(restaurantId);
    dadosParaExportar.categorias = categories.map((category) => ({
      nome: category.name,
      produtos: category.products?.length || 0,
      produtosDisponiveis: category.products?.filter((product) => product.available).length || 0,
      valorMedio: category.products?.length
        ? formatarMoeda(
          category.products.reduce((sum, product) => sum + Number(product.price), 0) / category.products.length,
        )
        : formatarMoeda(0),
      criadoEm: formatarData(category.created_at),
    }));
  }

  if (sections.includes("funcionarios")) {
    const employees = await fetchEmployees(restaurantId);
    dadosParaExportar.funcionarios = employees.map((employee) => ({
      nome: employee.employee_name,
      email: employee.employee_email,
      tipo: employee.user_type,
      ativo: employee.is_active ? "Sim" : "Não",
      permissoes: (employee.employee_permissions || []).map((item) => item.permission).join(", "),
      criadoEm: formatarData(employee.created_at),
    }));
  }

  if (sections.includes("performance")) {
    const performanceSections = await buildPerformanceSections(
      restaurantId,
      dateFrom,
      dateTo,
      canal,
      payload.periodoComparacao,
    );
    dadosParaExportar.performance = performanceSections.performance;
    dadosParaExportar.evolucao = performanceSections.evolucao;
  }

  const restaurantName = await getRestaurantName(restaurantId);
  const titulo = payload.titulo || "Relatório Pubfy";
  const periodo = `${formatarDataCurta(dateFrom)} a ${formatarDataCurta(dateTo)}`;
  const lines: string[] = [];

  appendCsvRow(lines, [titulo]);
  appendCsvRow(lines, ["Restaurante", restaurantName]);
  appendCsvRow(lines, ["Período", periodo]);
  appendCsvRow(lines, ["Status", labelStatus(status)]);
  appendCsvRow(lines, ["Origem", labelCanal(canal)]);
  appendCsvRow(lines, ["Regra de faturamento", "Apenas pedidos finalizados entram em faturamento e ticket médio."]);
  lines.push("");

  let hasData = false;

  for (const secao of SECTION_ORDER) {
    const rows = dadosParaExportar[secao];
    if (!rows?.length) continue;
    hasData = true;

    const columns = getColumns(rows);
    appendCsvRow(lines, [TITULOS_SECOES[secao]]);
    appendCsvRow(lines, columns);
    rows.forEach((row) => appendCsvRow(lines, columns.map((column) => row[column] ?? "")));
    lines.push("");
  }

  if (!hasData) {
    appendCsvRow(lines, ["Sem dados para exportar."]);
  }

  return {
    content: `\uFEFF${lines.join("\r\n")}`,
    filename: `relatorio_${fileDate(dateFrom)}_${fileDate(dateTo)}.csv`,
    limited: exportLimited,
  };
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let detectedRestaurantId: string | undefined;

  try {
    if (req.method !== "POST") {
      return jsonResponse({ error: "Método não permitido" }, 405);
    }

    const user = await getAuthenticatedUser(req);
    const payload = (await req.json().catch(() => ({}))) as ExportPayload;
    const restaurantId = await resolveRestaurantId(user.id, payload.restaurantId);
    detectedRestaurantId = restaurantId;
    const { dateFrom, dateTo } = parseDateRange(payload);
    const sections = normalizeSections(payload.dados);
    const result = await buildCsv(restaurantId, payload, dateFrom, dateTo, sections);

    return csvResponse(result.content, result.filename, result.limited);
  } catch (error) {
    console.error("reports-export error:", error);
    await captureEdgeException(error, {
      functionName: "reports-export",
      req,
      tags: { action: "export_csv" },
      extra: { restaurant_id: detectedRestaurantId },
    });
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Erro desconhecido" },
      400,
    );
  }
});
