import { useState } from "react";
import { format, subDays } from "date-fns";
import {
  AlertTriangle,
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

export const FeedbackDashboard = () => {
  const today = new Date();
  const [dateFrom, setDateFrom] = useState(subDays(today, 29));
  const [dateTo, setDateTo] = useState(today);
  const { data, loading, error, refetch } = useFeedbackDashboard({ dateFrom, dateTo });

  const summary = data?.summary;
  const recent = data?.recent ?? [];

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
