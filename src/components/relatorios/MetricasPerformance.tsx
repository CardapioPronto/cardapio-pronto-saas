import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";

interface MetricasPerformanceProps {
  data: any[];
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
      
      {data.length === 0 && (
        <p className="text-center text-muted-foreground">
          Nenhuma métrica disponível
        </p>
      )}
    </div>
  );
};