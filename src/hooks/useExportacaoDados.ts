import { useState } from "react";
import { endOfDay, startOfDay } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentRestaurantId } from "@/lib/supabase";
import { toast } from "sonner";

interface ExportParams {
  dateFrom: Date;
  dateTo: Date;
  formato: "excel" | "pdf";
  dados: string[];
}

type ExportRow = Record<string, unknown>;

interface ExportData {
  vendas?: ExportRow[];
  produtos?: ExportRow[];
  clientes?: ExportRow[];
  categorias?: ExportRow[];
  funcionarios?: ExportRow[];
  dashboard?: ExportRow[];
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

const TITULOS_SECOES: Record<keyof ExportData, string> = {
  vendas: "Vendas",
  produtos: "Produtos",
  clientes: "Clientes",
  categorias: "Categorias",
  funcionarios: "Funcionarios",
  dashboard: "Estatisticas"
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

const escapeHtml = (value: unknown) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const sanitizeSpreadsheetCell = (value: unknown) => {
  const text = String(value ?? "");
  return /^[=+\-@]/.test(text.trim()) ? `'${text}` : text;
};

const downloadBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const toPdfText = (value: unknown) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const escapePdfText = (value: string) =>
  value
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");

const wrapLine = (line: string, limit = 92) => {
  if (line.length <= limit) return [line];

  const words = line.split(" ");
  const lines: string[] = [];
  let current = "";

  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (next.length > limit) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = next;
    }
  });

  if (current) lines.push(current);
  return lines;
};

const chunk = <T,>(items: T[], size: number) => {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
};

