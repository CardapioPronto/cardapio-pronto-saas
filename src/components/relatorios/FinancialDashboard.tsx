import { useEffect, useMemo, useState } from "react";
import { endOfMonth, format, startOfMonth, subDays } from "date-fns";
import {
  AlertTriangle,
  Calculator,
  CheckCircle2,
  DollarSign,
  Landmark,
  Loader2,
  PackageSearch,
  Percent,
  Receipt,
  RefreshCw,
  Save,
  Store,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useFinancialDashboard } from "@/hooks/useFinancialDashboard";
import { usePermissionsV2 } from "@/hooks/usePermissionsV2";

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const number = new Intl.NumberFormat("pt-BR");

const percent = (value: number) => `${value.toFixed(1).replace(".", ",")}%`;

const parsePercent = (value: string) => {
  const parsed = Number(value.replace(",", "."));
  if (!Number.isFinite(parsed)) return 0;
  return Math.min(100, Math.max(0, parsed));
};

const parseMoney = (value: string) => {
  const parsed = Number(value.replace(",", "."));
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, parsed);
};

type FinancialAlert = {
  severity: "critical" | "attention" | "info";
  message: string;
};

export const FinancialDashboard = () => {
  const now = new Date();
  const [dateFrom, setDateFrom] = useState(startOfMonth(now));
  const [dateTo, setDateTo] = useState(endOfMonth(now));
  const [ifoodFee, setIfoodFee] = useState("0");
  const [gatewayFee, setGatewayFee] = useState("0");
  const [simulatedRevenue, setSimulatedRevenue] = useState("0");
  const { hasPermission } = usePermissionsV2();
  const canManageSettings = hasPermission("settings_manage");
  const { data, loading, saving, error, refetch, saveSettings } = useFinancialDashboard({ dateFrom, dateTo });

  useEffect(() => {
    if (!data) return;
    setIfoodFee(String(data.settings.ifoodFeePercent));
    setGatewayFee(String(data.settings.gatewayFeePercent));
    setSimulatedRevenue((current) => parseMoney(current) > 0 ? current : String(data.summary.ownChannelRevenue));
  }, [data]);

  const simulation = useMemo(() => {
    const revenue = parseMoney(simulatedRevenue);
    const marketplaceCost = revenue * parsePercent(ifoodFee) / 100;
    const ownChannelCost = revenue * parsePercent(gatewayFee) / 100;
    return {
      marketplaceCost,
      ownChannelCost,
      savings: Math.max(marketplaceCost - ownChannelCost, 0),
    };
  }, [gatewayFee, ifoodFee, simulatedRevenue]);

  const handlePreset = (value: string) => {
    const today = new Date();
    if (value === "hoje") {
      setDateFrom(today);
      setDateTo(today);
    } else if (value === "7dias") {
      setDateFrom(subDays(today, 6));
      setDateTo(today);
    } else if (value === "30dias") {
      setDateFrom(subDays(today, 29));
      setDateTo(today);
    } else {
      setDateFrom(startOfMonth(today));
      setDateTo(endOfMonth(today));
    }
  };

  const handleSaveSettings = async () => {
    try {
      await saveSettings({
        ifoodFeePercent: parsePercent(ifoodFee),
        gatewayFeePercent: parsePercent(gatewayFee),
      });
      toast.success("Taxas estimadas salvas.");
    } catch {
      toast.error("Não foi possível salvar as taxas estimadas.");
    }
  };

  const summary = data?.summary;
  const settingsConfigured =
    (data?.settings.ifoodFeePercent ?? 0) > 0 || (data?.settings.gatewayFeePercent ?? 0) > 0;
  const financialHealth = useMemo(() => {
    const totalRevenue = summary?.totalRevenue ?? 0;
    const totalOrders = summary?.totalOrders ?? 0;
    const estimatedFees = summary?.estimatedFees ?? 0;
    const ownChannelShare = summary?.ownChannelShare ?? 0;
    const ifoodRevenue = summary?.ifoodRevenue ?? 0;
    const costCoveragePercent = summary?.costCoveragePercent ?? 0;
    const grossMarginPercent = summary?.estimatedGrossMarginPercent ?? 0;
    const estimatedSavings = summary?.estimatedOwnChannelSavings ?? 0;
    const feeRate = totalRevenue > 0 ? (estimatedFees / totalRevenue) * 100 : 0;
    const ifoodShare = totalRevenue > 0 ? (ifoodRevenue / totalRevenue) * 100 : 0;
    const alerts: FinancialAlert[] = [];

    if (totalOrders === 0) {
      alerts.push({
        severity: "info",
        message: "Sem pedidos finalizados no período para leitura financeira.",
      });
    }

    if (!settingsConfigured && totalRevenue > 0) {
      alerts.push({
        severity: "critical",
        message: "Configure as taxas para estimar receita líquida e economia com mais precisão.",
      });
    }

    if (totalRevenue > 0 && ownChannelShare < 40) {
      alerts.push({
        severity: "attention",
        message: "Canal próprio abaixo de 40% da receita; há espaço para reduzir dependência de terceiros.",
      });
    }

    if (ifoodShare >= 50) {
      alerts.push({
        severity: "attention",
        message: "Alta concentração de receita no iFood aumenta exposição a taxas e regras externas.",
      });
    }

    if (totalRevenue > 0 && costCoveragePercent < 50) {
      alerts.push({
        severity: "attention",
        message: "Menos de metade da receita tem custo cadastrado; a margem ainda está parcial.",
      });
    }

    if (costCoveragePercent > 0 && grossMarginPercent < 20) {
      alerts.push({
        severity: grossMarginPercent <= 0 ? "critical" : "attention",
        message: "Margem bruta estimada baixa nos produtos com custo cadastrado.",
      });
    }

    if (feeRate >= 15) {
      alerts.push({
        severity: "attention",
        message: `${percent(feeRate)} da receita está comprometida por taxas estimadas.`,
      });
    }

    if (estimatedSavings > 0) {
      alerts.push({
        severity: "info",
        message: `${money.format(estimatedSavings)} de economia estimada reforça o valor do canal próprio.`,
      });
    }

    const criticalAlerts = alerts.filter((alert) => alert.severity === "critical").length;
    const status = totalOrders === 0
      ? "Sem dados"
      : criticalAlerts > 0
        ? "Crítico"
        : alerts.some((alert) => alert.severity === "attention")
          ? "Atenção"
          : "Saudável";
    const badgeVariant = (status === "Crítico" ? "destructive" : status === "Atenção" ? "secondary" : "default") as "default" | "destructive" | "secondary";

    return {
      alerts,
      status,
      badgeVariant,
      feeRate,
      ifoodShare,
    };
  }, [settingsConfigured, summary]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <Landmark className="h-5 w-5" />
            Dashboard financeiro
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-[1fr_1fr_1fr_auto] md:items-end">
            <div className="space-y-2">
              <Label>Período rápido</Label>
              <Select defaultValue="mes-atual" onValueChange={handlePreset}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hoje">Hoje</SelectItem>
                  <SelectItem value="7dias">Últimos 7 dias</SelectItem>
                  <SelectItem value="30dias">Últimos 30 dias</SelectItem>
                  <SelectItem value="mes-atual">Mês atual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="financial-date-from">Data inicial</Label>
              <Input
                id="financial-date-from"
                type="date"
                value={format(dateFrom, "yyyy-MM-dd")}
                onChange={(event) => event.target.value && setDateFrom(new Date(`${event.target.value}T12:00:00`))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="financial-date-to">Data final</Label>
              <Input
                id="financial-date-to"
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

      {!settingsConfigured && !loading && (
        <Alert>
          <Percent className="h-4 w-4" />
          <AlertDescription>
            Configure as taxas estimadas para calcular custo, receita líquida e economia do canal próprio.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita finalizada</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{money.format(summary?.totalRevenue ?? 0)}</div>
            <p className="text-xs text-muted-foreground">{number.format(summary?.totalOrders ?? 0)} pedidos no período</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita líquida estimada</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{money.format(summary?.estimatedNetRevenue ?? 0)}</div>
            <p className="text-xs text-muted-foreground">{money.format(summary?.estimatedFees ?? 0)} em taxas estimadas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Participação do canal próprio</CardTitle>
            <Store className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{percent(summary?.ownChannelShare ?? 0)}</div>
            <p className="text-xs text-muted-foreground">{money.format(summary?.ownChannelRevenue ?? 0)} em venda direta</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Economia estimada</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{money.format(summary?.estimatedOwnChannelSavings ?? 0)}</div>
            <p className="text-xs text-muted-foreground">Venda direta comparada à taxa informada do iFood</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="h-4 w-4" />
              Diagnóstico financeiro
            </CardTitle>
            <CardDescription>
              Leitura executiva para avaliar margem, taxas e dependência de canais.
            </CardDescription>
          </div>
          <Badge variant={financialHealth.badgeVariant}>{financialHealth.status}</Badge>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border p-3">
              <p className="text-sm text-muted-foreground">Taxas sobre receita</p>
              <p className="mt-2 text-xl font-semibold">{percent(financialHealth.feeRate)}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-sm text-muted-foreground">Dependência iFood</p>
              <p className="mt-2 text-xl font-semibold">{percent(financialHealth.ifoodShare)}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-sm text-muted-foreground">Cobertura de custo</p>
              <p className="mt-2 text-xl font-semibold">{percent(summary?.costCoveragePercent ?? 0)}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-sm text-muted-foreground">Margem coberta</p>
              <p className="mt-2 text-xl font-semibold">{percent(summary?.estimatedGrossMarginPercent ?? 0)}</p>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium">Prioridades</p>
            {financialHealth.alerts.length === 0 ? (
              <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                Indicadores financeiros saudáveis no período selecionado.
              </div>
            ) : (
              <div className="space-y-2">
                {financialHealth.alerts.map((alert) => (
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
          <CardTitle className="text-base">Desempenho por canal</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Canal</TableHead>
                  <TableHead className="text-right">Pedidos</TableHead>
                  <TableHead className="text-right">Receita</TableHead>
                  <TableHead className="text-right">Ticket médio</TableHead>
                  <TableHead className="text-right">Taxas estimadas</TableHead>
                  <TableHead className="text-right">Receita líquida estimada</TableHead>
                  <TableHead className="text-right">Participação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.channels ?? []).map((channel) => (
                  <TableRow key={channel.code}>
                    <TableCell className="font-medium">{channel.name}</TableCell>
                    <TableCell className="text-right">{number.format(channel.orders)}</TableCell>
                    <TableCell className="text-right">{money.format(channel.revenue)}</TableCell>
                    <TableCell className="text-right">{money.format(channel.averageTicket)}</TableCell>
                    <TableCell className="text-right">{money.format(channel.estimatedFees)}</TableCell>
                    <TableCell className="text-right">{money.format(channel.estimatedNetRevenue)}</TableCell>
                    <TableCell className="text-right">{percent(channel.revenueShare)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Apenas pedidos finalizados entram nos valores. Taxa de gateway é aplicada somente a pedidos com pagamento online identificado.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita com custo cadastrado</CardTitle>
            <PackageSearch className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{money.format(summary?.marginCoveredRevenue ?? 0)}</div>
            <p className="text-xs text-muted-foreground">
              {percent(summary?.costCoveragePercent ?? 0)} da receita de itens
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Custo estimado dos produtos</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{money.format(summary?.estimatedProductCost ?? 0)}</div>
            <p className="text-xs text-muted-foreground">Somente produtos com custo unitário cadastrado</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Margem bruta estimada</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{money.format(summary?.estimatedGrossMargin ?? 0)}</div>
            <p className="text-xs text-muted-foreground">
              {percent(summary?.estimatedGrossMarginPercent ?? 0)} sobre a receita coberta
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Margem estimada por produto</CardTitle>
        </CardHeader>
        <CardContent>
          {(data?.products ?? []).length > 0 ? (
            <>
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead className="text-right">Qtd.</TableHead>
                      <TableHead className="text-right">Receita</TableHead>
                      <TableHead className="text-right">Custo estimado</TableHead>
                      <TableHead className="text-right">Margem estimada</TableHead>
                      <TableHead className="text-right">Margem %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(data?.products ?? []).map((product) => (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell className="text-right">{number.format(product.quantity)}</TableCell>
                        <TableCell className="text-right">{money.format(product.revenue)}</TableCell>
                        <TableCell className="text-right">{money.format(product.estimatedCost)}</TableCell>
                        <TableCell className="text-right">{money.format(product.estimatedGrossMargin)}</TableCell>
                        <TableCell className="text-right">{percent(product.estimatedGrossMarginPercent)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                A margem considera preço vendido menos custo unitário cadastrado. Itens sem custo ou sem vínculo com o catálogo ficam fora do cálculo.
              </p>
            </>
          ) : (
            <Alert>
              <PackageSearch className="h-4 w-4" />
              <AlertDescription>
                Cadastre o custo unitário nos produtos para começar a acompanhar margem estimada.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Percent className="h-4 w-4" />
              Taxas estimadas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="ifood-fee">Taxa média do iFood (%)</Label>
                <Input
                  id="ifood-fee"
                  inputMode="decimal"
                  value={ifoodFee}
                  onChange={(event) => setIfoodFee(event.target.value)}
                  disabled={!canManageSettings}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gateway-fee">Taxa média do gateway (%)</Label>
                <Input
                  id="gateway-fee"
                  inputMode="decimal"
                  value={gatewayFee}
                  onChange={(event) => setGatewayFee(event.target.value)}
                  disabled={!canManageSettings}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Use os percentuais do contrato do restaurante. Estes valores são estimativas gerenciais e não substituem o extrato financeiro.
            </p>
            <Button onClick={() => void handleSaveSettings()} disabled={!canManageSettings || saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Salvar taxas
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calculator className="h-4 w-4" />
              Calculadora de economia do canal próprio
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="simulated-revenue">Receita simulada (R$)</Label>
              <Input
                id="simulated-revenue"
                inputMode="decimal"
                value={simulatedRevenue}
                onChange={(event) => setSimulatedRevenue(event.target.value)}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Custo no iFood</p>
                <p className="mt-1 font-semibold">{money.format(simulation.marketplaceCost)}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Custo no canal próprio</p>
                <p className="mt-1 font-semibold">{money.format(simulation.ownChannelCost)}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Economia estimada</p>
                <p className="mt-1 font-semibold">{money.format(simulation.savings)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
