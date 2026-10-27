import { useEffect, useState } from "react";
import { Download, Printer, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fetchClosingReport } from "@/services/cashClosingReportService";
import ClosedCashReceipts from "./ClosedCashReceipts";
import { closingReportCsv, closingReportRows, reportMoney, reportDate, CLASS_LABEL, type ClosingReport } from "@/lib/cashClosingReport";

export default function CashClosingReportDialog({ restaurantId, sessionId, onClose }: {
  restaurantId: string; sessionId: string | null; onClose: () => void;
}) {
  const [report, setReport] = useState<ClosingReport | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [page, setPage] = useState(0);
  useEffect(() => {
    let active = true;
    setReport(null); setError(""); setPage(0);
    if (sessionId) void fetchClosingReport(restaurantId, sessionId).then(result => {
      if (active) setReport(result);
    }).catch(() => { if (active) setError("Não foi possível carregar este fechamento."); });
    return () => { active = false; };
  }, [restaurantId, sessionId, attempt]);
  const exportCsv = () => {
    if (!report) return;
    const url = URL.createObjectURL(new Blob([closingReportCsv(report)], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = `fechamento-${report.session.id}.csv`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const print = () => {
    if (!report) return;
    const target = window.open("", "_blank");
    if (!target) { setError("Permita abrir uma nova janela para imprimir o relatório."); return; }
    target.opener = null;
    const doc = target.document;
    doc.title = `Pubfy — Fechamento ${report.session.id}`;
    const heading = doc.createElement("h1"); heading.textContent = "Pubfy — Fechamento de caixa"; doc.body.append(heading);
    const table = doc.createElement("table");
    for (const row of closingReportRows(report)) {
      const tr = doc.createElement("tr");
      for (const value of row) { const td = doc.createElement("td"); td.textContent = String(value); tr.append(td); }
      table.append(tr);
    }
    doc.body.append(table);
    target.focus(); target.print();
  };
  const rows = report ? closingReportRows(report).slice(0, 16) : [];
  return <Dialog open={Boolean(sessionId)} onOpenChange={open => { if (!open) onClose(); }}>
    <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] max-w-4xl overflow-y-auto">
      <DialogHeader><DialogTitle>Relatório de fechamento</DialogTitle><DialogDescription>Valores registrados no encerramento · horário de São Paulo</DialogDescription></DialogHeader>
      {error && <div role="alert" className="text-sm text-destructive">{error}<Button className="ml-2" variant="outline" size="sm" onClick={() => setAttempt(v => v + 1)}><RefreshCw className="mr-2 h-4 w-4" />Tentar novamente</Button></div>}
      {!report && !error && <p role="status">Carregando fechamento…</p>}
      {report && <>
        <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={exportCsv}><Download className="mr-2 h-4 w-4" />Exportar CSV</Button><Button variant="outline" onClick={print}><Printer className="mr-2 h-4 w-4" />Imprimir / PDF</Button></div>
        {report.warnings.map(w => <p key={w} className="text-sm text-muted-foreground">{w}</p>)}
        <dl className="grid gap-2 sm:grid-cols-2">{rows.slice(1).map((row, i) => <div key={i} className="min-w-0 border-b py-2"><dt className="text-xs text-muted-foreground">{row[0]}</dt><dd className="break-words text-sm font-medium">{row[1]}</dd></div>)}</dl>
        {report.session.notes && <p className="whitespace-pre-wrap break-words text-sm">Observações: {report.session.notes}</p>}
        <Table><TableHeader><TableRow><TableHead>Forma</TableHead><TableHead>Sistema</TableHead><TableHead>Declarado líquido</TableHead><TableHead>Diferença</TableHead></TableRow></TableHeader><TableBody>{report.methods.map(m => <TableRow key={m.label}><TableCell>{m.label}</TableCell><TableCell>{reportMoney(m.system)}</TableCell><TableCell>{reportMoney(m.declared)}</TableCell><TableCell>{reportMoney(m.difference)}</TableCell></TableRow>)}</TableBody></Table>
        <h3 className="font-semibold">Pedidos congelados ({report.orders.length})</h3>
        <ClosedCashReceipts key={report.session.id} restaurantId={restaurantId} sessionId={report.session.id} />
        <Table><TableHeader><TableRow><TableHead>Pedido</TableHead><TableHead>Classificação</TableHead><TableHead>Recebido em</TableHead><TableHead>Valor</TableHead></TableRow></TableHeader><TableBody>{report.orders.slice(page * 25, (page + 1) * 25).map(o => <TableRow key={o.id}><TableCell>{o.order_number ?? o.id}</TableCell><TableCell>{CLASS_LABEL[o.class ?? ""] ?? "Venda sem recebimento no turno"}</TableCell><TableCell>{reportDate(o.paid_at)}</TableCell><TableCell>{reportMoney(o.total)}</TableCell></TableRow>)}</TableBody></Table>
        {report.orders.length > 25 && <div className="flex items-center justify-between gap-2"><Button variant="outline" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Anterior</Button><span className="text-sm">{page + 1} / {Math.ceil(report.orders.length / 25)}</span><Button variant="outline" disabled={(page + 1) * 25 >= report.orders.length} onClick={() => setPage(p => p + 1)}>Próxima</Button></div>}
      </>}
    </DialogContent>
  </Dialog>;
}