import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { ArrowDownLeft, ArrowUpRight, Building2, RefreshCw, Wallet } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { FinancialOrdersTable, financialTimestamp } from "@/components/financeiro/FinancialOrdersTable";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRestaurantAccess } from "@/hooks/useRestaurantAccess";
import { usePermissionsV2 } from "@/hooks/usePermissionsV2";
import { financialDate, financialPeriod, financialPreset } from "@/lib/restaurantCashFlow";
import { METHOD_LABEL } from "@/lib/paymentMethods";
import { fetchRestaurantCashFlow } from "@/services/restaurantCashFlowService";
import { formatarMoeda } from "@/utils/dashboardUtils";

const Financeiro = () => {
  const { activeRestaurant, activeRestaurantId, restaurants, switchRestaurant, switching, loading } = useRestaurantAccess();
  const { hasPermission, loading: permissionsLoading } = usePermissionsV2();
  const [period, setPeriod] = useState(() => financialPreset(7));
  const [tab, setTab] = useState("fluxo");
  const [receiptFilter, setReceiptFilter] = useState("local");
  const [switchError, setSwitchError] = useState<string | null>(null);
  let validationError: string | null = null;
  try { financialPeriod(period.start, period.end); } catch (error) { validationError = error instanceof Error ? error.message : "Período inválido."; }
  const query = useQuery({
    queryKey: ["restaurant-cash-flow", activeRestaurantId, period.start, period.end],
    queryFn: () => fetchRestaurantCashFlow(activeRestaurantId ?? "", period.start, period.end),
    enabled: Boolean(activeRestaurantId) && !loading && !switching && !permissionsLoading && hasPermission("reports_view") && !validationError,
    refetchInterval: 60_000, refetchIntervalInBackground: false,
  });
  const data = !loading && !switching && !validationError && !query.isError ? query.data : undefined;
  const error = switchError || validationError || (query.isError ? (query.error instanceof Error ? query.error.message : "Não foi possível consultar o financeiro.") : null);
  const busy = loading || switching || permissionsLoading || query.isFetching;
  const selectRestaurant = async (id: string) => {
    setSwitchError(null);
    try { await switchRestaurant(id); } catch (error) { setSwitchError(error instanceof Error ? error.message : "Não foi possível trocar o restaurante."); }
  };
  const receipts = data ? ({ local: data.received, external: data.external, pending: data.pending, review: data.review }[receiptFilter] ?? []) : [];

  return <DashboardLayout title="Financeiro">
    <Helmet><title>Financeiro do restaurante | Pubfy</title><meta name="description" content="Acompanhamento financeiro por restaurante: fluxo registrado, recebimentos e pedidos por período." /></Helmet>
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0"><div className="flex items-center gap-2 text-primary"><Building2 className="h-5 w-5 shrink-0" /><span className="text-sm font-medium">Acompanhamento financeiro</span></div>
          <h2 className="mt-1 break-words text-2xl font-semibold">{activeRestaurant?.restaurant_name || "Restaurante"}</h2>
          <p className="mt-1 text-xs text-muted-foreground">Horário de São Paulo{data ? ` · Atualizado em ${financialTimestamp(data.until)}` : ""}</p>
        </div>
        <Button variant="outline" onClick={() => void query.refetch()} disabled={busy || Boolean(validationError) || !activeRestaurantId}>
          <RefreshCw className={`mr-2 h-4 w-4 ${busy ? "animate-spin" : ""}`} />Atualizar
        </Button>
      </header>

      <section aria-label="Filtros financeiros" className="grid gap-4 border-y py-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="space-y-2"><Label htmlFor="financeiro-restaurante">Restaurante</Label>
          <Select value={activeRestaurantId ?? ""} onValueChange={id => void selectRestaurant(id)} disabled={loading || switching || restaurants.length <= 1}>
            <SelectTrigger id="financeiro-restaurante"><SelectValue placeholder="Selecione o restaurante" /></SelectTrigger>
            <SelectContent>{restaurants.map(r => <SelectItem key={r.restaurant_id} value={r.restaurant_id}>{r.restaurant_name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-2"><Label htmlFor="financeiro-inicio">Data inicial</Label><Input id="financeiro-inicio" type="date" max={period.end} value={period.start} onChange={e => setPeriod(p => ({ ...p, start: e.target.value }))} /></div>
        <div className="space-y-2"><Label htmlFor="financeiro-fim">Data final</Label><Input id="financeiro-fim" type="date" min={period.start} max={financialDate()} value={period.end} onChange={e => setPeriod(p => ({ ...p, end: e.target.value }))} /></div>
        <div className="flex flex-wrap items-end gap-2">{[1, 7, 30].map(days => {
          const preset = financialPreset(days);
          return <Button key={days} variant={period.start === preset.start && period.end === preset.end ? "default" : "outline"} onClick={() => setPeriod(preset)}>{days === 1 ? "Hoje" : `${days} dias`}</Button>;
        })}</div>
      </section>

      {error && <Alert variant="destructive"><AlertTitle>Consulta indisponível</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
      {!loading && !activeRestaurantId && <Alert><AlertTitle>Nenhum restaurante disponível</AlertTitle><AlertDescription>Não há unidade vinculada à sua conta.</AlertDescription></Alert>}
      {busy && !data && !error && <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-28" />)}</div>}
      {data && <>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric title="Vendas no período" value={data.total} detail={`${data.count} pedidos não cancelados`} />
          <Metric title="Recebimentos locais" value={data.receivedTotal} detail={`${data.received.length} pedidos pagos no período`} />
          <Metric title="Pagamentos pendentes" value={data.pendingTotal} detail={`${data.pending.length} pedidos criados no período`} />
          <Metric title="Recebido por canal externo" value={data.externalTotal} detail="Bruto cobrado · repasse não confirmado" />
        </div>
        {data.review.length > 0 && <Alert><AlertTitle>{data.review.length} pedidos para revisar · {formatarMoeda(data.reviewTotal)}</AlertTitle><AlertDescription>Pagamentos mistos, estornos ou dados insuficientes.<Button variant="link" className="px-2" onClick={() => { setTab("recebimentos"); setReceiptFilter("review"); }}>Ver pedidos</Button></AlertDescription></Alert>}

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid h-auto w-full grid-cols-3 sm:w-fit"><TabsTrigger value="fluxo">Fluxo de caixa</TabsTrigger><TabsTrigger value="recebimentos">Recebimentos</TabsTrigger><TabsTrigger value="pedidos">Pedidos</TabsTrigger></TabsList>
          <TabsContent value="fluxo" className="mt-6 space-y-6">
            <section className="grid gap-5 border-b pb-5 md:grid-cols-3">
              <FlowTotal icon={ArrowDownLeft} label="Entradas locais confirmadas" value={data.receivedTotal} />
              <FlowTotal icon={ArrowUpRight} label="Sangrias em caixas fechados" value={data.withdrawals} />
              <FlowTotal icon={Wallet} label="Saldo do movimento registrado" value={data.netRecorded} />
            </section>
            <p className="text-sm text-muted-foreground">Saldo parcial: recebimentos locais menos sangrias declaradas na data do fechamento. Não inclui saldo inicial, despesas, suprimentos, sangrias de caixas abertos ou repasses bancários.</p>
            <section className="space-y-4"><h3 className="text-lg font-semibold">Movimento por dia</h3>
              {data.daily.length > 0 ? <div className="h-72 min-w-0 w-full" aria-label="Gráfico de entradas e sangrias por dia"><ResponsiveContainer width="100%" height="100%"><BarChart data={data.daily}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" /><XAxis dataKey="date" tickFormatter={d => String(d).slice(5).split("-").reverse().join("/")} tick={{ fontSize: 12 }} /><YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value: number) => formatarMoeda(value)} /><Legend />
                <Bar dataKey="received" name="Entradas locais" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} /><Bar dataKey="withdrawals" name="Sangrias declaradas" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
              </BarChart></ResponsiveContainer></div> : <p className="py-8 text-center text-muted-foreground">Nenhum movimento registrado no período.</p>}
              <div className="overflow-x-auto rounded-md border"><Table><TableHeader><TableRow><TableHead>Dia</TableHead><TableHead className="text-right">Vendas</TableHead><TableHead className="text-right">Entradas locais</TableHead><TableHead className="text-right">Canal externo</TableHead><TableHead className="text-right">Sangrias</TableHead><TableHead className="text-right">Saldo parcial</TableHead></TableRow></TableHeader>
                <TableBody>{data.daily.map(day => <TableRow key={day.date}><TableCell className="whitespace-nowrap">{day.date.split("-").reverse().join("/")}</TableCell>{[day.sales, day.received, day.external, day.withdrawals, day.net].map((value, index) => <TableCell key={index} className="whitespace-nowrap text-right">{formatarMoeda(value)}</TableCell>)}</TableRow>)}{data.daily.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Sem movimento.</TableCell></TableRow>}</TableBody>
              </Table></div>
            </section>
          </TabsContent>
          <TabsContent value="recebimentos" className="mt-6 space-y-6">
            <section className="space-y-3"><h3 className="text-lg font-semibold">Recebimentos locais por forma</h3><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{(["dinheiro", "pix", "credito", "debito", "voucher"] as const).map(method => <Metric key={method} title={METHOD_LABEL[method]} value={data.byMethod[method]?.total ?? 0} detail={`${data.byMethod[method]?.pedidos ?? 0} pedidos`} />)}</div></section>
            <div className="max-w-sm space-y-2"><Label htmlFor="financeiro-tipo">Situação dos recebimentos</Label><Select value={receiptFilter} onValueChange={setReceiptFilter}><SelectTrigger id="financeiro-tipo"><SelectValue /></SelectTrigger><SelectContent>
              <SelectItem value="local">Locais confirmados ({data.received.length})</SelectItem><SelectItem value="external">Canais externos ({data.external.length})</SelectItem><SelectItem value="pending">Pendentes ({data.pending.length})</SelectItem><SelectItem value="review">Para revisar ({data.review.length})</SelectItem>
            </SelectContent></Select></div>
            <FinancialOrdersTable orders={receipts} />
          </TabsContent>
          <TabsContent value="pedidos" className="mt-6 space-y-4"><div className="flex flex-wrap items-center gap-3"><h3 className="text-lg font-semibold">Pedidos criados ou pagos no período</h3><Badge variant="secondary">{data.orders.length} pedidos</Badge></div><FinancialOrdersTable orders={data.orders} /></TabsContent>
        </Tabs>
      </>}
    </div>
  </DashboardLayout>;
};
function Metric({ title, value, detail }: { title: string; value: number; detail: string }) {
  return <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">{title}</p><p className="mt-2 break-words text-2xl font-semibold tabular-nums">{formatarMoeda(value)}</p><p className="mt-2 text-xs text-muted-foreground">{detail}</p></CardContent></Card>;
}
function FlowTotal({ icon: Icon, label, value }: { icon: typeof Wallet; label: string; value: number }) {
  return <div><p className="flex items-center gap-2 text-sm text-muted-foreground"><Icon className="h-4 w-4 shrink-0" />{label}</p><p className="mt-2 break-words text-2xl font-semibold tabular-nums">{formatarMoeda(value)}</p></div>;
}
export default Financeiro;