import { lazy, Suspense, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  CalendarIcon,
  BarChart3,
  PieChart,
  TrendingUp,
  AlertCircle,
  Receipt,
  DollarSign,
  Ban,
  FileSpreadsheet,
  FileText,
  Store,
  ShoppingBag,
} from "lucide-react";
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useRelatoriosAvancados } from "@/hooks/useRelatoriosAvancados";
import { useExportacaoDados } from "@/hooks/useExportacaoDados";
import { TabelaProdutosPeriodo } from "./TabelaProdutosPeriodo";

const GraficoVendasPeriodo = lazy(() =>
  import("./GraficoVendasPeriodo").then((module) => ({
    default: module.GraficoVendasPeriodo,
  })),
);

const ChartFallback = () => (
  <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
    Carregando gráfico...
  </div>
);

export const RelatoriosAvancados = () => {
  const [dateFrom, setDateFrom] = useState<Date>(startOfMonth(new Date()));
  const [dateTo, setDateTo] = useState<Date>(endOfMonth(new Date()));
  const [tipoRelatorio, setTipoRelatorio] = useState<string>("vendas");
  const [statusFiltro, setStatusFiltro] = useState<string>("todos");
  const [canalFiltro, setCanalFiltro] = useState<string>("todos");
  
  const { data: relatorioData, loading, error, refetch, isLargePeriod } = useRelatoriosAvancados({
    dateFrom,
    dateTo,
    tipo: tipoRelatorio,
    status: statusFiltro,
    canal: canalFiltro
  });
  const { exportar, loading: exportando } = useExportacaoDados();

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
      case "mes-passado": {
        const lastMonth = subMonths(now, 1);
        setDateFrom(startOfMonth(lastMonth));
        setDateTo(endOfMonth(lastMonth));
        break;
      }
      case "ano-atual":
        setDateFrom(startOfYear(now));
        setDateTo(endOfYear(now));
        break;
    }
  };

  const handleGerarRelatorio = () => {
    refetch();
  };

  const handleExportar = async (formato: "csv" | "pdf") => {
    await exportar({
      dateFrom,
      dateTo,
      formato,
      dados: ["dashboard", "vendas", "produtos"],
      status: statusFiltro,
      canal: canalFiltro,
      titulo: "Relatório Avançado"
    });
  };

  const periodoInvalido = dateFrom > dateTo;

  const formatarMoeda = (valor: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);

  const formatarPercentual = (valor: number) =>
    `${valor.toFixed(1).replace(".", ",")}%`;

  const canaisResumo =
    relatorioData?.canais.filter((canal) => canal.grupo === "marketplace" || canal.grupo === "proprio") ?? [];
  const canaisDetalhe =
    relatorioData?.canais.filter((canal) => canal.grupo === "detalhe_proprio" && canal.pedidos > 0) ?? [];
  const canalIfood = canaisResumo.find((canal) => canal.codigo === "ifood");
  const canalProprio = canaisResumo.find((canal) => canal.codigo === "proprio");

  return (
    <div className="space-y-6">
      {isLargePeriod && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Período longo: a agregação pode levar alguns segundos. Considere intervalos menores para resposta mais rápida.
          </AlertDescription>
        </Alert>
      )}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Relatórios Avançados por Período
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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

            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={statusFiltro} onValueChange={setStatusFiltro}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="finalizado">Finalizados</SelectItem>
                  <SelectItem value="pendente">Pendentes</SelectItem>
                  <SelectItem value="preparo">Em preparo</SelectItem>
                  <SelectItem value="em-andamento">Em andamento</SelectItem>
                  <SelectItem value="cancelado">Cancelados</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Origem / Atendimento</label>
              <Select value={canalFiltro} onValueChange={setCanalFiltro}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas</SelectItem>
                  <SelectItem value="source:app">PDV</SelectItem>
                  <SelectItem value="source:cardapio">Cardápio digital</SelectItem>
                  <SelectItem value="source:ifood">iFood</SelectItem>
                  <SelectItem value="tipo:mesa">Mesa</SelectItem>
                  <SelectItem value="tipo:balcao">Balcão</SelectItem>
                  <SelectItem value="tipo:delivery">Delivery</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {periodoInvalido && (
            <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              A data inicial deve ser anterior ou igual à data final.
            </div>
          )}

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button onClick={handleGerarRelatorio} disabled={loading || periodoInvalido} className="w-full sm:w-auto">
              <TrendingUp className="mr-2 h-4 w-4" />
              {loading ? "Gerando..." : "Gerar Relatório"}
            </Button>
            <Button variant="outline" onClick={() => handleExportar("csv")} disabled={exportando || periodoInvalido} className="w-full sm:w-auto">
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              CSV
            </Button>
            <Button variant="outline" onClick={() => handleExportar("pdf")} disabled={exportando || periodoInvalido} className="w-full sm:w-auto">
              <FileText className="mr-2 h-4 w-4" />
              PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Resultados do Relatório */}
      {relatorioData && (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Faturamento</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatarMoeda(relatorioData.resumo.totalVendas)}</div>
                <p className="text-xs text-muted-foreground">Apenas pedidos finalizados entram nesse total</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pedidos</CardTitle>
                <Receipt className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{relatorioData.resumo.totalPedidos.toLocaleString('pt-BR')}</div>
                <p className="text-xs text-muted-foreground">{relatorioData.resumo.pedidosFaturados.toLocaleString('pt-BR')} finalizados</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatarMoeda(relatorioData.resumo.ticketMedio)}</div>
                <p className="text-xs text-muted-foreground">Faturamento dividido por pedidos válidos</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cancelados</CardTitle>
                <Ban className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{relatorioData.resumo.pedidosCancelados.toLocaleString('pt-BR')}</div>
                <p className="text-xs text-muted-foreground">{formatarMoeda(relatorioData.resumo.faturamentoCancelado)} desconsiderados</p>
              </CardContent>
            </Card>
          </div>

          {(canalIfood || canalProprio) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Store className="h-5 w-5" />
                  iFood x canal próprio
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  {[canalIfood, canalProprio].filter(Boolean).map((canal) => {
                    const participacao = Math.min(100, Math.max(0, canal.participacaoFaturamento));
                    const isMarketplace = canal.grupo === "marketplace";

                    return (
                      <div key={canal.codigo} className="rounded-md border bg-background p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium">{canal.nome}</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {canal.pedidos.toLocaleString("pt-BR")} pedidos finalizados
                            </p>
                          </div>
                          {isMarketplace ? (
                            <ShoppingBag className="h-4 w-4 shrink-0 text-muted-foreground" />
                          ) : (
                            <Store className="h-4 w-4 shrink-0 text-muted-foreground" />
                          )}
                        </div>
                        <div className="mt-4">
                          <div className="text-2xl font-bold">{formatarMoeda(canal.faturamento)}</div>
                          <p className="text-xs text-muted-foreground">
                            Ticket médio {formatarMoeda(canal.ticketMedio)}
                          </p>
                        </div>
                        <div className="mt-4 h-2 rounded-full bg-muted">
                          <div
                            className={cn(
                              "h-2 rounded-full",
                              isMarketplace ? "bg-amber-500" : "bg-emerald-600",
                            )}
                            style={{ width: `${participacao}%` }}
                          />
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {formatarPercentual(canal.participacaoFaturamento)} do faturamento finalizado do período
                        </p>
                      </div>
                    );
                  })}
                </div>

                {canaisDetalhe.length > 0 && (
                  <div className="rounded-md border">
                    <div className="grid gap-2 border-b bg-muted/40 px-4 py-3 text-xs font-medium text-muted-foreground md:grid-cols-[1.2fr_0.7fr_0.8fr_0.7fr]">
                      <span>Canal próprio</span>
                      <span>Pedidos</span>
                      <span>Faturamento</span>
                      <span>Participação</span>
                    </div>
                    {canaisDetalhe.map((canal) => (
                      <div
                        key={canal.codigo}
                        className="grid gap-1 border-b px-4 py-3 text-sm last:border-b-0 md:grid-cols-[1.2fr_0.7fr_0.8fr_0.7fr]"
                      >
                        <span className="font-medium">{canal.nome}</span>
                        <span>{canal.pedidos.toLocaleString("pt-BR")}</span>
                        <span>{formatarMoeda(canal.faturamento)}</span>
                        <span>{formatarPercentual(canal.participacaoFaturamento)}</span>
                      </div>
                    ))}
                  </div>
                )}

                <p className="text-xs text-muted-foreground">
                  O comparativo considera pedidos finalizados no período e ignora o filtro de origem para mostrar a visão
                  completa entre marketplace e venda direta.
                </p>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Gráfico de Vendas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Suspense fallback={<ChartFallback />}>
                  <GraficoVendasPeriodo data={relatorioData.graficos} />
                </Suspense>
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
