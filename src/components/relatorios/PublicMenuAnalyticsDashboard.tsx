import { useMemo, useState } from "react";
import { format, subDays } from "date-fns";
import {
  AlertTriangle,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Loader2,
  Minus,
  MousePointerClick,
  Percent,
  RefreshCw,
  SearchX,
  ShoppingCart,
  Store,
  Tags,
  Target,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePublicMenuConversionFunnel } from "@/hooks/usePublicMenuConversionFunnel";

const number = new Intl.NumberFormat("pt-BR");

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const percent = (value: number) => `${Number(value || 0).toFixed(1).replace(".", ",")}%`;

type ComparisonTone = "positive" | "negative" | "neutral";

const sourceLabel = (source: string) => {
  if (!source || source === "direct") return "Direto";
  if (source.includes("instagram")) return "Instagram";
  if (source.includes("whatsapp") || source.includes("wa.me")) return "WhatsApp";
  if (source.includes("google")) return "Google";
  return source;
};

const productDiagnostic = (code: string) => {
  if (code === "clicked_not_added") {
    return {
      label: "Sem sacola",
      message: "Recebe clique, mas não vira item na sacola.",
      variant: "destructive" as const,
    };
  }

  if (code === "low_cart_conversion") {
    return {
      label: "Baixa sacola",
      message: "Clique alto com baixa intenção de compra.",
      variant: "secondary" as const,
    };
  }

  if (code === "low_order_conversion") {
    return {
      label: "Baixo pedido",
      message: "Entra na sacola, mas perde antes da conclusão.",
      variant: "secondary" as const,
    };
  }

  if (code === "interest_without_sale") {
    return {
      label: "Sem venda",
      message: "Tem interesse, mas não aparece em pedidos concluídos.",
      variant: "secondary" as const,
    };
  }

  return {
    label: "Saudável",
    message: "Sem gargalo relevante no período.",
    variant: "outline" as const,
  };
};

const categoryDiagnostic = (code: string) => {
  if (code === "interest_without_cart") {
    return {
      label: "Interesse sem sacola",
      message: "A categoria atrai cliques, mas não gera sacola.",
      variant: "destructive" as const,
    };
  }

  if (code === "low_cart_conversion") {
    return {
      label: "Baixa sacola",
      message: "A categoria precisa de oferta, foto ou descrição melhor.",
      variant: "secondary" as const,
    };
  }

  if (code === "low_order_conversion") {
    return {
      label: "Baixo pedido",
      message: "A categoria entra na sacola, mas perde na conclusão.",
      variant: "secondary" as const,
    };
  }

  return {
    label: "Saudável",
    message: "Sem gargalo relevante no período.",
    variant: "outline" as const,
  };
};

const comparisonTone = (
  current: number,
  previous: number,
  direction: "higher-is-better" | "lower-is-better" = "higher-is-better",
): ComparisonTone => {
  const diff = current - previous;
  if (Math.abs(diff) < 0.1) return "neutral";
  const improved = direction === "higher-is-better" ? diff > 0 : diff < 0;
  return improved ? "positive" : "negative";
};

const formatComparisonDelta = (current: number, previous: number, mode: "count" | "percent") => {
  const diff = current - previous;
  const prefix = diff > 0 ? "+" : "";
  if (mode === "count") return `${prefix}${number.format(diff)}`;
  return `${prefix}${diff.toFixed(1).replace(".", ",")} p.p.`;
};

