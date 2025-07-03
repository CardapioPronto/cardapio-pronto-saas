import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentRestaurantId } from "@/lib/supabase";
import { toast } from "sonner";

interface ExportParams {
  dateFrom: Date;
  dateTo: Date;
  formato: "excel" | "pdf";
  dados: string[];
}

export const useExportacaoDados = () => {
  const [loading, setLoading] = useState(false);

  const exportar = async (params: ExportParams) => {
    setLoading(true);
    
    try {
      const restaurantId = await getCurrentRestaurantId();
      if (!restaurantId) {
        throw new Error('Restaurant ID not found');
      }

      const { dateFrom, dateTo, formato, dados } = params;
      
      // Buscar dados baseado nos tipos selecionados
      const dadosParaExportar: any = {};

      // Vendas
      if (dados.includes('vendas')) {
        const { data: orders } = await supabase
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
            table_number,
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

        dadosParaExportar.vendas = orders;
      }

      // Produtos
      if (dados.includes('produtos')) {
        const { data: products } = await supabase
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
          .eq('restaurant_id', restaurantId);

        dadosParaExportar.produtos = products;
      }

      // Clientes (dados de pedidos)
      if (dados.includes('clientes')) {
        const { data: customers } = await supabase
          .from('orders')
          .select('customer_name, customer_phone, total, created_at')
          .eq('restaurant_id', restaurantId)
          .not('customer_name', 'is', null)
          .gte('created_at', dateFrom.toISOString())
          .lte('created_at', dateTo.toISOString());

        // Agrupar por cliente
        const clientesAgrupados = customers?.reduce((acc: any, order) => {
          const key = `${order.customer_name}-${order.customer_phone}`;
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
          return acc;
        }, {});

        dadosParaExportar.clientes = Object.values(clientesAgrupados || {});
      }

      // Categorias
      if (dados.includes('categorias')) {
        const { data: categories } = await supabase
          .from('categories')
          .select(`
            id,
            name,
            created_at,
            products (id, name, price)
          `)
          .eq('restaurant_id', restaurantId);

        dadosParaExportar.categorias = categories;
      }

      // Funcionários
      if (dados.includes('funcionarios')) {
        const { data: employees } = await supabase
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
          .eq('restaurant_id', restaurantId);

        dadosParaExportar.funcionarios = employees;
      }

      // Dashboard
      if (dados.includes('dashboard')) {
        const totalVendas = dadosParaExportar.vendas?.reduce((sum: number, order: any) => 
          sum + Number(order.total), 0) || 0;
        const totalPedidos = dadosParaExportar.vendas?.length || 0;
        const ticketMedio = totalPedidos > 0 ? totalVendas / totalPedidos : 0;

        dadosParaExportar.dashboard = {
          periodo: `${dateFrom.toLocaleDateString()} - ${dateTo.toLocaleDateString()}`,
          totalVendas,
          totalPedidos,
          ticketMedio,
          geradoEm: new Date().toLocaleString('pt-BR')
        };
      }

      // Gerar arquivo baseado no formato
      if (formato === 'excel') {
        await gerarExcel(dadosParaExportar, params);
      } else {
        await gerarPDF(dadosParaExportar, params);
      }

      toast.success(`Arquivo ${formato.toUpperCase()} exportado com sucesso!`);
    } catch (error) {
      console.error('Erro ao exportar dados:', error);
      toast.error('Erro ao exportar dados');
    } finally {
      setLoading(false);
    }
  };

  const gerarExcel = async (dados: any, params: ExportParams) => {
    // Implementar geração de Excel usando uma biblioteca como xlsx
    // Por agora, faremos download como JSON
    const dataStr = JSON.stringify(dados, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `relatorio_${params.dateFrom.toISOString().split('T')[0]}_${params.dateTo.toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const gerarPDF = async (dados: any, params: ExportParams) => {
    // Implementar geração de PDF usando uma biblioteca como jsPDF
    // Por agora, faremos download como JSON
    const dataStr = JSON.stringify(dados, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `relatorio_${params.dateFrom.toISOString().split('T')[0]}_${params.dateTo.toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return {
    exportar,
    loading
  };
};