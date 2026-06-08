import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  BrainCircuit,
  CalendarClock,
  CheckCircle2,
  History,
  Lightbulb,
  PackageSearch,
  RefreshCw,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Users,
  XCircle,
} from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  listOwnerCopilotDailySummaries,
  markOwnerCopilotRecommendation,
  CopilotRecommendationState,
  OwnerCopilotDailySummary,
  OwnerCopilotRecommendation,
  refreshOwnerCopilotDailySummary,
} from "@/services/ownerCopilotService";
import { cn } from "@/lib/utils";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);

const formatPercent = (value: number) =>
  `${value > 0 ? "+" : ""}${value.toFixed(1).replace(".", ",")}%`;

const priorityLabel: Record<string, string> = {
  high: "Alta",
  medium: "Média",
  low: "Baixa",
};

const typeIcon: Record<string, typeof Lightbulb> = {
  sales: TrendingDown,
  menu: PackageSearch,
  campaign: Users,
  operation: CalendarClock,
  growth: TrendingUp,
};

const priorityClass: Record<string, string> = {
  high: "border-red-200 bg-red-50 text-red-700",
  medium: "border-amber-200 bg-amber-50 text-amber-700",
  low: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

const CopilotSkeleton = () => (
  <div className="space-y-5">
    <Skeleton className="h-44 w-full" />
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {[...Array(4)].map((_, index) => (
        <Skeleton key={index} className="h-28 w-full" />
      ))}
    </div>
    <div className="grid gap-4 lg:grid-cols-2">
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  </div>
);

const RecommendationCard = ({
  recommendation,
  state,
  onMarkReviewed,
  onDismiss,
  isUpdating,
}: {
  recommendation: OwnerCopilotRecommendation;
  state?: CopilotRecommendationState | null;
  onMarkReviewed: () => void;
  onDismiss: () => void;
  isUpdating: boolean;
}) => {
  const Icon = typeIcon[recommendation.type] ?? Lightbulb;
  const isReviewed = state?.status === "reviewed";
  const isDismissed = state?.status === "dismissed";
  const isClosed = isReviewed || isDismissed;

  return (
    <article className={cn("rounded-md border bg-background p-5 shadow-sm", isDismissed && "opacity-70")}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground">{recommendation.title}</h3>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{recommendation.summary}</p>
          </div>
        </div>
        <Badge
          variant="outline"
          className={cn("shrink-0", priorityClass[recommendation.priority] ?? priorityClass.low)}
        >
          {isReviewed
            ? "Revisada"
            : isDismissed
              ? "Descartada"
              : priorityLabel[recommendation.priority] ?? recommendation.priority}
        </Badge>
      </div>

      <div className="mt-4 rounded-md bg-muted/45 p-3">
        <p className="text-xs font-semibold uppercase text-muted-foreground">Por que estou vendo isso</p>
        <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
          {recommendation.why.map((item) => (
            <li key={item} className="flex gap-2">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">{recommendation.guardrail}</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            variant={isReviewed ? "secondary" : "outline"}
            size="sm"
            className="shrink-0"
            onClick={onMarkReviewed}
            disabled={isClosed || isUpdating}
          >
            <CheckCircle2 className="mr-2 h-4 w-4" />
            {isReviewed ? "Revisada" : "Marcar revisada"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="shrink-0"
            onClick={onDismiss}
            disabled={isClosed || isUpdating}
          >
            <XCircle className="mr-2 h-4 w-4" />
            {isDismissed ? "Descartada" : "Descartar"}
          </Button>
          <Button asChild variant="outline" size="sm" className="shrink-0">
            <Link to={recommendation.actionHref}>
              {recommendation.actionLabel}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
};

const Copiloto = () => {
  const queryClient = useQueryClient();

  const { data: dailySummary, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["owner-copilot-daily-summary"],
    queryFn: () => refreshOwnerCopilotDailySummary(),
  });

  const { data: history } = useQuery({
    queryKey: ["owner-copilot-daily-history"],
    queryFn: () => listOwnerCopilotDailySummaries(7),
  });

  const recommendationStateMutation = useMutation({
    mutationFn: (params: {
      summaryDate: string;
      recommendationId: string;
      status: "reviewed" | "dismissed";
    }) =>
      markOwnerCopilotRecommendation({
        summaryDate: params.summaryDate,
        recommendationId: params.recommendationId,
        status: params.status,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["owner-copilot-daily-summary"] });
      await queryClient.invalidateQueries({ queryKey: ["owner-copilot-daily-history"] });
    },
  });
  const data = dailySummary?.insights;

  if (isLoading) {
    return (
      <DashboardLayout title="Copiloto">
        <CopilotSkeleton />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Copiloto">
      <div className="space-y-5">
        <section className="rounded-md border bg-gradient-to-br from-primary/10 via-background to-emerald-50 p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-medium text-primary">
                <BrainCircuit className="h-4 w-4" />
                Copiloto em modo recomendação
              </div>
              <h1 className="text-2xl font-bold text-foreground md:text-3xl">
                Recomendações práticas para vender melhor hoje
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground md:text-base">
                O Pubfy analisa vendas, produtos e CRM para sugerir próximos passos. As ações continuam sob controle do dono.
              </p>
            </div>
            <Button onClick={() => refetch()} disabled={isFetching} variant="outline">
              <RefreshCw className={cn("mr-2 h-4 w-4", isFetching && "animate-spin")} />
              Atualizar resumo diário
            </Button>
          </div>
        </section>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>
              {error instanceof Error ? error.message : "Não foi possível carregar o copiloto."}
            </AlertDescription>
          </Alert>
        )}

        {data && (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Pedidos hoje</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data.summary.todayOrders.toLocaleString("pt-BR")}</div>
                  <p className="text-xs text-muted-foreground">{formatCurrency(data.summary.todayRevenue)} em vendas</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Últimos 7 dias</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(data.summary.last7Revenue)}</div>
                  <p className="text-xs text-muted-foreground">{data.summary.last7Orders.toLocaleString("pt-BR")} pedidos finalizados</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Variação semanal</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={cn(
                    "text-2xl font-bold",
                    data.summary.salesChangePercent < 0 ? "text-red-600" : "text-emerald-700",
                  )}>
                    {formatPercent(data.summary.salesChangePercent)}
                  </div>
                  <p className="text-xs text-muted-foreground">Comparado aos 7 dias anteriores</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Clientes inativos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data.summary.inactiveCustomers.toLocaleString("pt-BR")}</div>
                  <p className="text-xs text-muted-foreground">Com opt-in para campanha</p>
                </CardContent>
              </Card>
            </div>

            <Alert>
              <ShieldCheck className="h-4 w-4" />
              <AlertDescription>{data.disclaimer}</AlertDescription>
            </Alert>

            <section className="space-y-3">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Recomendações</h2>
                  <p className="text-sm text-muted-foreground">
                    Resumo de {new Date(`${dailySummary.summaryDate}T12:00:00`).toLocaleDateString("pt-BR")} gerado em{" "}
                    {new Date(dailySummary.generatedAt).toLocaleString("pt-BR")}
                  </p>
                </div>
                <Badge variant="secondary">
                  {data.recommendations.length} sugestão{data.recommendations.length === 1 ? "" : "es"}
                </Badge>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                {data.recommendations.map((recommendation) => (
                  <RecommendationCard
                    key={recommendation.id}
                    recommendation={recommendation}
                    state={dailySummary.recommendationStates[recommendation.id]}
                    onMarkReviewed={() => recommendationStateMutation.mutate({
                      summaryDate: dailySummary.summaryDate,
                      recommendationId: recommendation.id,
                      status: "reviewed",
                    })}
                    onDismiss={() => recommendationStateMutation.mutate({
                      summaryDate: dailySummary.summaryDate,
                      recommendationId: recommendation.id,
                      status: "dismissed",
                    })}
                    isUpdating={recommendationStateMutation.isPending}
                  />
                ))}
              </div>
            </section>

            <DailySummaryHistory summaries={history ?? []} currentSummaryId={dailySummary.id} />
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

const DailySummaryHistory = ({
  summaries,
  currentSummaryId,
}: {
  summaries: OwnerCopilotDailySummary[];
  currentSummaryId: string;
}) => {
  if (!summaries.length) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="h-5 w-5" />
          Histórico recente do copiloto
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {summaries.map((summary) => {
            const reviewedCount = Object.values(summary.recommendationStates)
              .filter((state) => state.status === "reviewed").length;
            const isCurrent = summary.id === currentSummaryId;

            return (
              <div key={summary.id} className={cn(
                "rounded-md border p-4",
                isCurrent && "border-primary/40 bg-primary/5",
              )}>
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">
                    {new Date(`${summary.summaryDate}T12:00:00`).toLocaleDateString("pt-BR")}
                  </p>
                  {isCurrent && <Badge variant="secondary">Hoje</Badge>}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Vendas 7 dias</p>
                    <p className="font-semibold">{formatCurrency(summary.insights.summary.last7Revenue)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Sugestões</p>
                    <p className="font-semibold">
                      {reviewedCount}/{summary.insights.recommendations.length} revisadas
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default Copiloto;