export const PublicMenuAnalyticsDashboard = () => {
  const today = new Date();
  const [dateFrom, setDateFrom] = useState(subDays(today, 29));
  const [dateTo, setDateTo] = useState(today);
  const { data, comparison, loading, error, refetch } = usePublicMenuConversionFunnel({ dateFrom, dateTo });

  const summary = data?.summary;
  const steps = data?.steps ?? [];
  const sources = data?.sources ?? [];
  const products = data?.products ?? [];
  const searches = data?.searches ?? [];
  const categories = data?.categories ?? [];
  const hourly = data?.hourly ?? [];
  const previousSummary = comparison?.previous.summary;

  const comparisonMetrics = useMemo(() => {
    if (!summary || !previousSummary) return [];

    return [
      {
        label: "Visitas",
        current: number.format(summary.menuViews),
        previous: number.format(previousSummary.menuViews),
        delta: formatComparisonDelta(summary.menuViews, previousSummary.menuViews, "count"),
        tone: comparisonTone(summary.menuViews, previousSummary.menuViews),
      },
      {
        label: "Clique em produto",
        current: percent(summary.viewToProductRate),
        previous: percent(previousSummary.viewToProductRate),
        delta: formatComparisonDelta(summary.viewToProductRate, previousSummary.viewToProductRate, "percent"),
        tone: comparisonTone(summary.viewToProductRate, previousSummary.viewToProductRate),
      },
      {
        label: "Produto para sacola",
        current: percent(summary.productToCartRate),
        previous: percent(previousSummary.productToCartRate),
        delta: formatComparisonDelta(summary.productToCartRate, previousSummary.productToCartRate, "percent"),
        tone: comparisonTone(summary.productToCartRate, previousSummary.productToCartRate),
      },
      {
        label: "Checkout para pedido",
        current: percent(summary.checkoutToOrderRate),
        previous: percent(previousSummary.checkoutToOrderRate),
        delta: formatComparisonDelta(summary.checkoutToOrderRate, previousSummary.checkoutToOrderRate, "percent"),
        tone: comparisonTone(summary.checkoutToOrderRate, previousSummary.checkoutToOrderRate),
      },
      {
        label: "Conversão final",
        current: percent(summary.viewToOrderRate),
        previous: percent(previousSummary.viewToOrderRate),
        delta: formatComparisonDelta(summary.viewToOrderRate, previousSummary.viewToOrderRate, "percent"),
        tone: comparisonTone(summary.viewToOrderRate, previousSummary.viewToOrderRate),
      },
      {
        label: "Busca sem resultado",
        current: percent(summary.searchNoResultRate),
        previous: percent(previousSummary.searchNoResultRate),
        delta: formatComparisonDelta(summary.searchNoResultRate, previousSummary.searchNoResultRate, "percent"),
        tone: comparisonTone(summary.searchNoResultRate, previousSummary.searchNoResultRate, "lower-is-better"),
      },
    ];
  }, [previousSummary, summary]);

  const diagnostic = useMemo(() => {
    const visits = summary?.menuViews ?? 0;
    if (visits === 0) {
      return {
        status: "Sem dados",
        icon: BarChart3,
        message: "Ainda não há eventos do cardápio no período selecionado.",
        variant: "secondary" as const,
      };
    }

    if ((summary?.viewToProductRate ?? 0) < 35) {
      return {
        status: "Vitrine",
        icon: MousePointerClick,
        message: "Poucos visitantes estão abrindo produtos. Revise fotos, nomes e destaque das categorias.",
        variant: "destructive" as const,
      };
    }

    if ((summary?.searches ?? 0) >= 3 && (summary?.searchNoResultRate ?? 0) >= 30) {
      return {
        status: "Busca",
        icon: SearchX,
        message: "Muitas buscas não encontram produto. Pode existir demanda reprimida ou nome de produto difícil de achar.",
        variant: "secondary" as const,
      };
    }

    if ((summary?.productToCartRate ?? 0) < 35) {
      return {
        status: "Oferta",
        icon: ShoppingCart,
        message: "Há clique em produto, mas baixa adição à sacola. Avalie preço, descrição e disponibilidade.",
        variant: "secondary" as const,
      };
    }

    if ((summary?.checkoutToOrderRate ?? 0) < 60 && (summary?.checkoutStarted ?? 0) > 0) {
      return {
        status: "Checkout",
        icon: AlertTriangle,
        message: "Clientes chegam ao checkout, mas parte relevante não conclui. Verifique formas de pagamento e campos obrigatórios.",
        variant: "secondary" as const,
      };
    }

    return {
      status: "Saudável",
      icon: CheckCircle2,
      message: "O funil do cardápio está sem gargalo crítico no período.",
      variant: "default" as const,
    };
  }, [summary]);

  const handlePreset = (value: string) => {
    const now = new Date();
    if (value === "hoje") {
      setDateFrom(now);
      setDateTo(now);
      return;
    }
    if (value === "7dias") {
      setDateFrom(subDays(now, 6));
      setDateTo(now);
      return;
    }
    setDateFrom(subDays(now, 29));
    setDateTo(now);
  };

  const DiagnosticIcon = diagnostic.icon;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Funil do cardápio
          </CardTitle>
          <CardDescription>
            Conversão do canal próprio por etapa, origem e campanha.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-[1fr_1fr_1fr_auto] md:items-end">
            <div className="space-y-2">
              <Label>Período rápido</Label>
              <Select defaultValue="30dias" onValueChange={handlePreset}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hoje">Hoje</SelectItem>
                  <SelectItem value="7dias">Últimos 7 dias</SelectItem>
                  <SelectItem value="30dias">Últimos 30 dias</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="conversion-date-from">Data inicial</Label>
              <Input
                id="conversion-date-from"
                type="date"
                value={format(dateFrom, "yyyy-MM-dd")}
                onChange={(event) => event.target.value && setDateFrom(new Date(`${event.target.value}T12:00:00`))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="conversion-date-to">Data final</Label>
              <Input
                id="conversion-date-to"
                type="date"
                value={format(dateTo, "yyyy-MM-dd")}
                onChange={(event) => event.target.value && setDateTo(new Date(`${event.target.value}T12:00:00`))}
              />
            </div>
            <Button variant="outline" onClick={() => void refetch()} disabled={loading || dateFrom > dateTo}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Atualizar
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Alert>
        <DiagnosticIcon className="h-4 w-4" />
        <AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span>{diagnostic.message}</span>
          <Badge variant={diagnostic.variant}>{diagnostic.status}</Badge>
        </AlertDescription>
      </Alert>

      {comparison && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5" />
              Comparativo com período anterior
            </CardTitle>
            <CardDescription>
              Período comparado: {comparison.previousRange.label}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
              {comparisonMetrics.map((metric) => {
                const Icon = metric.tone === "positive"
                  ? TrendingUp
                  : metric.tone === "negative"
                    ? TrendingDown
                    : Minus;
                const badgeVariant = metric.tone === "negative"
                  ? "destructive"
                  : metric.tone === "positive"
                    ? "default"
                    : "outline";

                return (
                  <div key={metric.label} className="rounded-lg border border-border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-medium text-muted-foreground">{metric.label}</p>
                      <Badge variant={badgeVariant} className="gap-1">
                        <Icon className="h-3 w-3" />
                        {metric.delta}
                      </Badge>
                    </div>
                    <div className="mt-2 text-xl font-bold">{metric.current}</div>
                    <p className="text-xs text-muted-foreground">Anterior: {metric.previous}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Visualizações</CardTitle>
            <Store className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{number.format(summary?.menuViews ?? 0)}</div>
            <p className="text-xs text-muted-foreground">Sessões no cardápio</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clique em produto</CardTitle>
            <MousePointerClick className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{percent(summary?.viewToProductRate ?? 0)}</div>
            <p className="text-xs text-muted-foreground">{number.format(summary?.productClicks ?? 0)} sessões</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Adição à sacola</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{percent(summary?.productToCartRate ?? 0)}</div>
            <p className="text-xs text-muted-foreground">{number.format(summary?.addToCart ?? 0)} sessões</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Checkout</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{percent(summary?.cartToCheckoutRate ?? 0)}</div>
            <p className="text-xs text-muted-foreground">{number.format(summary?.checkoutStarted ?? 0)} iniciados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversão final</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{percent(summary?.viewToOrderRate ?? 0)}</div>
            <p className="text-xs text-muted-foreground">{number.format(summary?.ordersCompleted ?? 0)} pedidos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Busca sem resultado</CardTitle>
            <SearchX className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{percent(summary?.searchNoResultRate ?? 0)}</div>
            <p className="text-xs text-muted-foreground">
              {number.format(summary?.searchesWithoutResults ?? 0)} de {number.format(summary?.searches ?? 0)} buscas
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Etapas do funil</CardTitle>
            <CardDescription>Leitura por sessão no período selecionado.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {steps.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma etapa registrada no período.</p>
            ) : (
              steps.map((step) => (
                <div key={step.eventType} className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{step.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {step.position === 1
                          ? "Base do funil"
                          : `${percent(step.rateFromPrevious)} da etapa anterior`}
                      </p>
                    </div>
                    <div className="text-right text-sm font-semibold">
                      {number.format(step.total)}
                    </div>
                  </div>
                  <Progress value={Math.min(100, step.position === 1 ? 100 : step.rateFromPrevious)} className="h-2" />
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Origem e campanha</CardTitle>
            <CardDescription>Conversão agrupada pelo tráfego de entrada.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Origem</TableHead>
                  <TableHead className="text-right">Visitas</TableHead>
                  <TableHead className="text-right">Pedidos</TableHead>
                  <TableHead className="text-right">Conversão</TableHead>
                  <TableHead className="text-right">Receita</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sources.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                      Nenhuma origem registrada no período.
                    </TableCell>
                  </TableRow>
                ) : (
                  sources.map((source) => (
                    <TableRow key={source.source}>
                      <TableCell className="font-medium">{sourceLabel(source.source)}</TableCell>
                      <TableCell className="text-right">{number.format(source.menuViews)}</TableCell>
                      <TableCell className="text-right">{number.format(source.ordersCompleted)}</TableCell>
                      <TableCell className="text-right">{percent(source.conversionRate)}</TableCell>
                      <TableCell className="text-right">{money.format(source.revenue)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Diagnóstico por produto</CardTitle>
            <CardDescription>Produtos com maior chance de ajuste em foto, preço, descrição ou oferta.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-right">Cliques</TableHead>
                    <TableHead className="text-right">Sacola</TableHead>
                    <TableHead className="text-right">Pedidos</TableHead>
                    <TableHead className="text-right">Clique → sacola</TableHead>
                    <TableHead className="text-right">Receita</TableHead>
                    <TableHead>Diagnóstico</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
                        Nenhum produto com eventos suficientes no período.
                      </TableCell>
                    </TableRow>
                  ) : (
                    products.map((product) => {
                      const diagnosticItem = productDiagnostic(product.diagnosticCode);
                      return (
                        <TableRow key={product.productId}>
                          <TableCell className="min-w-44 font-medium">{product.productName}</TableCell>
                          <TableCell className="min-w-32 text-muted-foreground">
                            {product.categoryName || "-"}
                          </TableCell>
                          <TableCell className="text-right">{number.format(product.productClicks)}</TableCell>
                          <TableCell className="text-right">{number.format(product.addToCart)}</TableCell>
                          <TableCell className="text-right">{number.format(product.ordersCompleted)}</TableCell>
                          <TableCell className="text-right">{percent(product.clickToCartRate)}</TableCell>
                          <TableCell className="text-right">{money.format(product.revenue)}</TableCell>
                          <TableCell className="min-w-44">
                            <div className="space-y-1">
                              <Badge variant={diagnosticItem.variant}>{diagnosticItem.label}</Badge>
                              <p className="text-xs text-muted-foreground">{diagnosticItem.message}</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Busca do cardápio</CardTitle>
            <CardDescription>Termos que indicam demanda ou dificuldade de encontrar itens.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Termo</TableHead>
                  <TableHead className="text-right">Buscas</TableHead>
                  <TableHead className="text-right">Sem resultado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {searches.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="py-8 text-center text-sm text-muted-foreground">
                      Nenhuma busca registrada no período.
                    </TableCell>
                  </TableRow>
                ) : (
                  searches.map((search) => (
                    <TableRow key={search.query}>
                      <TableCell className="max-w-40 truncate font-medium">{search.query}</TableCell>
                      <TableCell className="text-right">{number.format(search.searches)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-col items-end">
                          <span>{number.format(search.noResults)}</span>
                          <span className="text-xs text-muted-foreground">{percent(search.noResultRate)}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tags className="h-5 w-5" />
              Categorias do cardápio
            </CardTitle>
            <CardDescription>Onde há atenção, intenção de compra e perda por seção do menu.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-right">Cliques</TableHead>
                    <TableHead className="text-right">Sacola</TableHead>
                    <TableHead className="text-right">Pedidos</TableHead>
                    <TableHead className="text-right">Clique → sacola</TableHead>
                    <TableHead className="text-right">Receita</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                        Nenhuma categoria com eventos no período.
                      </TableCell>
                    </TableRow>
                  ) : (
                    categories.map((category) => {
                      const diagnosticItem = categoryDiagnostic(category.diagnosticCode);
                      return (
                        <TableRow key={category.categoryId || category.categoryName}>
                          <TableCell className="min-w-36 font-medium">{category.categoryName}</TableCell>
                          <TableCell className="text-right">{number.format(category.productClicks)}</TableCell>
                          <TableCell className="text-right">{number.format(category.addToCart)}</TableCell>
                          <TableCell className="text-right">{number.format(category.ordersCompleted)}</TableCell>
                          <TableCell className="text-right">{percent(category.clickToCartRate)}</TableCell>
                          <TableCell className="text-right">{money.format(category.revenue)}</TableCell>
                          <TableCell className="min-w-44">
                            <div className="space-y-1">
                              <Badge variant={diagnosticItem.variant}>{diagnosticItem.label}</Badge>
                              <p className="text-xs text-muted-foreground">{diagnosticItem.message}</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock3 className="h-5 w-5" />
              Horários de conversão
            </CardTitle>
            <CardDescription>Janelas do dia com mais tráfego, pedidos e conversão no canal próprio.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hora</TableHead>
                  <TableHead className="text-right">Visitas</TableHead>
                  <TableHead className="text-right">Checkout</TableHead>
                  <TableHead className="text-right">Pedidos</TableHead>
                  <TableHead className="text-right">Conversão</TableHead>
                  <TableHead className="text-right">Receita</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {hourly.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                      Nenhum horário com eventos no período.
                    </TableCell>
                  </TableRow>
                ) : (
                  hourly.map((hour) => (
                    <TableRow key={hour.hour}>
                      <TableCell className="font-medium">{hour.label}</TableCell>
                      <TableCell className="text-right">{number.format(hour.menuViews)}</TableCell>
                      <TableCell className="text-right">{number.format(hour.checkoutStarted)}</TableCell>
                      <TableCell className="text-right">{number.format(hour.ordersCompleted)}</TableCell>
                      <TableCell className="text-right">{percent(hour.conversionRate)}</TableCell>
                      <TableCell className="text-right">{money.format(hour.revenue)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
