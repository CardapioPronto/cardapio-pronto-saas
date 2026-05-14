import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Activity } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

interface GraficoPerformanceProps {
  data: Array<{
    data: string;
    faturamento: number;
    pedidos: number;
  }>;
}

export const GraficoPerformance = ({ data }: GraficoPerformanceProps) => {
  if (!data.length) {
    return (
      <EmptyState
        icon={Activity}
        title="Nenhum dado de performance"
        description="Gere a análise após um período com pedidos para comparar faturamento e volume."
        className="h-[300px]"
      />
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="data" 
          tickFormatter={(value) => new Date(value).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
        />
        <YAxis 
          yAxisId="left"
          tickFormatter={(value) => 
            new Intl.NumberFormat('pt-BR', { 
              style: 'currency', 
              currency: 'BRL',
              minimumFractionDigits: 0 
            }).format(value)
          }
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          allowDecimals={false}
          tickFormatter={(value) => Number(value).toLocaleString('pt-BR')}
        />
        <Tooltip 
          labelFormatter={(value) => new Date(value).toLocaleDateString('pt-BR')}
          formatter={(value: number, name: string) => [
            name === 'faturamento' 
              ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
              : value,
            name === 'faturamento' ? 'Faturamento' : 'Pedidos'
          ]}
        />
        <Legend formatter={(value) => value === 'faturamento' ? 'Faturamento' : 'Pedidos'} />
        <Line 
          type="monotone" 
          dataKey="faturamento" 
          yAxisId="left"
          stroke="hsl(var(--primary))" 
          strokeWidth={2}
          dot={false}
        />
        <Line 
          type="monotone" 
          dataKey="pedidos" 
          stroke="hsl(var(--foreground))" 
          strokeWidth={2}
          yAxisId="right"
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};
