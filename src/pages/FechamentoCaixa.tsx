import { useCallback, useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useRestaurantAccess } from "@/hooks/useRestaurantAccess";
import { formatarMoeda } from "@/utils/dashboardUtils";
import { parseMoneyInput, summarizeCashClosing } from "@/lib/cashRegister";
import {
  closeSession,
  fetchOpenSession,
  fetchRecentSessions,
  fetchSessionSales,
  openSession,
  type CashRegisterSession,
  type SessionOrder,
} from "@/services/cashRegisterService";
import PaymentMethodReconciliation from "@/components/caixa/PaymentMethodReconciliation";
import { RefreshCw } from "lucide-react";
import CashClosingAiReview, { type CashAiReview } from "@/components/caixa/CashClosingAiReview";

const EMPTY_FORM = {
  cash: "",
  pix: "",
  credit: "",
  debit: "",
  voucher: "",
  withdrawals: "",
  provider: "",
  batch: "",
  notes: "",
};

const formatDateTime = (value: string | null) =>
  value ? new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "-";

const DifferenceBadge = ({ value }: { value: number }) => {
  if (Math.abs(value) < 0.01) return <Badge variant="secondary">Conferido</Badge>;
  return (
    <Badge variant={value < 0 ? "destructive" : "outline"}>
      {value < 0 ? "Falta" : "Sobra"} {formatarMoeda(Math.abs(value))}
    </Badge>
  );
};

