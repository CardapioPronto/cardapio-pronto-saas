import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentRestaurantId } from "@/lib/supabase";
import { addDays, differenceInCalendarDays, endOfDay, startOfDay, subDays, subMonths, subYears } from "date-fns";

interface AnaliseParams {
  dateFrom: Date;
  dateTo: Date;
  periodoComparacao: string;
  status?: string;
  canal?: string;
}

interface PerformanceData {
  faturamento: { atual: number; variacao: number };
  pedidos: { atual: number; variacao: number };
  ticketMedio: { atual: number; variacao: number };
  produtosVendidos: { atual: number; variacao: number };
  evolucao: EvolucaoPerformanceItem[];
  metricas: MetricaPerformance[];
  periodoComparacaoLabel: string;
}

type EvolucaoPerformanceItem = {
  data: string;
  faturamento: number;
  pedidos: number;
};

type MetricaPerformance = {
  nome: string;
  valor: number;
  formato: string;
};

type OrderPerformanceRow = {
  id: string;
  total: number;
  created_at: string;
  order_items?: Array<{ quantity: number; price: number }> | null;
};

type DadosPeriodo = {
  faturamento: number;
  pedidos: number;
  ticketMedio: number;
  produtosVendidos: number;
  orders: OrderPerformanceRow[];
};

const FATURAMENTO_STATUS = "finalizado";

const aplicarFiltroCanal = <T extends { eq: (column: string, value: string) => T }>(query: T, canal?: string) => {
  if (!canal || canal === "todos") return query;
  const [tipoFiltro, valor] = canal.split(":");
  if (!valor) return query;
  return query.eq(tipoFiltro === "tipo" ? "order_type" : "source", valor);
};

const calcularPeriodoComparacao = (dateFrom: Date, dateTo: Date, tipo: string) => {
  switch (tipo) {
    case "mes-anterior":
      return {
        from: subMonths(dateFrom, 1),
        to: subMonths(dateTo, 1),
        label: "mês anterior"
      };
    case "ano-anterior":
      return {
        from: subYears(dateFrom, 1),
        to: subYears(dateTo, 1),
        label: "mesmo período do ano anterior"
      };
    default:
      return {
        from: subMonths(dateFrom, 1),
        to: subMonths(dateTo, 1),
        label: "mês anterior"
      };
  }
};

const buscarDadosPeriodo = async (from: Date, to: Date, status = "todos", canal = "todos"): Promise<DadosPeriodo> => {
  const restaurantId = await getCurrentRestaurantId();
  if (!restaurantId) throw new Error('Restaurant ID not found');

  let ordersQuery = supabase
    .from('orders')
    .select(`
      id,
      total,
      created_at,
      status,
      source,
      order_type,
      order_items (
        id,
        quantity,
        price
      )
    `)
    .eq('restaurant_id', restaurantId)
    .eq('status', FATURAMENTO_STATUS)
    .gte('created_at', startOfDay(from).toISOString())
    .lte('created_at', endOfDay(to).toISOString());

  if (status !== "todos") {
    ordersQuery = ordersQuery.eq("status", status);
  }

  ordersQuery = aplicarFiltroCanal(ordersQuery, canal);

  const { data: orders, error } = await ordersQuery;

  if (error) throw error;

  const rows = (orders || []) as OrderPerformanceRow[];
  const faturamento = rows.reduce((sum, order) => sum + Number(order.total), 0) || 0;
  const pedidos = rows.length || 0;
  const ticketMedio = pedidos > 0 ? faturamento / pedidos : 0;
  const produtosVendidos = rows.reduce((sum, order) => 
    sum + (order.order_items?.reduce((itemSum, item) => itemSum + item.quantity, 0) || 0), 0) || 0;

  return { faturamento, pedidos, ticketMedio, produtosVendidos, orders: rows };
};

const buscarMediaPeriodosAnteriores = async (
  dateFrom: Date,
  dateTo: Date,
  quantidadePeriodos: number,
  status = "todos",
  canal = "todos"
) => {
  const periodoInicio = startOfDay(dateFrom);
  const diasPeriodo = Math.max(1, differenceInCalendarDays(endOfDay(dateTo), periodoInicio) + 1);
  const resultados: DadosPeriodo[] = [];

  for (let index = 0; index < quantidadePeriodos; index += 1) {
    const periodoFim = subDays(periodoInicio, (index * diasPeriodo) + 1);
    const periodoComeco = subDays(periodoFim, diasPeriodo - 1);
    resultados.push(await buscarDadosPeriodo(periodoComeco, periodoFim, status, canal));
  }

  const faturamento = resultados.reduce((sum, item) => sum + item.faturamento, 0) / quantidadePeriodos;
  const pedidos = resultados.reduce((sum, item) => sum + item.pedidos, 0) / quantidadePeriodos;
  const produtosVendidos = resultados.reduce((sum, item) => sum + item.produtosVendidos, 0) / quantidadePeriodos;

  return {
    faturamento,
    pedidos,
    ticketMedio: pedidos > 0 ? faturamento / pedidos : 0,
    produtosVendidos,
    orders: resultados.flatMap((item) => item.orders)
  };
};

