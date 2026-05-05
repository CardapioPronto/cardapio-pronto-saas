import { useState } from "react";
import { addDays, differenceInCalendarDays, endOfDay, startOfDay, subDays, subMonths, subYears } from "date-fns";
import type { jsPDF as JsPDFType } from "jspdf";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentRestaurantId } from "@/lib/supabase";
import { toast } from "sonner";

interface ExportParams {
  dateFrom: Date;
  dateTo: Date;
  formato: "excel" | "pdf";
  dados: string[];
  status?: string;
  canal?: string;
  titulo?: string;
  periodoComparacao?: string;
  restaurantName?: string;
}

type ExportRow = Record<string, string | number | boolean | null>;

interface ExportData {
  dashboard?: ExportRow[];
  vendas?: ExportRow[];
  produtos?: ExportRow[];
  clientes?: ExportRow[];
  categorias?: ExportRow[];
  funcionarios?: ExportRow[];
  performance?: ExportRow[];
  evolucao?: ExportRow[];
}

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
  categories?: { name: string | null } | null;
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

type PedidoPerformanceRow = {
  id: string;
  total: number;
  created_at: string;
  order_items?: Array<{ quantity: number; price: number }> | null;
};

type DadosPerformancePeriodo = {
  faturamento: number;
  pedidos: number;
  ticketMedio: number;
  produtosVendidos: number;
  orders: PedidoPerformanceRow[];
};

const FATURAMENTO_STATUS = "finalizado";

const TITULOS_SECOES: Record<keyof ExportData, string> = {
  dashboard: "Estatísticas",
  vendas: "Vendas",
  produtos: "Produtos",
  clientes: "Clientes",
  categorias: "Categorias",
  funcionarios: "Funcionários",
  performance: "Performance",
  evolucao: "Evolução"
};

const formatarMoeda = (valor: unknown) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(Number(valor || 0));

const formatarData = (valor: unknown) => {
  if (!valor) return "";
  return new Date(String(valor)).toLocaleString("pt-BR");
};

const calcularVariacao = (atual: number, anterior: number) => {
  if (anterior === 0) return atual > 0 ? 100 : 0;
  return ((atual - anterior) / anterior) * 100;
};

const sanitizeSpreadsheetCell = (value: string | number | boolean | null) => {
  const text = String(value ?? "");
  return /^[=+\-@]/.test(text.trim()) ? `'${text}` : value;
};

const fileDate = (date: Date) => date.toISOString().split("T")[0];

const safeSheetName = (name: string) => name.replace(/[\\/?*[\]:]/g, "").slice(0, 31) || "Dados";

const getColumns = (rows: ExportRow[]) => Array.from(new Set(rows.flatMap((row) => Object.keys(row))));

const aplicarFiltroCanal = <T extends { eq: (column: string, value: string) => T }>(query: T, canal = "todos") => {
  if (!canal || canal === "todos") return query;
  const [tipoFiltro, valor] = canal.split(":");
  if (!valor) return query;
  return query.eq(tipoFiltro === "tipo" ? "order_type" : "source", valor);
};

const labelCanal = (canal = "todos") => {
  const labels: Record<string, string> = {
    todos: "Todas",
    "source:app": "PDV",
    "source:cardapio": "Cardápio digital",
    "source:ifood": "iFood",
    "tipo:mesa": "Mesa",
    "tipo:balcao": "Balcão",
    "tipo:delivery": "Delivery"
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
    cancelado: "Cancelados"
  };
  return labels[status] || status;
};

const calcularPeriodoComparacao = (dateFrom: Date, dateTo: Date, tipo = "mes-anterior") => {
  switch (tipo) {
    case "ano-anterior":
      return {
        from: subYears(dateFrom, 1),
        to: subYears(dateTo, 1),
        label: "Mesmo período do ano anterior"
      };
    default:
      return {
        from: subMonths(dateFrom, 1),
        to: subMonths(dateTo, 1),
        label: "Mês anterior"
      };
  }
};

const gerarExcel = async (dados: ExportData, params: ExportParams) => {
  const XLSX = await import("xlsx");
  const workbook = XLSX.utils.book_new();
  const secoes = (Object.entries(dados) as Array<[keyof ExportData, ExportRow[] | undefined]>)
    .filter(([, rows]) => rows?.length);

  secoes.forEach(([secao, rows]) => {
    const sanitizedRows = rows!.map((row) =>
      Object.fromEntries(
        Object.entries(row).map(([key, value]) => [key, sanitizeSpreadsheetCell(value)])
      )
    );
    const worksheet = XLSX.utils.json_to_sheet(sanitizedRows);
    XLSX.utils.book_append_sheet(workbook, worksheet, safeSheetName(TITULOS_SECOES[secao]));
  });

  if (!secoes.length) {
    const worksheet = XLSX.utils.json_to_sheet([{ mensagem: "Sem dados para exportar." }]);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sem dados");
  }

  XLSX.writeFile(workbook, `relatorio_${fileDate(params.dateFrom)}_${fileDate(params.dateTo)}.xlsx`);
};

