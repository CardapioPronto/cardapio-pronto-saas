import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentRestaurantId } from "@/lib/supabase";
import { addDays, endOfDay, startOfDay } from "date-fns";

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

type ProdutoRelatorioAggregate = Omit<ProdutoRelatorio, "pedidos"> & {
  pedidos: Set<string>;
};

type OrderItemRelatorio = {
  id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  price: number;
};

type OrderRelatorio = {
  id: string;
  total: number;
  created_at: string;
  customer_name: string | null;
  status: string;
  source: string | null;
  order_type: string;
  order_items?: OrderItemRelatorio[] | null;
};

const FATURAMENTO_STATUS = "finalizado";

const aplicarFiltroCanal = <T extends { eq: (column: string, value: string) => T }>(query: T, canal?: string) => {
  if (!canal || canal === "todos") return query;
  const [tipoFiltro, valor] = canal.split(":");
  if (!valor) return query;
  return query.eq(tipoFiltro === "tipo" ? "order_type" : "source", valor);
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
    canal = "todos"
  } = params;

  const fetchRelatorio = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const restaurantId = await getCurrentRestaurantId();
      if (!restaurantId) {
        throw new Error('Restaurant ID not found');
      }

      const dateFrom = startOfDay(paramsDateFrom);
      const dateTo = endOfDay(paramsDateTo);

      if (dateFrom > dateTo) {
        throw new Error('A data inicial não pode ser maior que a data final.');
      }
      
      // Buscar dados baseado no tipo de relatório
      let ordersQuery = supabase
        .from('orders')
        .select(`
          id,
          total,
          created_at,
          customer_name,
          status,
          source,
          order_type,
          order_items (
            id,
            product_name,
            quantity,
            price,
            product_id
          )
        `)
        .eq('restaurant_id', restaurantId)
        .gte('created_at', dateFrom.toISOString())
        .lte('created_at', dateTo.toISOString());

      if (status !== "todos") {
        ordersQuery = ordersQuery.eq("status", status);
      }

      ordersQuery = aplicarFiltroCanal(ordersQuery, canal);

      const { data: orders, error: ordersError } = await ordersQuery.order('created_at', { ascending: true });

      if (ordersError) throw ordersError;

      // Processar dados para gráficos
      const rows = (orders || []) as OrderRelatorio[];
      const pedidosFaturaveis = rows.filter((order) => order.status === FATURAMENTO_STATUS);
      const vendasPorDia = pedidosFaturaveis.reduce<Record<string, GraficoVendasItem>>((acc, order) => {
        const dia = new Date(order.created_at).toISOString().split('T')[0];
        if (!acc[dia]) {
          acc[dia] = { data: dia, vendas: 0, pedidos: 0 };
        }
        acc[dia].vendas += Number(order.total);
        acc[dia].pedidos += 1;
        return acc;
      }, {}) || {};

      const graficos: GraficoVendasItem[] = [];
      for (let dia = startOfDay(dateFrom); dia <= dateTo; dia = addDays(dia, 1)) {
        const chave = dia.toISOString().split('T')[0];
        graficos.push(vendasPorDia[chave] || { data: chave, vendas: 0, pedidos: 0 });
      }

      // Processar produtos mais vendidos
      const produtosVendidos = pedidosFaturaveis.reduce<Record<string, ProdutoRelatorioAggregate>>((acc, order) => {
        order.order_items?.forEach((item) => {
          const key = item.product_id || item.product_name;
          if (!acc[key]) {
            acc[key] = {
              nome: item.product_name,
              quantidade: 0,
              receita: 0,
              pedidos: new Set<string>()
            };
          }
          acc[key].quantidade += item.quantity;
          acc[key].receita += Number(item.price) * item.quantity;
          acc[key].pedidos.add(order.id);
        });
        return acc;
      }, {}) || {};

      const produtos = Object.values(produtosVendidos)
        .map((produto) => ({
          ...produto,
          pedidos: produto.pedidos.size
        }))
        .sort((a, b) => tipo === 'produtos' ? b.quantidade - a.quantidade : b.receita - a.receita)
        .slice(0, 10);

      // Calcular resumo
      const totalVendas = pedidosFaturaveis.reduce((sum, order) => sum + Number(order.total), 0) || 0;
      const totalPedidos = rows.length || 0;
      const pedidosFaturados = pedidosFaturaveis.length || 0;
      const ticketMedio = pedidosFaturados > 0 ? totalVendas / pedidosFaturados : 0;
      const pedidosCancelados = rows.filter((order) => order.status === 'cancelado').length || 0;
      const faturamentoCancelado = rows
        ?.filter((order) => order.status === 'cancelado')
        .reduce((sum, order) => sum + Number(order.total), 0) || 0;

      const statusMap = rows.reduce<Record<string, { status: string; pedidos: number; total: number }>>((acc, order) => {
        const status = order.status || 'sem-status';
        if (!acc[status]) {
          acc[status] = { status, pedidos: 0, total: 0 };
        }
        acc[status].pedidos += 1;
        acc[status].total += Number(order.total);
        return acc;
      }, {}) || {};

      setData({
        graficos,
        produtos,
        resumo: {
          totalVendas,
          totalPedidos,
          pedidosFaturados,
          ticketMedio,
          pedidosCancelados,
          faturamentoCancelado
        },
        status: Object.values(statusMap),
        filtrosAplicados: {
          regraFaturamento: "Apenas pedidos finalizados entram em faturamento, ticket médio e gráficos de venda.",
          status,
          canal
        }
      });
    } catch (err) {
      console.error('Erro ao buscar relatório:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }, [paramsDateFrom, paramsDateTo, tipo, status, canal]);

  return {
    data,
    loading,
    error,
    refetch: fetchRelatorio
  };
};