const buildPdf = (lines: string[]) => {
  const pages = chunk(lines.length ? lines : ["Sem dados para exportar."], 48);
  const objects: string[] = [];
  const kids = pages.map((_, index) => `${4 + index * 2} 0 R`).join(" ");

  objects.push("<< /Type /Catalog /Pages 2 0 R >>");
  objects.push(`<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>`);
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");

  pages.forEach((page, index) => {
    const pageObjectId = 4 + index * 2;
    const contentObjectId = pageObjectId + 1;
    const content = [
      "BT",
      "/F1 10 Tf",
      "50 800 Td",
      "14 TL",
      ...page.map((line) => `(${escapePdfText(line)}) Tj T*`),
      "ET"
    ].join("\n");

    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentObjectId} 0 R >>`);
    objects.push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
  });

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];

  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new Blob([pdf], { type: "application/pdf" });
};

const gerarLinhasPdf = (dados: ExportData, params: ExportParams) => {
  const lines = [
    "Relatorio Pubfy",
    `Periodo: ${params.dateFrom.toLocaleDateString("pt-BR")} a ${params.dateTo.toLocaleDateString("pt-BR")}`,
    `Gerado em: ${new Date().toLocaleString("pt-BR")}`,
    ""
  ];

  (Object.entries(dados) as Array<[keyof ExportData, ExportRow[] | undefined]>).forEach(([secao, rows]) => {
    if (!rows?.length) return;

    lines.push(TITULOS_SECOES[secao]);
    rows.slice(0, 80).forEach((row, index) => {
      const resumo = Object.entries(row)
        .map(([key, value]) => `${key}: ${toPdfText(value)}`)
        .join(" | ");
      lines.push(...wrapLine(`${index + 1}. ${resumo}`));
    });

    if (rows.length > 80) {
      lines.push(`... ${rows.length - 80} registros adicionais no arquivo Excel.`);
    }
    lines.push("");
  });

  return lines;
};

const gerarExcel = (dados: ExportData, params: ExportParams) => {
  const secoes = (Object.entries(dados) as Array<[keyof ExportData, ExportRow[] | undefined]>)
    .filter(([, rows]) => rows?.length);

  const tables = secoes.map(([secao, rows]) => {
    const columns = Array.from(new Set(rows!.flatMap((row) => Object.keys(row))));
    const header = columns.map((column) => `<th>${escapeHtml(column)}</th>`).join("");
    const body = rows!.map((row) => (
      `<tr>${columns.map((column) => `<td>${escapeHtml(sanitizeSpreadsheetCell(row[column]))}</td>`).join("")}</tr>`
    )).join("");

    return `
      <h2>${escapeHtml(TITULOS_SECOES[secao])}</h2>
      <table>
        <thead><tr>${header}</tr></thead>
        <tbody>${body}</tbody>
      </table>
    `;
  }).join("");

  const html = `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: Arial, sans-serif; }
          h1 { font-size: 18px; }
          h2 { font-size: 15px; margin-top: 22px; }
          table { border-collapse: collapse; margin-bottom: 16px; width: 100%; }
          th, td { border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 12px; vertical-align: top; }
          th { background: #f1f5f9; font-weight: 700; }
        </style>
      </head>
      <body>
        <h1>Relatorio Pubfy</h1>
        <p>Periodo: ${escapeHtml(params.dateFrom.toLocaleDateString("pt-BR"))} a ${escapeHtml(params.dateTo.toLocaleDateString("pt-BR"))}</p>
        <p>Gerado em: ${escapeHtml(new Date().toLocaleString("pt-BR"))}</p>
        ${tables || "<p>Sem dados para exportar.</p>"}
      </body>
    </html>
  `;

  const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" });
  downloadBlob(blob, `relatorio_${params.dateFrom.toISOString().split("T")[0]}_${params.dateTo.toISOString().split("T")[0]}.xls`);
};

const gerarPDF = (dados: ExportData, params: ExportParams) => {
  const blob = buildPdf(gerarLinhasPdf(dados, params));
  downloadBlob(blob, `relatorio_${params.dateFrom.toISOString().split("T")[0]}_${params.dateTo.toISOString().split("T")[0]}.pdf`);
};

export const useExportacaoDados = () => {
  const [loading, setLoading] = useState(false);

  const exportar = async (params: ExportParams) => {
    setLoading(true);
    
    try {
      const restaurantId = await getCurrentRestaurantId();
      if (!restaurantId) {
        throw new Error('Restaurant ID not found');
      }

      const dateFrom = startOfDay(params.dateFrom);
      const dateTo = endOfDay(params.dateTo);
      const { formato, dados } = params;

      if (dateFrom > dateTo) {
        throw new Error("A data inicial não pode ser maior que a data final.");
      }
      
      const dadosParaExportar: ExportData = {};
      let ordersForSummary: PedidoExportQuery[] | null = null;

      const buscarPedidos = async () => {
        const { data: orders, error } = await supabase
          .from('orders')
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
          .eq('restaurant_id', restaurantId)
          .gte('created_at', dateFrom.toISOString())
          .lte('created_at', dateTo.toISOString())
          .order('created_at', { ascending: false });

        if (error) throw error;

        return (orders || []) as PedidoExportQuery[];
      };

      const formatarPedidoExport = (order: PedidoExportQuery): ExportRow => ({
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
        });

      if (dados.includes('vendas') || dados.includes('dashboard')) {
        ordersForSummary = await buscarPedidos();
      }

      if (dados.includes('vendas')) {
        dadosParaExportar.vendas = (ordersForSummary || []).map(formatarPedidoExport);
      }

      if (dados.includes('produtos')) {
        const { data: products, error } = await supabase
          .from('products')
          .select(`
            id,
            name,
            description,
            price,
            available,
            created_at,
            categories (name)
          `)
          .eq('restaurant_id', restaurantId)
          .order('name', { ascending: true });

        if (error) throw error;

        dadosParaExportar.produtos = ((products || []) as ProdutoExportQuery[]).map((product) => ({
          nome: product.name,
          descricao: product.description,
          preco: formatarMoeda(product.price),
          disponivel: product.available ? "Sim" : "Nao",
          categoria: product.categories?.name || "",
          criadoEm: formatarData(product.created_at)
        }));
      }

      if (dados.includes('clientes')) {
        const { data: customers, error } = await supabase
          .from('orders')
          .select('customer_name, customer_phone, total, created_at, status')
          .eq('restaurant_id', restaurantId)
          .neq('status', 'cancelado')
          .not('customer_name', 'is', null)
          .gte('created_at', dateFrom.toISOString())
          .lte('created_at', dateTo.toISOString());

        if (error) throw error;

        const clientesAgrupados = ((customers || []) as ClientePedidoExportQuery[]).reduce<Record<string, ClienteAgrupado>>((acc, order) => {
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

        dadosParaExportar.clientes = Object.values(clientesAgrupados || {}).map((cliente) => ({
          nome: cliente.nome,
          telefone: cliente.telefone,
          totalGasto: formatarMoeda(cliente.totalGasto),
          totalPedidos: cliente.totalPedidos,
          ultimoPedido: formatarData(cliente.ultimoPedido)
        }));
      }

      if (dados.includes('categorias')) {
        const { data: categories, error } = await supabase
          .from('categories')
          .select(`
            id,
            name,
            created_at,
            products (id, name, price, available)
          `)
          .eq('restaurant_id', restaurantId)
          .order('name', { ascending: true });

        if (error) throw error;

        dadosParaExportar.categorias = ((categories || []) as CategoriaExportQuery[]).map((category) => ({
          nome: category.name,
          produtos: category.products?.length || 0,
          produtosDisponiveis: category.products?.filter((product) => product.available).length || 0,
          valorMedio: category.products?.length
            ? formatarMoeda(category.products.reduce((sum, product) => sum + Number(product.price), 0) / category.products.length)
            : formatarMoeda(0),
          criadoEm: formatarData(category.created_at)
        }));
      }

      if (dados.includes('funcionarios')) {
        const { data: employees, error } = await supabase
          .from('employees')
          .select(`
            id,
            employee_name,
            employee_email,
            user_type,
            is_active,
            created_at,
            employee_permissions (permission)
          `)
          .eq('restaurant_id', restaurantId)
          .order('employee_name', { ascending: true });

        if (error) throw error;

        dadosParaExportar.funcionarios = ((employees || []) as FuncionarioExportQuery[]).map((employee) => ({
          nome: employee.employee_name,
          email: employee.employee_email,
          tipo: employee.user_type,
          ativo: employee.is_active ? "Sim" : "Nao",
          permissoes: (employee.employee_permissions || []).map((item) => item.permission).join(", "),
          criadoEm: formatarData(employee.created_at)
        }));
      }

      if (dados.includes('dashboard')) {
        const vendas = ordersForSummary || [];
        const vendasValidas = vendas.filter((order) => order.status !== "cancelado");
        const totalVendas = vendasValidas.reduce((sum, order) => sum + Number(order.total), 0);
        const totalPedidos = vendasValidas.length;
        const ticketMedio = totalPedidos > 0 ? totalVendas / totalPedidos : 0;
        const cancelados = vendas.length - vendasValidas.length;

        dadosParaExportar.dashboard = [{
          periodo: `${dateFrom.toLocaleDateString('pt-BR')} - ${dateTo.toLocaleDateString('pt-BR')}`,
          faturamento: formatarMoeda(totalVendas),
          pedidosValidos: totalPedidos,
          ticketMedio: formatarMoeda(ticketMedio),
          pedidosCancelados: cancelados,
          geradoEm: new Date().toLocaleString('pt-BR')
        }];
      }

      if (formato === 'excel') {
        gerarExcel(dadosParaExportar, { ...params, dateFrom, dateTo });
      } else {
        gerarPDF(dadosParaExportar, { ...params, dateFrom, dateTo });
      }

      toast.success(`Arquivo ${formato === "excel" ? "Excel" : "PDF"} exportado com sucesso!`);
    } catch (error) {
      console.error('Erro ao exportar dados:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao exportar dados');
    } finally {
      setLoading(false);
    }
  };

  return {
    exportar,
    loading
  };
};
