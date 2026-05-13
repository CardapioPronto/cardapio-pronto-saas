import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentRestaurantId } from "@/lib/supabase";
import { endOfDay, startOfDay } from "date-fns";
import {
  assertMaxReportRange,
  calendarDaysInclusive,
  REPORT_LARGE_PERIOD_THRESHOLD_DAYS,
} from "@/lib/reportLimits";

interface RelatoriosParams {
  dateFrom: Date;
  dateTo: Date;
  tipo: string;
  status?: string;
  canal?: string;
}

interface RelatorioData {
  graficos: GraficoVendasItem[];
  produtos: ProdutoRelatorio[];
  resumo: {
    totalVendas: number;
    totalPedidos: number;
    pedidosFaturados: number;
    ticketMedio: number;
    pedidosCancelados: number;
    faturamentoCancelado: number;
  };
  status: Array<{ status: string; pedidos: number; total: number }>;
  filtrosAplicados: {
    regraFaturamento: string;
    status: string;
    canal: string;
  };
}

type GraficoVendasItem = {
  data: string;
  vendas: number;
  pedidos: number;
};

type ProdutoRelatorio = {
  nome: string;
  quantidade: number;
  receita: number;
  pedidos: number;
};

type SalesReportRpcRow = {
  graficos: GraficoVendasItem[] | null;
  produtos: ProdutoRelatorio[] | null;
  resumo: {
    totalVendas: number;
    totalPedidos: number;
    pedidosFaturados: number;
    ticketMedio: number;
    pedidosCancelados: number;
    faturamentoCancelado: number;
  } | null;
  status: Array<{ status: string; pedidos: number; total: number }> | null;
};

export const useRelatoriosAvancados = (params: RelatoriosParams) => {
  const [data, setData] = useState<RelatorioData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const {
    dateFrom: paramsDateFrom,
    dateTo: paramsDateTo,
    tipo,
    status = "todos",
    canal = "todos",
  } = params;

  const fetchRelatorio = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const restaurantId = await getCurrentRestaurantId();
      if (!restaurantId) {
        throw new Error("Restaurant ID not found");
      }

      const dateFrom = startOfDay(paramsDateFrom);
      const dateTo = endOfDay(paramsDateTo);

      if (dateFrom > dateTo) {
        throw new Error("A data inicial não pode ser maior que a data final.");
      }

      assertMaxReportRange(dateFrom, dateTo);

      const produtosSort = tipo === "produtos" ? "quantidade" : "receita";

      const rpc = supabase.rpc.bind(supabase) as unknown as (
        fn: "get_restaurant_sales_report",
        args: {
          p_restaurant_id: string;
          p_from: string;
          p_to: string;
          p_status: string;
          p_canal: string;
          p_produtos_sort: string;
        },
      ) => Promise<{ data: SalesReportRpcRow | null; error: { message: string } | null }>;

      const { data: raw, error: rpcError } = await rpc("get_restaurant_sales_report", {
        p_restaurant_id: restaurantId,
        p_from: dateFrom.toISOString(),
        p_to: dateTo.toISOString(),
        p_status: status,
        p_canal: canal,
        p_produtos_sort: produtosSort,
      });

      if (rpcError) throw new Error(rpcError.message);
      if (!raw || typeof raw !== "object") {
        throw new Error("Resposta de relatório inválida");
      }

      const row = raw as SalesReportRpcRow;
      const graficos = Array.isArray(row.graficos) ? row.graficos : [];
      const produtos = Array.isArray(row.produtos) ? row.produtos : [];
      const statusRows = Array.isArray(row.status) ? row.status : [];
      const resumo = row.resumo ?? {
        totalVendas: 0,
        totalPedidos: 0,
        pedidosFaturados: 0,
        ticketMedio: 0,
        pedidosCancelados: 0,
        faturamentoCancelado: 0,
      };

      setData({
        graficos,
        produtos,
        resumo: {
          totalVendas: Number(resumo.totalVendas ?? 0),
          totalPedidos: Number(resumo.totalPedidos ?? 0),
          pedidosFaturados: Number(resumo.pedidosFaturados ?? 0),
          ticketMedio: Number(resumo.ticketMedio ?? 0),
          pedidosCancelados: Number(resumo.pedidosCancelados ?? 0),
          faturamentoCancelado: Number(resumo.faturamentoCancelado ?? 0),
        },
        status: statusRows.map((s) => ({
          status: String(s.status),
          pedidos: Number(s.pedidos ?? 0),
          total: Number(s.total ?? 0),
        })),
        filtrosAplicados: {
          regraFaturamento:
            "Apenas pedidos finalizados entram em faturamento, ticket médio e gráficos de venda.",
          status,
          canal,
        },
      });
    } catch (err) {
      console.error("Erro ao buscar relatório:", err);
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }, [paramsDateFrom, paramsDateTo, tipo, status, canal]);

  const isLargePeriod =
    calendarDaysInclusive(startOfDay(paramsDateFrom), endOfDay(paramsDateTo)) >=
    REPORT_LARGE_PERIOD_THRESHOLD_DAYS;

  return {
    data,
    loading,
    error,
    refetch: fetchRelatorio,
    isLargePeriod,
  };
};