const getLastTableY = (doc: JsPDFType) => {
  const tableDoc = doc as unknown as { lastAutoTable?: { finalY: number } };
  return tableDoc.lastAutoTable?.finalY || 58;
};

const gerarPDF = async (dados: ExportData, params: ExportParams) => {
  const [{ jsPDF }, autoTableModule] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable")
  ]);
  const autoTable = autoTableModule.default;
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const titulo = params.titulo || "Relatório Pubfy";
  const periodo = `${params.dateFrom.toLocaleDateString("pt-BR")} a ${params.dateTo.toLocaleDateString("pt-BR")}`;

  doc.setFontSize(16);
  doc.text(titulo, 40, 36);
  doc.setFontSize(9);
  doc.text(`Restaurante: ${params.restaurantName || "Pubfy"}`, 40, 52);
  doc.text(`Período: ${periodo}`, 40, 66);
  doc.text(`Status: ${labelStatus(params.status)} | Origem: ${labelCanal(params.canal)}`, 40, 80);
  doc.text("Regra de faturamento: apenas pedidos finalizados entram em faturamento e ticket médio.", 40, 94);

  let hasData = false;

  (Object.entries(dados) as Array<[keyof ExportData, ExportRow[] | undefined]>).forEach(([secao, rows]) => {
    if (!rows?.length) return;
    hasData = true;

    const columns = getColumns(rows);
    const startY = getLastTableY(doc) + 32;

    if (startY > 500) {
      doc.addPage();
    }

    doc.setFontSize(12);
    doc.text(TITULOS_SECOES[secao], 40, doc.getNumberOfPages() === 1 ? Math.min(startY, 112) : 40);

    autoTable(doc, {
      head: [columns],
      body: rows.map((row) => columns.map((column) => String(row[column] ?? ""))),
      startY: doc.getNumberOfPages() === 1 ? Math.max(startY + 8, 120) : 52,
      styles: { fontSize: 7, cellPadding: 4, overflow: "linebreak" },
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 40, right: 40 }
    });
  });

  if (!hasData) {
    doc.setFontSize(11);
    doc.text("Sem dados para exportar.", 40, 120);
  }

  doc.save(`relatorio_${fileDate(params.dateFrom)}_${fileDate(params.dateTo)}.pdf`);
};

