import { useCallback, useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/components/ui/sonner-toast";
import { usePermissionsV2 } from "@/hooks/usePermissionsV2";
import { getLoyaltyDashboard, saveLoyaltySettings } from "@/services/loyaltyService";
import { LoyaltyDashboardResponse, LoyaltyTransactionType } from "@/types/loyalty";
import { formatPhone } from "@/utils/phoneValidation";
import { Gift, PiggyBank, RefreshCw, Save, TrendingUp, Users } from "lucide-react";

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const TRANSACTION_LABELS: Record<LoyaltyTransactionType, string> = {
  earn: "Crédito",
  redeem: "Resgate",
  earn_reversal: "Estorno de crédito",
  redeem_reversal: "Devolução",
  adjustment: "Ajuste",
};

function displayPhone(phone: string) {
  const localPhone = phone.startsWith("55") && phone.length > 11 ? phone.slice(2) : phone;
  return formatPhone(localPhone);
}

function displayDate(value?: string | null) {
  if (!value) return "Sem movimentação";
  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const emptyData: LoyaltyDashboardResponse = {
  settings: {
    restaurant_id: "",
    enabled: false,
    cashback_percent: 3,
    min_order_value: 0,
    max_redeem_percent: 30,
    credit_valid_days: null,
  },
  metrics: {
    active_balance: 0,
    customers_with_balance: 0,
    total_earned: 0,
    total_redeemed: 0,
  },
  customers: [],
  recent_transactions: [],
};

const Fidelidade = () => {
  const { hasAnyPermission } = usePermissionsV2();
  const canManage = hasAnyPermission(["settings_manage", "settings_system_manage"]);
  const [data, setData] = useState<LoyaltyDashboardResponse>(emptyData);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    enabled: false,
    cashbackPercent: "3",
    minOrderValue: "0",
    maxRedeemPercent: "30",
    creditValidDays: "",
  });

  const syncForm = (response: LoyaltyDashboardResponse) => {
    setForm({
      enabled: response.settings.enabled,
      cashbackPercent: String(response.settings.cashback_percent ?? 3),
      minOrderValue: String(response.settings.min_order_value ?? 0),
      maxRedeemPercent: String(response.settings.max_redeem_percent ?? 30),
      creditValidDays: response.settings.credit_valid_days ? String(response.settings.credit_valid_days) : "",
    });
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getLoyaltyDashboard();
      setData(response);
      syncForm(response);
    } catch (error) {
      console.error("Erro ao carregar fidelidade:", error);
      toast.error("Erro ao carregar fidelidade");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const metricCards = useMemo(() => [
    {
      label: "Saldo ativo",
      value: money.format(data.metrics.active_balance || 0),
      icon: PiggyBank,
    },
    {
      label: "Clientes com saldo",
      value: data.metrics.customers_with_balance.toLocaleString("pt-BR"),
      icon: Users,
    },
    {
      label: "Créditos gerados",
      value: money.format(data.metrics.total_earned || 0),
      icon: TrendingUp,
    },
    {
      label: "Resgates",
      value: money.format(data.metrics.total_redeemed || 0),
      icon: Gift,
    },
  ], [data.metrics]);

  const save = async () => {
    if (!canManage) {
      toast.error("Sem permissão para configurar fidelidade");
      return;
    }

    setSaving(true);
    try {
      await saveLoyaltySettings({
        enabled: form.enabled,
        cashback_percent: Number(form.cashbackPercent || 0),
        min_order_value: Number(form.minOrderValue || 0),
        max_redeem_percent: Number(form.maxRedeemPercent || 0),
        credit_valid_days: form.creditValidDays ? Number(form.creditValidDays) : null,
      });
      await load();
      toast.success("Fidelidade atualizada");
    } catch (error) {
      console.error("Erro ao salvar fidelidade:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao salvar fidelidade");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout title="Fidelidade">
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          {metricCards.map((card) => {
            const Icon = card.icon;
            return (
              <Card key={card.label}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{card.label}</CardTitle>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{card.value}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid gap-6 xl:grid-cols-[420px,1fr]">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle>Programa de cashback</CardTitle>
                  <CardDescription>Crédito automático para pedidos finalizados.</CardDescription>
                </div>
                <Badge variant={form.enabled ? "secondary" : "outline"}>
                  {form.enabled ? "Ativo" : "Inativo"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-3 rounded-md border p-3">
                <div>
                  <Label htmlFor="loyalty-enabled">Cashback ativo</Label>
                  <p className="text-xs text-muted-foreground">Pedidos finalizados geram saldo.</p>
                </div>
                <Switch
                  id="loyalty-enabled"
                  checked={form.enabled}
                  disabled={!canManage}
                  onCheckedChange={(checked) => setForm((current) => ({ ...current, enabled: checked }))}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="cashback-percent">% cashback</Label>
                  <Input
                    id="cashback-percent"
                    type="number"
                    min={0}
                    max={50}
                    step="0.1"
                    value={form.cashbackPercent}
                    disabled={!canManage}
                    onChange={(event) => setForm((current) => ({ ...current, cashbackPercent: event.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="min-order-value">Pedido mínimo</Label>
                  <Input
                    id="min-order-value"
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.minOrderValue}
                    disabled={!canManage}
                    onChange={(event) => setForm((current) => ({ ...current, minOrderValue: event.target.value }))}
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="max-redeem-percent">% máximo por pedido</Label>
                  <Input
                    id="max-redeem-percent"
                    type="number"
                    min={0}
                    max={100}
                    step="1"
                    value={form.maxRedeemPercent}
                    disabled={!canManage}
                    onChange={(event) => setForm((current) => ({ ...current, maxRedeemPercent: event.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="credit-valid-days">Validade em dias</Label>
                  <Input
                    id="credit-valid-days"
                    type="number"
                    min={1}
                    placeholder="Sem validade"
                    value={form.creditValidDays}
                    disabled={!canManage}
                    onChange={(event) => setForm((current) => ({ ...current, creditValidDays: event.target.value }))}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={load} disabled={loading} className="flex-1">
                  <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                  Atualizar
                </Button>
                <Button onClick={save} disabled={!canManage || saving} className="flex-1">
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Clientes com saldo</CardTitle>
              <CardDescription>Saldo consolidado por telefone.</CardDescription>
            </CardHeader>
            <CardContent>
              {data.customers.length ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cliente</TableHead>
                        <TableHead className="text-right">Saldo</TableHead>
                        <TableHead className="text-right">Gerado</TableHead>
                        <TableHead className="text-right">Resgatado</TableHead>
                        <TableHead>Última movimentação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.customers.map((customer) => (
                        <TableRow key={customer.phone_normalized}>
                          <TableCell>
                            <div className="font-medium">{customer.name}</div>
                            <div className="text-xs text-muted-foreground">{displayPhone(customer.phone_normalized)}</div>
                          </TableCell>
                          <TableCell className="text-right font-semibold">{money.format(customer.balance || 0)}</TableCell>
                          <TableCell className="text-right">{money.format(customer.total_earned || 0)}</TableCell>
                          <TableCell className="text-right">{money.format(customer.total_redeemed || 0)}</TableCell>
                          <TableCell>{displayDate(customer.last_transaction_at)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <EmptyState
                  icon={Gift}
                  title="Nenhum saldo gerado"
                  description="Os créditos aparecerão quando pedidos com telefone forem finalizados."
                />
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Extrato recente</CardTitle>
            <CardDescription>Créditos e estornos gerados automaticamente.</CardDescription>
          </CardHeader>
          <CardContent>
            {data.recent_transactions.length ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Validade</TableHead>
                      <TableHead>Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.recent_transactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell>
                          <div className="font-medium">{transaction.customer_name}</div>
                          <div className="text-xs text-muted-foreground">{displayPhone(transaction.phone_normalized)}</div>
                        </TableCell>
                        <TableCell>{TRANSACTION_LABELS[transaction.type] || transaction.type}</TableCell>
                        <TableCell className={transaction.amount >= 0 ? "text-right text-emerald-700" : "text-right text-destructive"}>
                          {money.format(transaction.amount)}
                        </TableCell>
                        <TableCell>{transaction.expires_at ? displayDate(transaction.expires_at) : "Sem validade"}</TableCell>
                        <TableCell>{displayDate(transaction.created_at)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <EmptyState
                icon={PiggyBank}
                title="Nenhuma movimentação"
                description="O extrato será preenchido automaticamente pelos pedidos finalizados."
              />
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Fidelidade;
