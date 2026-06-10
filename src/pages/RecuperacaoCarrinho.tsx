import { useCallback, useEffect, useMemo, useState } from "react";
import { format, subDays } from "date-fns";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/components/ui/sonner-toast";
import { usePermissionsV2 } from "@/hooks/usePermissionsV2";
import {
  cartAbandonmentService,
  type CartAbandonmentDashboard,
} from "@/services/cartAbandonmentService";
import { formatPhone } from "@/utils/phoneValidation";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  Mail,
  MessageCircle,
  RefreshCw,
  Save,
  ShoppingCart,
  TicketPercent,
  TrendingUp,
} from "lucide-react";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const number = new Intl.NumberFormat("pt-BR");

const STATUS_LABEL: Record<string, string> = {
  active: "Ativo",
  abandoned: "Abandonado",
  reminded: "Lembrete enviado",
  recovered: "Recuperado",
  expired: "Expirado",
};

type DiagnosticAlert = {
  severity: "critical" | "attention" | "info";
  message: string;
};

const emptyDashboard: CartAbandonmentDashboard = {
  settings: {
    restaurant_id: "",
    enabled: false,
    abandonment_minutes: 30,
    remind_via_email: true,
    remind_via_whatsapp: false,
    recovery_coupon_code: null,
    reminder_cooldown_days: 7,
    recovery_window_hours: 72,
  },
  metrics: {
    trackedAbandonments: 0,
    reminded: 0,
    recovered: 0,
    recoveredRevenue: 0,
    activeSessions: 0,
    recoveryRate: 0,
  },
  recent: [],
};

