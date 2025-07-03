import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, BarChart3, PieChart, TrendingUp } from "lucide-react";
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useRelatoriosAvancados } from "@/hooks/useRelatoriosAvancados";
import { GraficoVendasPeriodo } from "./GraficoVendasPeriodo";
import { TabelaProdutosPeriodo } from "./TabelaProdutosPeriodo";

export const RelatoriosAvancados = () => {
  const [dateFrom, setDateFrom] = useState<Date>(startOfMonth(new Date()));
  const [dateTo, setDateTo] = useState<Date>(endOfMonth(new Date()));
  const [tipoRelatorio, setTipoRelatorio] = useState<string>("vendas");
  
  const { data: relatorioData, loading, error, refetch } = useRelatoriosAvancados({
    dateFrom,
    dateTo,
    tipo: tipoRelatorio
  });

  const handlePresetSelect = (preset: string) => {
    const now = new Date();
    switch (preset) {
      case "hoje":
        setDateFrom(now);
        setDateTo(now);
        break;
      case "7dias":
        setDateFrom(subDays(now, 7));
        setDateTo(now);
        break;
      case "30dias":
        setDateFrom(subDays(now, 30));
        setDateTo(now);
        break;
      case "mes-atual":
        setDateFrom(startOfMonth(now));
        setDateTo(endOfMonth(now));
        break;
      case "mes-passado":
        const lastMonth = subMonths(now, 1);
        setDateFrom(startOfMonth(lastMonth));
        setDateTo(endOfMonth(lastMonth));
        break;
      case "ano-atual":
        setDateFrom(startOfYear(now));
        setDateTo(endOfYear(now));
        break;
    }
  };

  const handleGerarRelatorio = () => {
    refetch();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Relatórios Avançados por Período
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Período Rápido */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Período Rápido</label>
              <Select onValueChange={handlePresetSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hoje">Hoje</SelectItem>
                  <SelectItem value="7dias">Últimos 7 dias</SelectItem>
                  <SelectItem value="30dias">Últimos 30 dias</SelectItem>
                  <SelectItem value="mes-atual">Mês atual</SelectItem>
                  <SelectItem value="mes-passado">Mês passado</SelectItem>
                  <SelectItem value="ano-atual">Ano atual</SelectItem>
                </SelectContent>
              </Select>
            </div>

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

            {/* Tipo de Relatório */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo de Relatório</label>
              <Select value={tipoRelatorio} onValueChange={setTipoRelatorio}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vendas">Vendas</SelectItem>
                  <SelectItem value="produtos">Produtos</SelectItem>
                  <SelectItem value="clientes">Clientes</SelectItem>
                  <SelectItem value="categorias">Categorias</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button onClick={handleGerarRelatorio} disabled={loading} className="w-full md:w-auto">
            <TrendingUp className="mr-2 h-4 w-4" />
            {loading ? "Gerando..." : "Gerar Relatório"}
          </Button>
        </CardContent>
      </Card>

      {/* Resultados do Relatório */}
      {relatorioData && (
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Gráfico de Vendas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <GraficoVendasPeriodo data={relatorioData.graficos} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                Top Produtos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TabelaProdutosPeriodo data={relatorioData.produtos} />
            </CardContent>
          </Card>
        </div>
      )}

      {error && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">Erro ao carregar relatório: {error}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};