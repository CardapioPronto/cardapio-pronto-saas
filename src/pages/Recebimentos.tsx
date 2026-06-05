import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import {
  centsToBRL,
  formatBRL,
  recipientFinancialsService,
} from "@/services/recipientFinancialsService";
import { RECIPIENT_STATUS_LABEL, RecipientStatus } from "@/services/restaurantRecipientService";
import { ArrowRight, Banknote, Clock, Loader2, RefreshCw, TrendingUp, Wallet } from "lucide-react";

const PERIOD_OPTIONS = [
  { value: "7", label: "Últimos 7 dias" },
  { value: "30", label: "Últimos 30 dias" },
  { value: "90", label: "Últimos 90 dias" },
];

const paymentStatusBadge = (status: string): { label: string; variant: "default" | "secondary" | "destructive" | "outline" } => {
  switch (status) {
    case "paid":
      return { label: "Pago", variant: "default" };
    case "pending":
      return { label: "Aguardando", variant: "secondary" };
    case "failed":
      return { label: "Falhou", variant: "destructive" };
    case "refunded":
      return { label: "Estornado", variant: "outline" };
    case "canceled":
      return { label: "Cancelado", variant: "outline" };
    default:
      return { label: status, variant: "outline" };
  }
};

const methodLabel = (method: string) => {
  if (method === "pix") return "PIX";
  if (method === "credit_card") return "Cartão";
  return method;
};

const formatDate = (value?: string | null) =>
  value ? new Date(value).toLocaleString("pt-BR") : "—";