const calcularVariacao = (atual: number, anterior: number) => {
  if (anterior === 0) return atual > 0 ? 100 : 0;
  return ((atual - anterior) / anterior) * 100;
};

export const useAnalisePerformance = (params: AnaliseParams) => {
  const [data, setData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const {
    dateFrom: paramsDateFrom,
    dateTo: paramsDateTo,
    periodoComparacao,
    status = "todos",
    canal = "todos"
  } = params;

  const fetchAnalise = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const dateFrom = startOfDay(paramsDateFrom);
      const dateTo = endOfDay(paramsDateTo);

      if (dateFrom > dateTo) {
        throw new Error('A data inicial não pode ser maior que a data final.');
      }
      
      // Buscar dados do período atual
      const dadosAtuais = await buscarDadosPeriodo(dateFrom, dateTo, status, canal);
      
      // Buscar dados do período de comparação
      const quantidadeMedia = periodoComparacao === "media-3meses" ? 3 : periodoComparacao === "media-6meses" ? 6 : 0;
      const dadosComparacao = quantidadeMedia > 0
        ? await buscarMediaPeriodosAnteriores(dateFrom, dateTo, quantidadeMedia, status, canal)
        : await buscarDadosPeriodo(
            calcularPeriodoComparacao(dateFrom, dateTo, periodoComparacao).from,
            calcularPeriodoComparacao(dateFrom, dateTo, periodoComparacao).to,
            status,
            canal
          );
      const periodoComparacaoLabel = quantidadeMedia > 0
        ? `média dos ${quantidadeMedia} períodos anteriores`
        : calcularPeriodoComparacao(dateFrom, dateTo, periodoComparacao).label;
      const diasPeriodo = Math.max(1, differenceInCalendarDays(dateTo, dateFrom) + 1);

      // Calcular variações
      const performanceData: PerformanceData = {
        faturamento: {
          atual: dadosAtuais.faturamento,
          variacao: calcularVariacao(dadosAtuais.faturamento, dadosComparacao.faturamento)
        },
        pedidos: {
          atual: dadosAtuais.pedidos,
          variacao: calcularVariacao(dadosAtuais.pedidos, dadosComparacao.pedidos)
        },
        ticketMedio: {
          atual: dadosAtuais.ticketMedio,
          variacao: calcularVariacao(dadosAtuais.ticketMedio, dadosComparacao.ticketMedio)
        },
        produtosVendidos: {
          atual: dadosAtuais.produtosVendidos,
          variacao: calcularVariacao(dadosAtuais.produtosVendidos, dadosComparacao.produtosVendidos)
        },
        evolucao: [], // Dados para gráfico de evolução
        metricas: [
          {
            nome: "Taxa de Crescimento de Vendas",
            valor: calcularVariacao(dadosAtuais.faturamento, dadosComparacao.faturamento),
            formato: "percentual"
          },
          {
            nome: "Pedidos por Dia",
            valor: dadosAtuais.pedidos / diasPeriodo,
            formato: "numero"
          },
          {
            nome: "Itens por Pedido",
            valor: dadosAtuais.produtosVendidos / Math.max(1, dadosAtuais.pedidos),
            formato: "numero"
          }
        ],
        periodoComparacaoLabel
      };

      // Gerar dados de evolução diária
      const evolucaoDiaria = dadosAtuais.orders.reduce<Record<string, EvolucaoPerformanceItem>>((acc, order) => {
        const dia = new Date(order.created_at).toISOString().split('T')[0];
        if (!acc[dia]) {
          acc[dia] = { data: dia, faturamento: 0, pedidos: 0 };
        }
        acc[dia].faturamento += Number(order.total);
        acc[dia].pedidos += 1;
        return acc;
      }, {}) || {};

      const evolucaoCompleta: EvolucaoPerformanceItem[] = [];
      for (let dia = startOfDay(dateFrom); dia <= dateTo; dia = addDays(dia, 1)) {
        const chave = dia.toISOString().split('T')[0];
        evolucaoCompleta.push(evolucaoDiaria[chave] || { data: chave, faturamento: 0, pedidos: 0 });
      }

      performanceData.evolucao = evolucaoCompleta;

      setData(performanceData);
    } catch (err) {
      console.error('Erro ao analisar performance:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }, [paramsDateFrom, paramsDateTo, periodoComparacao, status, canal]);

  return {
    data,
    loading,
    error,
    refetch: fetchAnalise
  };
};
