import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { BarChart3 } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

interface GraficoVendasPeriodoProps {
  data: Array<{
    data: string;
    vendas: number;
    pedidos: number;
  }>;
}

export const GraficoVendasPeriodo = ({ data }: GraficoVendasPeriodoProps) => {
  if (!data.length) {
    return (
      <EmptyState
        icon={BarChart3}
        title="Nenhuma venda no período"
        description="Ajuste o intervalo ou os filtros para visualizar o gráfico de vendas."
        className="h-[300px]"
      />
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="data" 
          tickFormatter={(value) => new Date(value).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
        />
        <YAxis 
          tickFormatter={(value) => 
            new Intl.NumberFormat('pt-BR', { 
              style: 'currency', 
              currency: 'BRL',
              minimumFractionDigits: 0 
            }).format(value)
          }
        />
        <Tooltip 
          labelFormatter={(value) => new Date(value).toLocaleDateString('pt-BR')}
          formatter={(value: number) => [
            new Intl.NumberFormat('pt-BR', { 
              style: 'currency', 
              currency: 'BRL' 
            }).format(value),
            'Vendas'
          ]}
        />
        <Bar dataKey="vendas" fill="hsl(var(--primary))" />
      </BarChart>
    </ResponsiveContainer>
  );
};