const Recebimentos = () => {
  const { user } = useCurrentUser();
  const restaurantId = user?.restaurant_id || "";
  const queryClient = useQueryClient();
  const [period, setPeriod] = useState("30");

  const sinceISO = useMemo(() => {
    const days = Number(period) || 30;
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString();
  }, [period]);

  const financialsQuery = useQuery({
    queryKey: ["recipient-financials", restaurantId],
    queryFn: () => recipientFinancialsService.getFinancials(),
    enabled: !!restaurantId,
  });

  const statementQuery = useQuery({
    queryKey: ["recipient-statement", restaurantId, sinceISO],
    queryFn: () => recipientFinancialsService.getStatement(restaurantId, sinceISO),
    enabled: !!restaurantId,
  });

  const financials = financialsQuery.data;
  const statement = statementQuery.data;
  const balance = financials?.balance;

  const refreshBalance = () =>
    queryClient.invalidateQueries({ queryKey: ["recipient-financials", restaurantId] });

  if (!restaurantId) {
    return (
      <DashboardLayout title="Recebimentos">
        <Alert variant="destructive">
          <AlertTitle>Restaurante não encontrado</AlertTitle>
          <AlertDescription>Não foi possível localizar o restaurante vinculado à sua conta.</AlertDescription>
        </Alert>
      </DashboardLayout>
    );
  }

  const recipientStatus = (financials?.recipient_status as RecipientStatus) || "not_created";
  const noRecipient = financials && !financials.has_recipient;

  return (
    <DashboardLayout title="Recebimentos">
      <div className="space-y-6">
        {noRecipient && (
          <Alert className="border-amber-300/40 bg-amber-50/40 dark:bg-amber-950/10">
            <Clock className="h-4 w-4" />
            <AlertTitle>Conta de recebimento ainda não configurada</AlertTitle>
            <AlertDescription>
              Cadastre os dados bancários em{" "}
              <Link to="/pagarme-config" className="font-medium underline underline-offset-2">
                Recebimentos Online
              </Link>{" "}
              para que o Pagar.me crie seu recebedor e o saldo passe a aparecer aqui. O extrato de pedidos abaixo já
              reflete as cobranças geradas.
            </AlertDescription>
          </Alert>
        )}

        {/* Cards de resumo */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          <SummaryCard
            icon={<Wallet className="h-5 w-5" />}
            title="Saldo disponível"
            value={balance ? centsToBRL(balance.available_amount) : "—"}
            hint="Pronto para transferência (Pagar.me)"
            loading={financialsQuery.isLoading}
          />
          <SummaryCard
            icon={<Clock className="h-5 w-5" />}
            title="A liberar"
            value={balance ? centsToBRL(balance.waiting_funds_amount) : "—"}
            hint="Aguardando liquidação"
            loading={financialsQuery.isLoading}
          />
          <SummaryCard
            icon={<TrendingUp className="h-5 w-5" />}
            title="Bruto dos pedidos"
            value={statement ? formatBRL(statement.summary.total_gross) : "—"}
            hint={`${statement?.summary.paid_count ?? 0} pedidos pagos no período`}
            loading={statementQuery.isLoading}
          />
          <SummaryCard
            icon={<Banknote className="h-5 w-5" />}
            title="Comissão da plataforma"
            value={statement ? formatBRL(statement.summary.total_platform_commission) : "—"}
            hint="Parte retida pelo split (Pubfy)"
            loading={statementQuery.isLoading}
          />
          <SummaryCard
            icon={<Banknote className="h-5 w-5" />}
            title="Taxas Pagar.me"
            value={
              statement?.summary.total_pagarme_fees != null
                ? formatBRL(statement.summary.total_pagarme_fees)
                : "—"
            }
            hint="Processamento cobrado do recebedor"
            loading={statementQuery.isLoading}
          />
          <SummaryCard
            icon={<TrendingUp className="h-5 w-5" />}
            title="Líquido repassado"
            value={
              statement?.summary.total_net_repasse != null
                ? formatBRL(statement.summary.total_net_repasse)
                : "—"
            }
            hint="Estimativa: bruto − comissão − taxas"
            loading={statementQuery.isLoading}
          />
        </div>

        {/* Saldo Pagar.me + liquidações */}
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="h-5 w-5" />
                  Saldo e liquidações (Pagar.me)
                </CardTitle>
                <CardDescription>
                  O valor é liquidado automaticamente na conta bancária cadastrada do recebedor.
                </CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={recipientStatus === "active" ? "default" : "outline"}>
                  Recebedor: {RECIPIENT_STATUS_LABEL[recipientStatus]}
                </Badge>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/pagarme-config">
                    Configurar recebedor
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={refreshBalance}
                  disabled={financialsQuery.isFetching}
                >
                  {financialsQuery.isFetching
                    ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    : <RefreshCw className="mr-2 h-4 w-4" />}
                  Atualizar
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {financialsQuery.isError && (
              <Alert variant="destructive">
                <AlertTitle>Não foi possível consultar o saldo</AlertTitle>
                <AlertDescription>
                  {(financialsQuery.error as Error)?.message || "Tente novamente em instantes."}
                </AlertDescription>
              </Alert>
            )}

            {balance && (
              <div className="grid gap-4 sm:grid-cols-3">
                <BalanceLine label="Disponível" value={centsToBRL(balance.available_amount)} />
                <BalanceLine label="A liberar" value={centsToBRL(balance.waiting_funds_amount)} />
                <BalanceLine label="Já transferido" value={centsToBRL(balance.transferred_amount)} />
              </div>
            )}

            <div className="space-y-2">
              <h3 className="text-sm font-medium">Últimas transferências</h3>
              {!financials?.transfers?.length ? (
                <p className="text-sm text-muted-foreground">Nenhuma transferência registrada ainda.</p>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {financials.transfers.map((transfer, index) => (
                        <TableRow key={transfer.id || index}>
                          <TableCell>{formatDate(transfer.created_at)}</TableCell>
                          <TableCell>{centsToBRL(transfer.amount)}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{transfer.status || "—"}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Extrato de pedidos */}
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Extrato de pedidos online</CardTitle>
                <CardDescription>
                  Valores brutos cobrados do cliente, comissão da plataforma e líquido estimado para o restaurante.
                </CardDescription>
              </div>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERIOD_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {statementQuery.isLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando extrato...
              </div>
            ) : !statement?.entries.length ? (
              <p className="text-sm text-muted-foreground">Nenhuma cobrança no período selecionado.</p>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Pedido</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Método</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Bruto</TableHead>
                      <TableHead className="text-right">Comissão</TableHead>
                      <TableHead className="text-right">Taxa Pagar.me</TableHead>
                      <TableHead className="text-right">Líquido</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {statement.entries.map(entry => {
                      const badge = paymentStatusBadge(entry.status);
                      return (
                        <TableRow key={entry.id}>
                          <TableCell className="whitespace-nowrap">
                            {formatDate(entry.paid_at || entry.created_at)}
                          </TableCell>
                          <TableCell>#{entry.order_number || entry.order_id.slice(0, 8)}</TableCell>
                          <TableCell className="max-w-[140px] truncate">{entry.customer_name || "—"}</TableCell>
                          <TableCell>{methodLabel(entry.payment_method)}</TableCell>
                          <TableCell>
                            <Badge variant={badge.variant}>{badge.label}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium">{formatBRL(entry.gross_amount)}</TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {entry.platform_commission > 0
                              ? `−${formatBRL(entry.platform_commission)}`
                              : "—"}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {entry.pagarme_fee != null ? `−${formatBRL(entry.pagarme_fee)}` : "—"}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {entry.net_repasse != null ? formatBRL(entry.net_repasse) : "—"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    <TableRow className="bg-muted/30 font-medium">
                      <TableCell colSpan={5}>Total (pedidos pagos)</TableCell>
                      <TableCell className="text-right">{formatBRL(statement.summary.total_gross)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {statement.summary.total_platform_commission > 0
                          ? `−${formatBRL(statement.summary.total_platform_commission)}`
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {statement.summary.total_pagarme_fees != null
                          ? `−${formatBRL(statement.summary.total_pagarme_fees)}`
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        {statement.summary.total_net_repasse != null
                          ? formatBRL(statement.summary.total_net_repasse)
                          : "—"}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

const SummaryCard = ({
  icon,
  title,
  value,
  hint,
  loading,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  hint: string;
  loading?: boolean;
}) => (
  <Card>
    <CardContent className="pt-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{title}</p>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <p className="mt-2 text-2xl font-semibold">
        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : value}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </CardContent>
  </Card>
);

const BalanceLine = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-md border bg-muted/20 p-4">
    <p className="text-sm text-muted-foreground">{label}</p>
    <p className="mt-1 text-xl font-semibold">{value}</p>
  </div>
);

export default Recebimentos;
