import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface GraficoPerformanceProps {
  data: any[];
}

export const GraficoPerformance = ({ data }: GraficoPerformanceProps) => {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
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
          formatter={(value: number, name: string) => [
            name === 'faturamento' 
              ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
              : value,
            name === 'faturamento' ? 'Faturamento' : 'Pedidos'
          ]}
        />
        <Line 
          type="monotone" 
          dataKey="faturamento" 
          stroke="hsl(var(--primary))" 
          strokeWidth={2}
        />
        <Line 
          type="monotone" 
          dataKey="pedidos" 
          stroke="hsl(var(--secondary))" 
          strokeWidth={2}
          yAxisId="right"
        />
      </LineChart>
    </ResponsiveContainer>
  );
};