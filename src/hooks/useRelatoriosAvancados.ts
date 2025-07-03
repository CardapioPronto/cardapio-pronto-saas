import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentRestaurantId } from "@/lib/supabase";

interface RelatoriosParams {
  dateFrom: Date;
  dateTo: Date;
  tipo: string;
}

interface RelatorioData {
  graficos: any[];
  produtos: any[];
  resumo: {
    totalVendas: number;
    totalPedidos: number;
    ticketMedio: number;
  };
}

export const useRelatoriosAvancados = (params: RelatoriosParams) => {
  const [data, setData] = useState<RelatorioData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRelatorio = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const restaurantId = await getCurrentRestaurantId();
      if (!restaurantId) {
        throw new Error('Restaurant ID not found');
      }

      const { dateFrom, dateTo, tipo } = params;
      
      // Buscar dados baseado no tipo de relatório
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id,
          total,
          created_at,
          customer_name,
          status,
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
        .lte('created_at', dateTo.toISOString())
        .order('created_at', { ascending: true });

      if (ordersError) throw ordersError;

      // Processar dados para gráficos
      const vendasPorDia = orders?.reduce((acc: any, order) => {
        const dia = new Date(order.created_at).toISOString().split('T')[0];
        if (!acc[dia]) {
          acc[dia] = { data: dia, vendas: 0, pedidos: 0 };
        }
        acc[dia].vendas += Number(order.total);
        acc[dia].pedidos += 1;
        return acc;
      }, {}) || {};

      const graficos = Object.values(vendasPorDia);

      // Processar produtos mais vendidos
      const produtosVendidos = orders?.reduce((acc: any, order) => {
        order.order_items?.forEach((item: any) => {
          if (!acc[item.product_id]) {
            acc[item.product_id] = {
              nome: item.product_name,
              quantidade: 0,
              receita: 0
            };
          }
          acc[item.product_id].quantidade += item.quantity;
          acc[item.product_id].receita += Number(item.price) * item.quantity;
        });
        return acc;
      }, {}) || {};

      const produtos = Object.values(produtosVendidos)
        .sort((a: any, b: any) => b.quantidade - a.quantidade)
        .slice(0, 10);

      // Calcular resumo
      const totalVendas = orders?.reduce((sum, order) => sum + Number(order.total), 0) || 0;
      const totalPedidos = orders?.length || 0;
      const ticketMedio = totalPedidos > 0 ? totalVendas / totalPedidos : 0;

      setData({
        graficos,
        produtos,
        resumo: {
          totalVendas,
          totalPedidos,
          ticketMedio
        }
      });
    } catch (err) {
      console.error('Erro ao buscar relatório:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }, [params.dateFrom, params.dateTo, params.tipo]);

  return {
    data,
    loading,
    error,
    refetch: fetchRelatorio
  };
};