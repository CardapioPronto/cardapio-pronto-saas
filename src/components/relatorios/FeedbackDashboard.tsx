import { useMemo, useState } from "react";
import { toast } from "@/components/ui/sonner-toast";
import { orderFeedbackService } from "@/services/orderFeedbackService";
import { format, subDays } from "date-fns";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  MessageSquareText,
  RefreshCw,
  SmilePlus,
  Star,
  TrendingUp,
  Users,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useFeedbackDashboard } from "@/hooks/useFeedbackDashboard";

const number = new Intl.NumberFormat("pt-BR");

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const formatDateTime = (value: string) => {
  if (!value) return "-";
  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const ratingLabel = (rating: number) => {
  if (rating >= 9) return "Promotor";
  if (rating >= 7) return "Neutro";
  return "Detrator";
};

type QualityAlert = {
  severity: "critical" | "attention" | "info";
  message: string;
};

export const FeedbackDashboard = () => {
  const today = new Date();
  const [dateFrom, setDateFrom] = useState(subDays(today, 29));
  const [dateTo, setDateTo] = useState(today);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const { data, loading, error, refetch } = useFeedbackDashboard({ dateFrom, dateTo });

  const summary = data?.summary;
  const recent = data?.recent ?? [];
  const feedbackHealth = useMemo(() => {
    const total = summary?.total ?? 0;
    const detractors = summary?.detractors ?? 0;
    const openLowRating = summary?.openLowRating ?? 0;
    const contactRequests = summary?.contactRequests ?? 0;
    const nps = summary?.nps ?? 0;
    const averageRating = summary?.averageRating ?? 0;
    const detractorRate = total > 0 ? Math.round((detractors / total) * 100) : 0;
    const contactRequestRate = total > 0 ? Math.round((contactRequests / total) * 100) : 0;
    const alerts: QualityAlert[] = [];

    if (total === 0) {
      alerts.push({
        severity: "info",
        message: "Ainda não há avaliações no período para medir satisfação.",
      });
    }

    if (openLowRating > 0) {
      alerts.push({
        severity: "critical",
        message: `${number.format(openLowRating)} avaliação(ões) detratora(s) ainda precisam de retorno.`,
      });
    }

    if (nps < 0 && total > 0) {
      alerts.push({
        severity: "critical",
        message: "NPS negativo indica risco real de perda de recompra.",
      });
    } else if (nps < 50 && total >= 5) {
      alerts.push({
        severity: "attention",
        message: "NPS abaixo de 50 pede investigação dos principais atritos.",
      });
    }

    if (averageRating > 0 && averageRating < 7) {
      alerts.push({
        severity: "attention",
        message: "Nota média abaixo de 7 sugere queda perceptível na experiência.",
      });
    }

    if (detractorRate >= 30 && total >= 5) {
      alerts.push({
        severity: "attention",
        message: `${number.format(detractorRate)}% das respostas foram detratoras.`,
      });
    }

    if (contactRequests > 0) {
      alerts.push({
        severity: "info",
        message: `${number.format(contactRequests)} cliente(s) pediram contato após avaliar.`,
      });
    }

    const criticalAlerts = alerts.filter((alert) => alert.severity === "critical").length;
    const status = total === 0
      ? "Sem dados"
      : criticalAlerts > 0
        ? "Crítico"
        : alerts.some((alert) => alert.severity === "attention")
          ? "Atenção"
          : "Saudável";
    const badgeVariant = status === "Crítico" ? "destructive" : status === "Atenção" ? "secondary" : "default";

    return {
      alerts,
      status,
      badgeVariant,
      detractorRate,
      contactRequestRate,
    };
  }, [summary]);

  const handleResolve = async (feedbackId: string) => {
    setResolvingId(feedbackId);
    try {
      await orderFeedbackService.resolveFeedback(feedbackId);
      toast.success("Avaliação marcada como resolvida.");
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível resolver a avaliação.");
    } finally {
      setResolvingId(null);
    }
  };

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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            Avaliações e NPS
          </CardTitle>
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
              <Label htmlFor="feedback-date-from">Data inicial</Label>
              <Input
                id="feedback-date-from"
                type="date"
                value={format(dateFrom, "yyyy-MM-dd")}
                onChange={(event) => event.target.value && setDateFrom(new Date(`${event.target.value}T12:00:00`))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="feedback-date-to">Data final</Label>
              <Input
                id="feedback-date-to"
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

      {(summary?.openLowRating ?? 0) > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Existem {number.format(summary?.openLowRating ?? 0)} avaliações baixas sem resolução no período.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">NPS</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{number.format(summary?.nps ?? 0)}</div>
            <p className="text-xs text-muted-foreground">Promotores menos detratores</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Nota média</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Number(summary?.averageRating ?? 0).toFixed(1)}/10</div>
            <p className="text-xs text-muted-foreground">{number.format(summary?.total ?? 0)} respostas no período</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Promotores</CardTitle>
            <SmilePlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{number.format(summary?.promoters ?? 0)}</div>
            <p className="text-xs text-muted-foreground">{number.format(summary?.passives ?? 0)} neutros</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Atenção</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{number.format(summary?.detractors ?? 0)}</div>
            <p className="text-xs text-muted-foreground">{number.format(summary?.contactRequests ?? 0)} pediram contato</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="h-4 w-4" />
              Diagnóstico de qualidade
            </CardTitle>
            <CardDescription>
              Leitura operacional para priorizar recuperação de clientes insatisfeitos.
            </CardDescription>
          </div>
          <Badge variant={feedbackHealth.badgeVariant}>{feedbackHealth.status}</Badge>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border p-3">
              <p className="text-sm text-muted-foreground">Detratores</p>
              <p className="mt-2 text-xl font-semibold">{number.format(feedbackHealth.detractorRate)}%</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-sm text-muted-foreground">Pedidos de contato</p>
              <p className="mt-2 text-xl font-semibold">{number.format(feedbackHealth.contactRequestRate)}%</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-sm text-muted-foreground">Pendências críticas</p>
              <p className="mt-2 text-xl font-semibold">{number.format(summary?.openLowRating ?? 0)}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-sm text-muted-foreground">Volume analisado</p>
              <p className="mt-2 text-xl font-semibold">{number.format(summary?.total ?? 0)}</p>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium">Prioridades</p>
            {feedbackHealth.alerts.length === 0 ? (
              <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                Satisfação saudável no período selecionado.
              </div>
            ) : (
              <div className="space-y-2">
                {feedbackHealth.alerts.map((alert) => (
                  <div
                    key={alert.message}
                    className={
                      alert.severity === "critical"
                        ? "flex gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900"
                        : alert.severity === "attention"
                          ? "flex gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
                          : "flex gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900"
                    }
                  >
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{alert.message}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquareText className="h-4 w-4" />
            Avaliações recentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recent.length > 0 ? (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Nota</TableHead>
                    <TableHead>Comentário</TableHead>
                    <TableHead className="text-right">Pedido</TableHead>
                    <TableHead className="text-right">Data</TableHead>
                    <TableHead className="text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recent.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="font-medium">{item.customerName || "Cliente"}</div>
                        {item.customerPhone && (
                          <div className="text-xs text-muted-foreground">{item.customerPhone}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{item.rating}/10</span>
                          <Badge variant={item.rating <= 6 ? "destructive" : "secondary"}>
                            {ratingLabel(item.rating)}
                          </Badge>
                          {item.contactRequested && <Users className="h-4 w-4 text-muted-foreground" />}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-md">
                        <p className="line-clamp-2 text-sm text-muted-foreground">
                          {item.comment || "Sem comentário."}
                        </p>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="font-medium">{item.orderNumber || item.orderId.slice(0, 8)}</div>
                        <div className="text-xs text-muted-foreground">{money.format(item.orderTotal)}</div>
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {formatDateTime(item.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.rating <= 6 && !item.resolvedAt ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={resolvingId === item.id}
                            onClick={() => void handleResolve(item.id)}
                          >
                            {resolvingId === item.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Resolver
                          </Button>
                        ) : item.resolvedAt ? (
                          <span className="text-xs text-muted-foreground">Resolvida</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <Alert>
              <MessageSquareText className="h-4 w-4" />
              <AlertDescription>
                Nenhuma avaliação registrada neste período.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