export const useExportacaoDados = () => {
  const [loading, setLoading] = useState(false);

  const exportar = async (params: ExportParams) => {
    setLoading(true);

    try {
      const restaurantId = await getCurrentRestaurantId();
      if (!restaurantId) throw new Error("Restaurant ID not found");

      const { data: restaurant } = await supabase
        .from("restaurants")
        .select("name")
        .eq("id", restaurantId)
        .maybeSingle();

      const dateFrom = startOfDay(params.dateFrom);
      const dateTo = endOfDay(params.dateTo);
      const status = params.status || "todos";
      const canal = params.canal || "todos";
      const { formato, dados } = params;

      if (dateFrom > dateTo) {
        throw new Error("A data inicial não pode ser maior que a data final.");
      }

      const dadosParaExportar: ExportData = {};
      let pedidos: PedidoExportQuery[] | null = null;

      const buscarPedidos = async () => {
        let query = supabase
          .from("orders")
          .select(`
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
          `)
          .eq("restaurant_id", restaurantId)
          .gte("created_at", dateFrom.toISOString())
          .lte("created_at", dateTo.toISOString());

        if (status !== "todos") {
          query = query.eq("status", status);
        }

        query = aplicarFiltroCanal(query, canal);

        const { data, error } = await query.order("created_at", { ascending: false });
        if (error) throw error;
        return (data || []) as PedidoExportQuery[];
      };

      const ensurePedidos = async () => {
        if (!pedidos) pedidos = await buscarPedidos();
        return pedidos;
      };

      if (dados.includes("dashboard") || dados.includes("vendas")) {
        const rows = await ensurePedidos();
        const faturaveis = rows.filter((order) => order.status === FATURAMENTO_STATUS);
        const totalVendas = faturaveis.reduce((sum, order) => sum + Number(order.total), 0);
        const ticketMedio = faturaveis.length > 0 ? totalVendas / faturaveis.length : 0;

        if (dados.includes("dashboard")) {
          dadosParaExportar.dashboard = [{
            periodo: `${dateFrom.toLocaleDateString("pt-BR")} - ${dateTo.toLocaleDateString("pt-BR")}`,
            status: labelStatus(status),
            origem: labelCanal(canal),
            faturamento: formatarMoeda(totalVendas),
            pedidos: rows.length,
            pedidosFinalizados: faturaveis.length,
            ticketMedio: formatarMoeda(ticketMedio),
            geradoEm: new Date().toLocaleString("pt-BR")
          }];
        }

        if (dados.includes("vendas")) {
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
              .join("; ")
          }));
        }
      }

      if (dados.includes("produtos")) {
        const { data, error } = await supabase
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
          .order("name", { ascending: true });

        if (error) throw error;

        dadosParaExportar.produtos = ((data || []) as ProdutoExportQuery[]).map((product) => ({
          nome: product.name,
          descricao: product.description,
          preco: formatarMoeda(product.price),
          disponivel: product.available ? "Sim" : "Não",
          categoria: product.categories?.name || "",
          criadoEm: formatarData(product.created_at)
        }));
      }

      if (dados.includes("clientes")) {
        let query = supabase
          .from("orders")
          .select("customer_name, customer_phone, total, created_at, status, source, order_type")
          .eq("restaurant_id", restaurantId)
          .not("customer_name", "is", null)
          .gte("created_at", dateFrom.toISOString())
          .lte("created_at", dateTo.toISOString());

        if (status !== "todos") {
          query = query.eq("status", status);
        }
        query = aplicarFiltroCanal(query, canal);

        const { data, error } = await query;
        if (error) throw error;

        const clientesAgrupados = ((data || []) as ClientePedidoExportQuery[])
          .filter((order) => order.status === FATURAMENTO_STATUS)
          .reduce<Record<string, ClienteAgrupado>>((acc, order) => {
            const key = `${order.customer_name || "Cliente"}-${order.customer_phone || ""}`;
            if (!acc[key]) {
              acc[key] = {
                nome: order.customer_name,
                telefone: order.customer_phone,
                totalGasto: 0,
                totalPedidos: 0,
                ultimoPedido: order.created_at
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
          ultimoPedido: formatarData(cliente.ultimoPedido)
        }));
      }

      if (dados.includes("categorias")) {
        const { data, error } = await supabase
          .from("categories")
          .select(`
            id,
            name,
            created_at,
            products (id, name, price, available)
          `)
          .eq("restaurant_id", restaurantId)
          .order("name", { ascending: true });

        if (error) throw error;

        dadosParaExportar.categorias = ((data || []) as CategoriaExportQuery[]).map((category) => ({
          nome: category.name,
          produtos: category.products?.length || 0,
          produtosDisponiveis: category.products?.filter((product) => product.available).length || 0,
          valorMedio: category.products?.length
            ? formatarMoeda(category.products.reduce((sum, product) => sum + Number(product.price), 0) / category.products.length)
            : formatarMoeda(0),
          criadoEm: formatarData(category.created_at)
        }));
      }

      if (dados.includes("funcionarios")) {
        const { data, error } = await supabase
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
          .order("employee_name", { ascending: true });

        if (error) throw error;

        dadosParaExportar.funcionarios = ((data || []) as FuncionarioExportQuery[]).map((employee) => ({
          nome: employee.employee_name,
          email: employee.employee_email,
          tipo: employee.user_type,
          ativo: employee.is_active ? "Sim" : "Não",
          permissoes: (employee.employee_permissions || []).map((item) => item.permission).join(", "),
          criadoEm: formatarData(employee.created_at)
        }));
      }

      if (dados.includes("performance")) {
        const buscarPeriodoPerformance = async (from: Date, to: Date): Promise<DadosPerformancePeriodo> => {
          let query = supabase
            .from("orders")
            .select(`
              id,
              total,
              created_at,
              order_items (
                id,
                quantity,
                price
              )
            `)
            .eq("restaurant_id", restaurantId)
            .eq("status", FATURAMENTO_STATUS)
            .gte("created_at", startOfDay(from).toISOString())
            .lte("created_at", endOfDay(to).toISOString());

          query = aplicarFiltroCanal(query, canal);

          const { data, error } = await query.order("created_at", { ascending: true });
          if (error) throw error;

          const rows = (data || []) as PedidoPerformanceRow[];
          const faturamento = rows.reduce((sum, order) => sum + Number(order.total), 0);
          const pedidosCount = rows.length;
          const produtosVendidos = rows.reduce((sum, order) =>
            sum + (order.order_items?.reduce((itemSum, item) => itemSum + item.quantity, 0) || 0), 0);

          return {
            faturamento,
            pedidos: pedidosCount,
            ticketMedio: pedidosCount > 0 ? faturamento / pedidosCount : 0,
            produtosVendidos,
            orders: rows
          };
        };

        const current = await buscarPeriodoPerformance(dateFrom, dateTo);
        const quantidadeMedia = params.periodoComparacao === "media-3meses" ? 3 : params.periodoComparacao === "media-6meses" ? 6 : 0;
        let previous: DadosPerformancePeriodo;
        let comparacaoLabel: string;

        if (quantidadeMedia > 0) {
          const diasPeriodo = Math.max(1, differenceInCalendarDays(dateTo, dateFrom) + 1);
          const periodos: DadosPerformancePeriodo[] = [];

          for (let index = 0; index < quantidadeMedia; index += 1) {
            const periodoFim = subDays(dateFrom, (index * diasPeriodo) + 1);
            const periodoComeco = subDays(periodoFim, diasPeriodo - 1);
            periodos.push(await buscarPeriodoPerformance(periodoComeco, periodoFim));
          }

          previous = {
            faturamento: periodos.reduce((sum, item) => sum + item.faturamento, 0) / quantidadeMedia,
            pedidos: periodos.reduce((sum, item) => sum + item.pedidos, 0) / quantidadeMedia,
            ticketMedio: 0,
            produtosVendidos: periodos.reduce((sum, item) => sum + item.produtosVendidos, 0) / quantidadeMedia,
            orders: periodos.flatMap((item) => item.orders)
          };
          previous.ticketMedio = previous.pedidos > 0 ? previous.faturamento / previous.pedidos : 0;
          comparacaoLabel = `Média dos ${quantidadeMedia} períodos anteriores`;
        } else {
          const comparacao = calcularPeriodoComparacao(dateFrom, dateTo, params.periodoComparacao);
          previous = await buscarPeriodoPerformance(comparacao.from, comparacao.to);
          comparacaoLabel = comparacao.label;
        }

        dadosParaExportar.performance = [
          {
            metrica: "Faturamento",
            atual: formatarMoeda(current.faturamento),
            comparacao: formatarMoeda(previous.faturamento),
            variacao: `${calcularVariacao(current.faturamento, previous.faturamento).toFixed(1)}%`
          },
          {
            metrica: "Pedidos finalizados",
            atual: current.pedidos,
            comparacao: Number(previous.pedidos.toFixed(1)),
            variacao: `${calcularVariacao(current.pedidos, previous.pedidos).toFixed(1)}%`
          },
          {
            metrica: "Ticket médio",
            atual: formatarMoeda(current.ticketMedio),
            comparacao: formatarMoeda(previous.ticketMedio),
            variacao: `${calcularVariacao(current.ticketMedio, previous.ticketMedio).toFixed(1)}%`
          },
          {
            metrica: "Produtos vendidos",
            atual: current.produtosVendidos,
            comparacao: Number(previous.produtosVendidos.toFixed(1)),
            variacao: `${calcularVariacao(current.produtosVendidos, previous.produtosVendidos).toFixed(1)}%`
          },
          {
            metrica: "Comparação",
            atual: comparacaoLabel,
            comparacao: "",
            variacao: ""
          }
        ];

        const evolucaoPorDia = current.orders.reduce<Record<string, { data: string; faturamento: number; pedidos: number }>>((acc, order) => {
          const dia = new Date(order.created_at).toISOString().split("T")[0];
          if (!acc[dia]) acc[dia] = { data: dia, faturamento: 0, pedidos: 0 };
          acc[dia].faturamento += Number(order.total);
          acc[dia].pedidos += 1;
          return acc;
        }, {});

        dadosParaExportar.evolucao = [];
        for (let dia = startOfDay(dateFrom); dia <= dateTo; dia = addDays(dia, 1)) {
          const chave = dia.toISOString().split("T")[0];
          const row = evolucaoPorDia[chave] || { data: chave, faturamento: 0, pedidos: 0 };
          dadosParaExportar.evolucao.push({
            data: new Date(`${row.data}T00:00:00`).toLocaleDateString("pt-BR"),
            faturamento: formatarMoeda(row.faturamento),
            pedidos: row.pedidos
          });
        }
      }

      const normalizedParams = { ...params, dateFrom, dateTo, status, canal };
      normalizedParams.restaurantName = restaurant?.name || undefined;
      if (formato === "excel") {
        await gerarExcel(dadosParaExportar, normalizedParams);
      } else {
        await gerarPDF(dadosParaExportar, normalizedParams);
      }

      toast.success(`Arquivo ${formato === "excel" ? "XLSX" : "PDF"} exportado com sucesso!`);
    } catch (error) {
      console.error("Erro ao exportar dados:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao exportar dados");
    } finally {
      setLoading(false);
    }
  };

  return {
    exportar,
    loading
  };
};
