import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentRestaurantId } from "@/lib/supabase";
import { subMonths, subYears, startOfMonth, endOfMonth } from "date-fns";

interface AnaliseParams {
  dateFrom: Date;
  dateTo: Date;
  periodoComparacao: string;
}

interface PerformanceData {
  faturamento: { atual: number; variacao: number };
  pedidos: { atual: number; variacao: number };
  ticketMedio: { atual: number; variacao: number };
  produtosVendidos: { atual: number; variacao: number };
  evolucao: any[];
  metricas: any[];
}

export const useAnalisePerformance = (params: AnaliseParams) => {
  const [data, setData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calcularPeriodoComparacao = (dateFrom: Date, dateTo: Date, tipo: string) => {
    switch (tipo) {
      case "mes-anterior":
        return {
          from: subMonths(dateFrom, 1),
          to: subMonths(dateTo, 1)
        };
      case "ano-anterior":
        return {
          from: subYears(dateFrom, 1),
          to: subYears(dateTo, 1)
        };
      case "media-3meses":
        return {
          from: subMonths(dateFrom, 3),
          to: subMonths(dateTo, 1)
        };
      case "media-6meses":
        return {
          from: subMonths(dateFrom, 6),
          to: subMonths(dateTo, 1)
        };
      default:
        return {
          from: subMonths(dateFrom, 1),
          to: subMonths(dateTo, 1)
        };
    }
  };

  const buscarDadosPeriodo = async (from: Date, to: Date) => {
    const restaurantId = await getCurrentRestaurantId();
    if (!restaurantId) throw new Error('Restaurant ID not found');

    const { data: orders, error } = await supabase
      .from('orders')
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
      .eq('restaurant_id', restaurantId)
      .gte('created_at', from.toISOString())
      .lte('created_at', to.toISOString());

    if (error) throw error;

    const faturamento = orders?.reduce((sum, order) => sum + Number(order.total), 0) || 0;
    const pedidos = orders?.length || 0;
    const ticketMedio = pedidos > 0 ? faturamento / pedidos : 0;
    const produtosVendidos = orders?.reduce((sum, order) => 
      sum + (order.order_items?.reduce((itemSum, item) => itemSum + item.quantity, 0) || 0), 0) || 0;

    return { faturamento, pedidos, ticketMedio, produtosVendidos, orders };
  };

  const calcularVariacao = (atual: number, anterior: number) => {
    if (anterior === 0) return atual > 0 ? 100 : 0;
    return ((atual - anterior) / anterior) * 100;
  };

  const fetchAnalise = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { dateFrom, dateTo, periodoComparacao } = params;
      
      // Buscar dados do período atual
      const dadosAtuais = await buscarDadosPeriodo(dateFrom, dateTo);
      
      // Buscar dados do período de comparação
      const periodoComp = calcularPeriodoComparacao(dateFrom, dateTo, periodoComparacao);
      const dadosComparacao = await buscarDadosPeriodo(periodoComp.from, periodoComp.to);

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
            nome: "Eficiência de Vendas",
            valor: dadosAtuais.pedidos > 0 ? (dadosAtuais.faturamento / dadosAtuais.pedidos) : 0,
            formato: "moeda"
          },
          {
            nome: "Produtividade",
            valor: dadosAtuais.produtosVendidos / Math.max(1, dadosAtuais.pedidos),
            formato: "numero"
          }
        ]
      };

      // Gerar dados de evolução diária
      const evolucaoDiaria = dadosAtuais.orders?.reduce((acc: any, order) => {
        const dia = new Date(order.created_at).toISOString().split('T')[0];
        if (!acc[dia]) {
          acc[dia] = { data: dia, faturamento: 0, pedidos: 0 };
        }
        acc[dia].faturamento += Number(order.total);
        acc[dia].pedidos += 1;
        return acc;
      }, {}) || {};

      performanceData.evolucao = Object.values(evolucaoDiaria);

      setData(performanceData);
    } catch (err) {
      console.error('Erro ao analisar performance:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }, [params.dateFrom, params.dateTo, params.periodoComparacao]);

  return {
    data,
    loading,
    error,
    refetch: fetchAnalise
  };
};