import { useEffect, useRef, useState } from "react";
import { History, Eye, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fetchCashAudit, CASH_AUDIT_PAGE_SIZE, type CashAuditEvent, type CashAuditFilters } from "@/services/cashAuditService";
import type { Json } from "@/integrations/supabase/types";
import { METHOD_LABEL } from "@/lib/paymentMethods";
import { formatarMoeda } from "@/utils/dashboardUtils";

const actionLabel = (type: string) => type === "payment_method_changed" ? "Pagamento corrigido" : type === "cash_session_closed" ? "Caixa fechado" : type;
const dateLabel = (value: string) => new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
const localDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const defaults = (): CashAuditFilters => {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - 29);
  return { startDate: localDate(start), endDate: localDate(end), action: "all", page: 0 };
};
const fields: Record<string, string> = { payment_method: "Forma de pagamento", payment_status: "Situação do pagamento", difference: "Diferença", received: "Recebido no caixa", notes: "Observações" };
const record = (value: Json | null): Record<string, Json | undefined> => value && typeof value === "object" && !Array.isArray(value) ? value : {};
const valueLabel = (field: string, value: Json | undefined) => {
  if (value == null || value === "") return "Não registrado";
  if (field === "difference" || field === "received") return formatarMoeda(Number(value));
  if (field === "payment_method") return METHOD_LABEL[String(value) as keyof typeof METHOD_LABEL] ?? String(value);
  if (field === "payment_status") return ({ paid: "Pago", pending: "Pendente", failed: "Falhou", refunded: "Estornado", not_required: "Não exigido" } as Record<string, string>)[String(value)] ?? String(value);
  return typeof value === "object" ? JSON.stringify(value) : String(value);
};

export default function CashAuditHistory({ restaurantId, refreshKey }: { restaurantId: string; refreshKey: string }) {
  const [filters, setFilters] = useState<CashAuditFilters>(defaults);
  const [result, setResult] = useState<{ events: CashAuditEvent[]; total: number }>({ events: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [selected, setSelected] = useState<CashAuditEvent | null>(null);
  const request = useRef(0);

  useEffect(() => {
    const id = ++request.current;
    setLoading(true);
    setError(null);
    setResult({ events: [], total: 0 });
    void fetchCashAudit(restaurantId, filters).then(data => {
      if (id === request.current) setResult(data);
    }).catch(reason => {
      if (id === request.current) setError(reason instanceof Error ? reason.message : "Não foi possível consultar o histórico.");
    }).finally(() => {
      if (id === request.current) setLoading(false);
    });
    return () => { request.current++; };
  }, [restaurantId, filters, reload, refreshKey]);

  const change = (patch: Partial<CashAuditFilters>) => setFilters(current => ({ ...current, ...patch, page: 0 }));
  const before = record(selected?.old_value ?? null);
  const after = record(selected?.new_value ?? null);
  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])];

  return <section aria-label="Auditoria do caixa" className="space-y-4 border-t pt-6">
    <div className="flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 text-lg font-semibold"><History className="h-5 w-5" />Auditoria do caixa</h2>
      <Button variant="outline" size="icon" aria-label="Atualizar auditoria" title="Atualizar auditoria" disabled={loading} onClick={() => setReload(value => value + 1)}><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /></Button>
    </div>
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="space-y-1.5"><Label htmlFor="cash-audit-start">Data inicial do histórico</Label><Input id="cash-audit-start" type="date" value={filters.startDate} onChange={event => change({ startDate: event.target.value })} /></div>
      <div className="space-y-1.5"><Label htmlFor="cash-audit-end">Data final do histórico</Label><Input id="cash-audit-end" type="date" value={filters.endDate} onChange={event => change({ endDate: event.target.value })} /></div>
      <div className="space-y-1.5"><Label htmlFor="cash-audit-action">Ação</Label><Select value={filters.action} onValueChange={value => change({ action: value as CashAuditFilters["action"] })}><SelectTrigger id="cash-audit-action"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todas as ações</SelectItem><SelectItem value="payment_method_changed">Pagamento corrigido</SelectItem><SelectItem value="cash_session_closed">Caixa fechado</SelectItem></SelectContent></Select></div>
    </div>
    {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : <>
      <Table><TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Responsável</TableHead><TableHead>Ação</TableHead><TableHead>Pedido / caixa</TableHead><TableHead className="text-right">Detalhes</TableHead></TableRow></TableHeader><TableBody>
        {result.events.length === 0 ? <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">{loading ? "Carregando histórico…" : "Nenhum evento no período."}</TableCell></TableRow> : result.events.map(event => <TableRow key={event.id}>
          <TableCell className="whitespace-nowrap">{dateLabel(event.created_at)}</TableCell><TableCell>{event.actorName || (event.actor_id ? "Usuário não disponível" : "Sistema")}</TableCell><TableCell>{actionLabel(event.event_type)}</TableCell><TableCell className="font-mono text-xs">{event.order_id ? `Pedido ${event.order_id.slice(0, 8)}` : event.session_id ? `Caixa ${event.session_id.slice(0, 8)}` : "—"}</TableCell><TableCell className="text-right"><Button variant="ghost" size="icon" aria-label={`Ver evento ${event.id}`} title="Ver detalhes" onClick={() => setSelected(event)}><Eye className="h-4 w-4" /></Button></TableCell>
        </TableRow>)}
      </TableBody></Table>
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground"><span>{result.total} eventos · Página {filters.page + 1} de {Math.max(1, Math.ceil(result.total / CASH_AUDIT_PAGE_SIZE))}</span><div className="flex gap-2"><Button size="icon" variant="outline" aria-label="Página anterior do histórico" disabled={loading || filters.page === 0} onClick={() => setFilters(current => ({ ...current, page: current.page - 1 }))}><ChevronLeft className="h-4 w-4" /></Button><Button size="icon" variant="outline" aria-label="Próxima página do histórico" disabled={loading || (filters.page + 1) * CASH_AUDIT_PAGE_SIZE >= result.total} onClick={() => setFilters(current => ({ ...current, page: current.page + 1 }))}><ChevronRight className="h-4 w-4" /></Button></div></div>
    </>}
    <Dialog open={Boolean(selected)} onOpenChange={open => { if (!open) setSelected(null); }}><DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>{selected ? actionLabel(selected.event_type) : "Evento do caixa"}</DialogTitle><DialogDescription>{selected ? `${dateLabel(selected.created_at)} · ${selected.actorName || (selected.actor_id ? "Usuário não disponível" : "Sistema")}` : ""}</DialogDescription></DialogHeader>
      {selected && <><p className="break-all text-sm text-muted-foreground">{selected.order_id ? `Pedido: ${selected.order_id}` : `Caixa: ${selected.session_id ?? "—"}`}</p><Table><TableHeader><TableRow><TableHead>Campo</TableHead><TableHead>Antes</TableHead><TableHead>Depois</TableHead></TableRow></TableHeader><TableBody>{keys.map(key => <TableRow key={key}><TableCell>{fields[key] ?? key}</TableCell><TableCell className="max-w-64 whitespace-pre-wrap break-words">{valueLabel(key, before[key])}</TableCell><TableCell className="max-w-64 whitespace-pre-wrap break-words">{valueLabel(key, after[key])}</TableCell></TableRow>)}</TableBody></Table></>}
    </DialogContent></Dialog>
  </section>;
}