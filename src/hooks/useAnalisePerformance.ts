import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentRestaurantId } from "@/lib/supabase";
import { differenceInCalendarDays, endOfDay, startOfDay, subDays, subMonths, subYears } from "date-fns";
import {
  assertMaxReportRange,
  calendarDaysInclusive,
  REPORT_LARGE_PERIOD_THRESHOLD_DAYS,
} from "@/lib/reportLimits";

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

type DadosPeriodo = {
  faturamento: number;
  pedidos: number;
  ticketMedio: number;
  produtosVendidos: number;
  evolucao: EvolucaoPerformanceItem[];
};

type PeriodMetricsRpc = {
  faturamento: number;
  pedidos: number;
  ticketMedio: number;
  produtosVendidos: number;
  evolucao: EvolucaoPerformanceItem[] | null;
};

const calcularPeriodoComparacao = (dateFrom: Date, dateTo: Date, tipo: string) => {
  switch (tipo) {
    case "mes-anterior":
      return {
        from: subMonths(dateFrom, 1),
        to: subMonths(dateTo, 1),
        label: "mês anterior",
      };
    case "ano-anterior":
      return {
        from: subYears(dateFrom, 1),
        to: subYears(dateTo, 1),
        label: "mesmo período do ano anterior",
      };
    default:
      return {
        from: subMonths(dateFrom, 1),
        to: subMonths(dateTo, 1),
        label: "mês anterior",
      };
  }
};

async function buscarDadosPeriodoAgregado(from: Date, to: Date, canal = "todos"): Promise<DadosPeriodo> {
  const restaurantId = await getCurrentRestaurantId();
  if (!restaurantId) throw new Error("Restaurant ID not found");

  const fromDay = startOfDay(from);
  const toDay = endOfDay(to);
  assertMaxReportRange(fromDay, toDay);

  const rpc = supabase.rpc as unknown as (
    fn: "get_restaurant_sales_period_metrics",
    args: { p_restaurant_id: string; p_from: string; p_to: string; p_canal: string },
  ) => Promise<{ data: PeriodMetricsRpc | null; error: { message: string } | null }>;

  const { data: raw, error } = await rpc("get_restaurant_sales_period_metrics", {
    p_restaurant_id: restaurantId,
    p_from: fromDay.toISOString(),
    p_to: toDay.toISOString(),
    p_canal: canal,
  });

  if (error) throw new Error(error.message);
  if (!raw || typeof raw !== "object") throw new Error("Resposta de performance inválida");

  const row = raw as PeriodMetricsRpc;
  const evolucao = Array.isArray(row.evolucao)
    ? row.evolucao.map((d) => ({
        data: String(d.data),
        faturamento: Number(d.faturamento ?? 0),
        pedidos: Number(d.pedidos ?? 0),
      }))
    : [];

  return {
    faturamento: Number(row.faturamento ?? 0),
    pedidos: Number(row.pedidos ?? 0),
    ticketMedio: Number(row.ticketMedio ?? 0),
    produtosVendidos: Number(row.produtosVendidos ?? 0),
    evolucao,
  };
}

const buscarMediaPeriodosAnteriores = async (
  dateFrom: Date,
  dateTo: Date,
  quantidadePeriodos: number,
  canal = "todos",
) => {
  const periodoInicio = startOfDay(dateFrom);
  const diasPeriodo = Math.max(1, differenceInCalendarDays(endOfDay(dateTo), periodoInicio) + 1);
  const resultados: DadosPeriodo[] = [];

  for (let index = 0; index < quantidadePeriodos; index += 1) {
    const periodoFim = subDays(periodoInicio, index * diasPeriodo + 1);
    const periodoComeco = subDays(periodoFim, diasPeriodo - 1);
    resultados.push(await buscarDadosPeriodoAgregado(periodoComeco, periodoFim, canal));
  }

  const faturamento = resultados.reduce((sum, item) => sum + item.faturamento, 0) / quantidadePeriodos;
  const pedidos = resultados.reduce((sum, item) => sum + item.pedidos, 0) / quantidadePeriodos;
  const produtosVendidos =
    resultados.reduce((sum, item) => sum + item.produtosVendidos, 0) / quantidadePeriodos;

  return {
    faturamento,
    pedidos,
    ticketMedio: pedidos > 0 ? faturamento / pedidos : 0,
    produtosVendidos,
    evolucao: [],
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
    status: _status = "todos",
    canal = "todos",
  } = params;

  const fetchAnalise = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const dateFrom = startOfDay(paramsDateFrom);
      const dateTo = endOfDay(paramsDateTo);

      if (dateFrom > dateTo) {
        throw new Error("A data inicial não pode ser maior que a data final.");
      }

      assertMaxReportRange(dateFrom, dateTo);

      const dadosAtuais = await buscarDadosPeriodoAgregado(dateFrom, dateTo, canal);

      const quantidadeMedia =
        periodoComparacao === "media-3meses" ? 3 : periodoComparacao === "media-6meses" ? 6 : 0;
      const comp = calcularPeriodoComparacao(dateFrom, dateTo, periodoComparacao);
      const dadosComparacao =
        quantidadeMedia > 0
          ? await buscarMediaPeriodosAnteriores(dateFrom, dateTo, quantidadeMedia, canal)
          : await buscarDadosPeriodoAgregado(startOfDay(comp.from), endOfDay(comp.to), canal);
      const periodoComparacaoLabel =
        quantidadeMedia > 0
          ? `média dos ${quantidadeMedia} períodos anteriores`
          : comp.label;
      const diasPeriodo = Math.max(1, differenceInCalendarDays(dateTo, dateFrom) + 1);

      const performanceData: PerformanceData = {
        faturamento: {
          atual: dadosAtuais.faturamento,
          variacao: calcularVariacao(dadosAtuais.faturamento, dadosComparacao.faturamento),
        },
        pedidos: {
          atual: dadosAtuais.pedidos,
          variacao: calcularVariacao(dadosAtuais.pedidos, dadosComparacao.pedidos),
        },
        ticketMedio: {
          atual: dadosAtuais.ticketMedio,
          variacao: calcularVariacao(dadosAtuais.ticketMedio, dadosComparacao.ticketMedio),
        },
        produtosVendidos: {
          atual: dadosAtuais.produtosVendidos,
          variacao: calcularVariacao(dadosAtuais.produtosVendidos, dadosComparacao.produtosVendidos),
        },
        evolucao: dadosAtuais.evolucao,
        metricas: [
          {
            nome: "Taxa de Crescimento de Vendas",
            valor: calcularVariacao(dadosAtuais.faturamento, dadosComparacao.faturamento),
            formato: "percentual",
          },
          {
            nome: "Pedidos por Dia",
            valor: dadosAtuais.pedidos / diasPeriodo,
            formato: "numero",
          },
          {
            nome: "Itens por Pedido",
            valor: dadosAtuais.produtosVendidos / Math.max(1, dadosAtuais.pedidos),
            formato: "numero",
          },
        ],
        periodoComparacaoLabel,
      };

      setData(performanceData);
    } catch (err) {
      console.error("Erro ao analisar performance:", err);
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }, [paramsDateFrom, paramsDateTo, periodoComparacao, canal]);

  const isLargePeriod =
    calendarDaysInclusive(startOfDay(paramsDateFrom), endOfDay(paramsDateTo)) >=
    REPORT_LARGE_PERIOD_THRESHOLD_DAYS;

  return {
    data,
    loading,
    error,
    refetch: fetchAnalise,
    isLargePeriod,
  };
};