const RecuperacaoCarrinho = () => {
  const { hasAnyPermission } = usePermissionsV2();
  const canManage = hasAnyPermission(["settings_manage", "settings_system_manage"]);
  const [data, setData] = useState<CartAbandonmentDashboard>(emptyDashboard);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dateFrom, setDateFrom] = useState(subDays(new Date(), 29));
  const [dateTo, setDateTo] = useState(new Date());
  const [form, setForm] = useState({
    enabled: false,
    abandonmentMinutes: "30",
    remindViaEmail: true,
    remindViaWhatsapp: false,
    recoveryCouponCode: "",
    reminderCooldownDays: "7",
    recoveryWindowHours: "72",
  });

  const syncForm = useCallback((dashboard: CartAbandonmentDashboard) => {
    setForm({
      enabled: dashboard.settings.enabled,
      abandonmentMinutes: String(dashboard.settings.abandonment_minutes),
      remindViaEmail: dashboard.settings.remind_via_email,
      remindViaWhatsapp: dashboard.settings.remind_via_whatsapp,
      recoveryCouponCode: dashboard.settings.recovery_coupon_code || "",
      reminderCooldownDays: String(dashboard.settings.reminder_cooldown_days),
      recoveryWindowHours: String(dashboard.settings.recovery_window_hours),
    });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await cartAbandonmentService.getDashboard(dateFrom, dateTo);
      setData(response);
      syncForm(response);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao carregar recuperação de carrinho.");
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, syncForm]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSave = async () => {
    if (!canManage) return;
    setSaving(true);
    try {
      await cartAbandonmentService.saveSettings({
        enabled: form.enabled,
        abandonment_minutes: Number(form.abandonmentMinutes),
        remind_via_email: form.remindViaEmail,
        remind_via_whatsapp: form.remindViaWhatsapp,
        recovery_coupon_code: form.recoveryCouponCode.trim().toUpperCase() || null,
        reminder_cooldown_days: Number(form.reminderCooldownDays),
        recovery_window_hours: Number(form.recoveryWindowHours),
      });
      toast.success("Configurações salvas.");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  };

  const metrics = data.metrics;
  const settings = data.settings;
  const periodLabel = useMemo(
    () => `${format(dateFrom, "dd/MM/yyyy")} — ${format(dateTo, "dd/MM/yyyy")}`,
    [dateFrom, dateTo],
  );
  const channelLabel = useMemo(() => {
    const channels = [
      settings.remind_via_email ? "E-mail" : null,
      settings.remind_via_whatsapp ? "WhatsApp" : null,
    ].filter(Boolean);

    return channels.length > 0 ? channels.join(" + ") : "Nenhum canal";
  }, [settings.remind_via_email, settings.remind_via_whatsapp]);
  const diagnosticAlerts = useMemo<DiagnosticAlert[]>(() => {
    const alerts: DiagnosticAlert[] = [];

    if (!settings.enabled) {
      alerts.push({
        severity: "critical",
        message: "A recuperação está pausada e não enviará lembretes.",
      });
    }

    if (!settings.remind_via_email && !settings.remind_via_whatsapp) {
      alerts.push({
        severity: "critical",
        message: "Nenhum canal de lembrete está ativo.",
      });
    }

    if (settings.enabled && metrics.trackedAbandonments > 0 && metrics.reminded === 0) {
      alerts.push({
        severity: "attention",
        message: "Há abandonos no período, mas nenhum lembrete enviado.",
      });
    }

    if (settings.abandonment_minutes < 10) {
      alerts.push({
        severity: "attention",
        message: "Janela muito curta pode abordar clientes que ainda estavam decidindo.",
      });
    }

    if (settings.abandonment_minutes > 240) {
      alerts.push({
        severity: "attention",
        message: "Janela muito longa reduz a chance de recuperação no mesmo momento de compra.",
      });
    }

    if (settings.recovery_window_hours < 24) {
      alerts.push({
        severity: "attention",
        message: "Janela de atribuição menor que 24h pode subestimar recuperações.",
      });
    }

    if (!settings.recovery_coupon_code?.trim()) {
      alerts.push({
        severity: "info",
        message: "Sem cupom opcional configurado para reforçar o retorno do cliente.",
      });
    }

    if (metrics.reminded >= 5 && metrics.recovered === 0) {
      alerts.push({
        severity: "attention",
        message: "Lembretes enviados sem recuperação; vale revisar mensagem, cupom ou tempo de disparo.",
      });
    }

    return alerts;
  }, [
    metrics.recovered,
    metrics.reminded,
    metrics.trackedAbandonments,
    settings.abandonment_minutes,
    settings.enabled,
    settings.recovery_coupon_code,
    settings.recovery_window_hours,
    settings.remind_via_email,
    settings.remind_via_whatsapp,
  ]);
  const criticalAlerts = diagnosticAlerts.filter((alert) => alert.severity === "critical").length;
  const diagnosticStatus = !settings.enabled
    ? "Pausada"
    : criticalAlerts > 0
      ? "Revisar"
      : diagnosticAlerts.length > 0
        ? "Atenção"
        : "Saudável";
  const diagnosticBadgeVariant = !settings.enabled || criticalAlerts > 0
    ? "destructive"
    : diagnosticAlerts.length > 0
      ? "secondary"
      : "default";

  return (
    <DashboardLayout title="Recuperação de carrinho">
      <div className="space-y-6">
        <Alert>
          <ShoppingCart className="h-4 w-4" />
          <AlertDescription>
            Quando o cliente informa telefone no checkout e não finaliza o pedido, o Pubfy pode enviar um lembrete
            (com opt-in) após a janela configurada. Pedidos concluídos com o mesmo telefone contam como recuperados.
          </AlertDescription>
        </Alert>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Abandonos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{number.format(metrics.trackedAbandonments)}</div>
              <p className="text-xs text-muted-foreground">{periodLabel}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Lembretes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{number.format(metrics.reminded)}</div>
              <p className="text-xs text-muted-foreground">E-mail ou WhatsApp (com opt-in)</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Recuperados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{number.format(metrics.recovered)}</div>
              <p className="text-xs text-muted-foreground">Taxa {number.format(metrics.recoveryRate)}%</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Receita recuperada</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{money.format(metrics.recoveredRevenue)}</div>
              <p className="text-xs text-muted-foreground">{number.format(metrics.activeSessions)} sessões ativas agora</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Diagnóstico operacional</CardTitle>
              <CardDescription>
                Saúde da automação de recuperação no período selecionado.
              </CardDescription>
            </div>
            <Badge variant={diagnosticBadgeVariant}>{diagnosticStatus}</Badge>
          </CardHeader>
          <CardContent className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border p-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {settings.enabled ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <AlertTriangle className="h-4 w-4 text-destructive" />}
                  Status
                </div>
                <p className="mt-2 font-semibold">{settings.enabled ? "Ativa" : "Pausada"}</p>
              </div>
              <div className="rounded-lg border p-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {settings.remind_via_whatsapp ? <MessageCircle className="h-4 w-4 text-emerald-600" /> : <Mail className="h-4 w-4 text-primary" />}
                  Canais
                </div>
                <p className="mt-2 font-semibold">{channelLabel}</p>
              </div>
              <div className="rounded-lg border p-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4 text-primary" />
                  Disparo
                </div>
                <p className="mt-2 font-semibold">Após {settings.abandonment_minutes} min</p>
              </div>
              <div className="rounded-lg border p-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <TicketPercent className="h-4 w-4 text-primary" />
                  Incentivo
                </div>
                <p className="mt-2 font-semibold">{settings.recovery_coupon_code || "Sem cupom"}</p>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium">Pontos de atenção</p>
              {diagnosticAlerts.length === 0 ? (
                <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                  Automação pronta para recuperar carrinhos abandonados.
                </div>
              ) : (
                <div className="space-y-2">
                  {diagnosticAlerts.map((alert) => (
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
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Configuração
            </CardTitle>
            <CardDescription>
              Ative a recuperação e defina janela de abandono, canais e cupom opcional.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <Label htmlFor="cart-abandon-enabled">Recuperação ativa</Label>
                <p className="text-xs text-muted-foreground">Registra carrinhos com telefone no cardápio público.</p>
              </div>
              <Switch
                id="cart-abandon-enabled"
                checked={form.enabled}
                disabled={!canManage}
                onCheckedChange={(checked) => setForm((prev) => ({ ...prev, enabled: checked }))}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="abandonment-minutes">Janela de abandono (minutos)</Label>
                <Input
                  id="abandonment-minutes"
                  type="number"
                  min={5}
                  max={1440}
                  disabled={!canManage}
                  value={form.abandonmentMinutes}
                  onChange={(e) => setForm((prev) => ({ ...prev, abandonmentMinutes: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="recovery-coupon">Cupom de recuperação (opcional)</Label>
                <Input
                  id="recovery-coupon"
                  disabled={!canManage}
                  value={form.recoveryCouponCode}
                  onChange={(e) => setForm((prev) => ({ ...prev, recoveryCouponCode: e.target.value.toUpperCase() }))}
                  placeholder="EX: VOLTA10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cooldown-days">Intervalo entre lembretes (dias)</Label>
                <Input
                  id="cooldown-days"
                  type="number"
                  min={1}
                  max={30}
                  disabled={!canManage}
                  value={form.reminderCooldownDays}
                  onChange={(e) => setForm((prev) => ({ ...prev, reminderCooldownDays: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="recovery-window">Janela de atribuição (horas)</Label>
                <Input
                  id="recovery-window"
                  type="number"
                  min={1}
                  max={168}
                  disabled={!canManage}
                  value={form.recoveryWindowHours}
                  onChange={(e) => setForm((prev) => ({ ...prev, recoveryWindowHours: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="flex items-center justify-between rounded-lg border p-3">
                <span className="text-sm">Lembrete por e-mail (opt-in no checkout)</span>
                <Switch
                  checked={form.remindViaEmail}
                  disabled={!canManage}
                  onCheckedChange={(checked) => setForm((prev) => ({ ...prev, remindViaEmail: checked }))}
                />
              </label>
              <label className="flex items-center justify-between rounded-lg border p-3">
                <span className="text-sm">Lembrete por WhatsApp (opt-in no checkout)</span>
                <Switch
                  checked={form.remindViaWhatsapp}
                  disabled={!canManage}
                  onCheckedChange={(checked) => setForm((prev) => ({ ...prev, remindViaWhatsapp: checked }))}
                />
              </label>
            </div>

            {canManage ? (
              <Button onClick={() => void handleSave()} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Salvar configurações
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">Somente gestores podem alterar as configurações.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Sessões recentes</CardTitle>
              <CardDescription>Período do relatório abaixo.</CardDescription>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <Input
                type="date"
                value={format(dateFrom, "yyyy-MM-dd")}
                onChange={(e) => e.target.value && setDateFrom(new Date(`${e.target.value}T12:00:00`))}
              />
              <Input
                type="date"
                value={format(dateTo, "yyyy-MM-dd")}
                onChange={(e) => e.target.value && setDateTo(new Date(`${e.target.value}T12:00:00`))}
              />
              <Button variant="outline" onClick={() => void load()} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {data.recent.length > 0 ? (
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Carrinho</TableHead>
                      <TableHead>Canal</TableHead>
                      <TableHead className="text-right">Recuperado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.recent.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="font-medium">{item.customerName || "Cliente"}</div>
                          <div className="text-xs text-muted-foreground">
                            {formatPhone(item.customerPhone.startsWith("55") ? item.customerPhone.slice(2) : item.customerPhone)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={item.status === "recovered" ? "default" : "secondary"}>
                            {STATUS_LABEL[item.status] || item.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {item.itemCount} itens · {money.format(item.cartSubtotal)}
                        </TableCell>
                        <TableCell>{item.reminderChannel || "—"}</TableCell>
                        <TableCell className="text-right">
                          {item.recoveredRevenue != null ? money.format(item.recoveredRevenue) : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma sessão no período selecionado.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default RecuperacaoCarrinho;