const FechamentoCaixa = () => {
  const { activeRestaurantId } = useRestaurantAccess();
  const { toast } = useToast();
  const [session, setSession] = useState<CashRegisterSession | null>(null);
  const [history, setHistory] = useState<CashRegisterSession[]>([]);
  const [sales, setSales] = useState<{ count: number; total: number; orders: SessionOrder[] }>({ count: 0, total: 0, orders: [] });
  const [openingInput, setOpeningInput] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!activeRestaurantId) return;
    setLoading(true);
    try {
      const [open, recent] = await Promise.all([
        fetchOpenSession(activeRestaurantId),
        fetchRecentSessions(activeRestaurantId),
      ]);
      setSession(open);
      setHistory(recent);
      setSales(open ? await fetchSessionSales(activeRestaurantId, open.opened_at) : { count: 0, total: 0, orders: [] });
    } catch (error) {
      toast({
        title: "Não foi possível carregar o caixa",
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [activeRestaurantId, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const declaration = useMemo(
    () => ({
      openingAmount: Number(session?.opening_amount ?? 0),
      declaredCash: parseMoneyInput(form.cash),
      declaredPix: parseMoneyInput(form.pix),
      declaredCredit: parseMoneyInput(form.credit),
      declaredDebit: parseMoneyInput(form.debit),
      declaredVoucher: parseMoneyInput(form.voucher),
      withdrawals: parseMoneyInput(form.withdrawals),
    }),
    [form, session],
  );

  const summary = summarizeCashClosing(declaration, sales.total);

  const handleOpen = async () => {
    if (!activeRestaurantId) return;
    setSaving(true);
    try {
      await openSession(activeRestaurantId, parseMoneyInput(openingInput));
      setOpeningInput("");
      toast({ title: "Caixa aberto" });
      await load();
    } catch (error) {
      toast({
        title: "Não foi possível abrir o caixa",
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleClose = async () => {
    if (!session || !activeRestaurantId) return;
    setSaving(true);
    try {
      const fresh = await fetchSessionSales(activeRestaurantId, session.opened_at);
      const finalSummary = summarizeCashClosing(declaration, fresh.total);
      await closeSession(session.id, {
        system_orders_count: fresh.count,
        system_sales_total: fresh.total,
        declared_cash: declaration.declaredCash,
        declared_pix: declaration.declaredPix,
        declared_credit: declaration.declaredCredit,
        declared_debit: declaration.declaredDebit,
        declared_voucher: declaration.declaredVoucher,
        withdrawals: declaration.withdrawals,
        card_machine_provider: form.provider.trim() || null,
        card_machine_batch: form.batch.trim() || null,
        difference_amount: finalSummary.difference,
        notes: form.notes.trim() || null,
      });
      setForm(EMPTY_FORM);
      toast({ title: "Caixa fechado", description: `Diferença: ${formatarMoeda(finalSummary.difference)}` });
      await load();
    } catch (error) {
      toast({
        title: "Não foi possível fechar o caixa",
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const field = (key: keyof typeof EMPTY_FORM, label: string, placeholder = "0,00") => (
    <div className="space-y-1.5">
      <Label htmlFor={`caixa-${key}`}>{label}</Label>
      <Input
        id={`caixa-${key}`}
        inputMode="decimal"
        placeholder={placeholder}
        value={form[key]}
        onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))}
      />
    </div>
  );

  return (
    <DashboardLayout title="Fechamento de caixa">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Caixa do turno</h2>
            <p className="text-sm text-muted-foreground">
              Abra o caixa com o troco, registre o que entrou e confira com o relatório da maquininha.
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {!session ? (
          <Card>
            <CardHeader>
              <CardTitle>Abrir caixa</CardTitle>
              <CardDescription>Nenhum caixa aberto. Informe o valor de troco na gaveta.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap items-end gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="caixa-abertura">Troco inicial</Label>
                <Input
                  id="caixa-abertura"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={openingInput}
                  onChange={(event) => setOpeningInput(event.target.value)}
                />
              </div>
              <Button onClick={() => void handleOpen()} disabled={saving || !activeRestaurantId}>
                Abrir caixa
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Card><CardContent className="p-5">
                <p className="text-sm text-muted-foreground">Aberto em</p>
                <p className="mt-1 text-xl font-bold">{formatDateTime(session.opened_at)}</p>
                <p className="mt-1 text-xs text-muted-foreground">Troco: {formatarMoeda(Number(session.opening_amount))}</p>
              </CardContent></Card>
              <Card><CardContent className="p-5">
                <p className="text-sm text-muted-foreground">Vendas no sistema</p>
                <p className="mt-1 text-xl font-bold">{formatarMoeda(sales.total)}</p>
                <p className="mt-1 text-xs text-muted-foreground">{sales.count} pedidos válidos</p>
              </CardContent></Card>
              <Card><CardContent className="p-5">
                <p className="text-sm text-muted-foreground">Vendas declaradas</p>
                <p className="mt-1 text-xl font-bold">{formatarMoeda(summary.declaredSales)}</p>
                <p className="mt-1 text-xs text-muted-foreground">Maquininha: {formatarMoeda(summary.cardMachineTotal)}</p>
              </CardContent></Card>
              <Card><CardContent className="p-5">
                <p className="text-sm text-muted-foreground">Diferença</p>
                <p className="mt-1 text-xl font-bold">{formatarMoeda(summary.difference)}</p>
                <div className="mt-1"><DifferenceBadge value={summary.difference} /></div>
              </CardContent></Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Conferência e fechamento</CardTitle>
                <CardDescription>
                  Conte a gaveta e copie os totais do relatório da maquininha (crédito, débito e voucher).
                  Dinheiro esperado na gaveta: {formatarMoeda(summary.expectedCashInDrawer)}.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  {field("cash", "Dinheiro contado na gaveta")}
                  {field("withdrawals", "Sangrias / retiradas")}
                  {field("pix", "PIX recebido")}
                  {field("credit", "Crédito (maquininha)")}
                  {field("debit", "Débito (maquininha)")}
                  {field("voucher", "Voucher / refeição")}
                  {field("provider", "Maquininha", "Ex.: Stone, Cielo, PagSeguro")}
                  {field("batch", "Lote / referência do relatório", "Ex.: lote 0012")}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="caixa-notes">Observações</Label>
                  <Textarea
                    id="caixa-notes"
                    value={form.notes}
                    onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                    placeholder="Justifique diferenças, estornos ou vendas fora do sistema."
                  />
                </div>
                <Button onClick={() => void handleClose()} disabled={saving}>
                  Fechar caixa
                </Button>
              </CardContent>
            </Card>

            <PaymentMethodReconciliation
              orders={sales.orders}
              declared={{
                dinheiro: Math.max(0, declaration.declaredCash - declaration.openingAmount + declaration.withdrawals),
                pix: declaration.declaredPix,
                credito: declaration.declaredCredit,
                debito: declaration.declaredDebit,
                voucher: declaration.declaredVoucher,
              }}
            />

            <CashClosingAiReview
              key={session.id}
              sessionId={session.id}
              initialReview={(session.ai_review as CashAiReview | null) ?? null}
              declared={{
                cash: declaration.declaredCash,
                withdrawals: declaration.withdrawals,
                pix: declaration.declaredPix,
                credit: declaration.declaredCredit,
                debit: declaration.declaredDebit,
                voucher: declaration.declaredVoucher,
                provider: form.provider,
                batch: form.batch,
              }}
              onApplyExtracted={(values) => {
                const toInput = (value: number | null, current: string) =>
                  value === null ? current : value.toFixed(2).replace(".", ",");
                setForm((current) => ({
                  ...current,
                  credit: toInput(values.credit, current.credit),
                  debit: toInput(values.debit, current.debit),
                  voucher: toInput(values.voucher, current.voucher),
                  provider: values.provider ?? current.provider,
                  batch: values.batch ?? current.batch,
                }));
              }}
            />
          </>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Últimos fechamentos</CardTitle>
          </CardHeader>
          <CardContent>
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum caixa fechado ainda.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Período</TableHead>
                    <TableHead className="text-right">Sistema</TableHead>
                    <TableHead className="text-right">Maquininha</TableHead>
                    <TableHead>Referência</TableHead>
                    <TableHead>Resultado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        {formatDateTime(item.opened_at)} → {formatDateTime(item.closed_at)}
                      </TableCell>
                      <TableCell className="text-right">{formatarMoeda(Number(item.system_sales_total))}</TableCell>
                      <TableCell className="text-right">
                        {formatarMoeda(
                          Number(item.declared_credit) + Number(item.declared_debit) + Number(item.declared_voucher),
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {[item.card_machine_provider, item.card_machine_batch].filter(Boolean).join(" · ") || "-"}
                      </TableCell>
                      <TableCell><DifferenceBadge value={Number(item.difference_amount)} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default FechamentoCaixa;
