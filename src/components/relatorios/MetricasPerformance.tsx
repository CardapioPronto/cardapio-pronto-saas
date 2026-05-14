import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { TrendingUp, TrendingDown } from "lucide-react";

interface MetricasPerformanceProps {
  data: Array<{
    nome: string;
    valor: number;
    formato: string;
  }>;
}

export const MetricasPerformance = ({ data }: MetricasPerformanceProps) => {
  const formatarValor = (valor: number, formato: string) => {
    switch (formato) {
      case 'moeda':
        return new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL'
        }).format(valor);
      case 'percentual':
        return `${valor.toFixed(1)}%`;
      case 'numero':
        return valor.toFixed(2);
      default:
        return valor.toString();
    }
  };

  if (data.length === 0) {
    return (
      <EmptyState
        icon={TrendingUp}
        title="Nenhuma métrica disponível"
        description="As métricas aparecerão depois que houver dados suficientes para o período selecionado."
        compact
      />
    );
  }

  return (
    <div className="space-y-4">
      {data.map((metrica, index) => (
        <Card key={index}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{metrica.nome}</p>
                <p className="text-2xl font-bold">
                  {formatarValor(metrica.valor, metrica.formato)}
                </p>
              </div>
              <div className="text-right">
                {metrica.formato === 'percentual' && (
                  <>
                    {metrica.valor >= 0 ? (
                      <TrendingUp className="h-4 w-4 text-green-600" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-600" />
                    )}
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
