import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, TrendingUp, TrendingDown, Activity, Target } from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useAnalisePerformance } from "@/hooks/useAnalisePerformance";
import { GraficoPerformance } from "./GraficoPerformance";
import { MetricasPerformance } from "./MetricasPerformance";

export const AnalisePerformance = () => {
  const [dateFrom, setDateFrom] = useState<Date>(startOfMonth(new Date()));
  const [dateTo, setDateTo] = useState<Date>(endOfMonth(new Date()));
  const [periodoComparacao, setPeriodoComparacao] = useState<string>("mes-anterior");
  
  const { data: performanceData, loading, error, refetch } = useAnalisePerformance({
    dateFrom,
    dateTo,
    periodoComparacao
  });

  const handleAnalisar = () => {
    refetch();
  };

  const indicadores = [
    {
      titulo: "Faturamento",
      valor: performanceData?.faturamento?.atual || 0,
      variacao: performanceData?.faturamento?.variacao || 0,
      formato: "moeda"
    },
    {
      titulo: "Pedidos",
      valor: performanceData?.pedidos?.atual || 0,
      variacao: performanceData?.pedidos?.variacao || 0,
      formato: "numero"
    },
    {
      titulo: "Ticket Médio",
      valor: performanceData?.ticketMedio?.atual || 0,
      variacao: performanceData?.ticketMedio?.variacao || 0,
      formato: "moeda"
    },
    {
      titulo: "Produtos Vendidos",
      valor: performanceData?.produtosVendidos?.atual || 0,
      variacao: performanceData?.produtosVendidos?.variacao || 0,
      formato: "numero"
    }
  ];

  const formatarValor = (valor: number, formato: string) => {
    if (formato === "moeda") {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(valor);
    }
    return valor.toLocaleString('pt-BR');
  };

  const formatarVariacao = (variacao: number) => {
    const sinal = variacao >= 0 ? "+" : "";
    return `${sinal}${variacao.toFixed(1)}%`;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Análise de Performance por Período
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {/* Data Inicial */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Data Inicial</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateFrom && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFrom ? format(dateFrom, "PPP", { locale: ptBR }) : "Selecione"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dateFrom}
                    onSelect={(date) => date && setDateFrom(date)}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Data Final */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Data Final</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateTo && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateTo ? format(dateTo, "PPP", { locale: ptBR }) : "Selecione"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dateTo}
                    onSelect={(date) => date && setDateTo(date)}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Período de Comparação */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Comparar com</label>
              <Select value={periodoComparacao} onValueChange={setPeriodoComparacao}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mes-anterior">Mês Anterior</SelectItem>
                  <SelectItem value="ano-anterior">Mesmo período do ano anterior</SelectItem>
                  <SelectItem value="media-3meses">Média dos últimos 3 meses</SelectItem>
                  <SelectItem value="media-6meses">Média dos últimos 6 meses</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button onClick={handleAnalisar} disabled={loading} className="w-full md:w-auto">
            <Target className="mr-2 h-4 w-4" />
            {loading ? "Analisando..." : "Analisar Performance"}
          </Button>
        </CardContent>
      </Card>

      {/* Indicadores de Performance */}
      {performanceData && (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {indicadores.map((indicador) => (
              <Card key={indicador.titulo}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {indicador.titulo}
                  </CardTitle>
                  {indicador.variacao >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  )}
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatarValor(indicador.valor, indicador.formato)}
                  </div>
                  <p className={cn(
                    "text-xs",
                    indicador.variacao >= 0 ? "text-green-600" : "text-red-600"
                  )}>
                    {formatarVariacao(indicador.variacao)} em relação ao período anterior
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Evolução da Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <GraficoPerformance data={performanceData.evolucao} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Métricas Detalhadas</CardTitle>
              </CardHeader>
              <CardContent>
                <MetricasPerformance data={performanceData.metricas} />
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {error && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">Erro ao carregar análise: {error}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};