import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { METHOD_LABEL, classifyOrderPayment } from "@/lib/paymentMethods";
import { FINANCIAL_TIME_ZONE } from "@/lib/restaurantCashFlow";
import { formatarMoeda } from "@/utils/dashboardUtils";
import type { CashActivityOrder } from "../../../supabase/functions/_shared/cash-shift-activity";

const labels: Record<string, string> = {
  finalizado: "Finalizado", pendente: "Pendente", preparo: "Em preparo", pronto: "Pronto",
  cancelado: "Cancelado", cancelled: "Cancelado", canceled: "Cancelado", paid: "Pago",
  pending: "Pendente", refunded: "Estornado", not_required: "Não confirmado", failed: "Falhou",
  aguardando_pagamento: "Aguardando pagamento", "em-andamento": "Em andamento",
};
export const financialTimestamp = (iso: string | null) => iso
  ? new Date(iso).toLocaleString("pt-BR", { timeZone: FINANCIAL_TIME_ZONE, dateStyle: "short", timeStyle: "short" }) : "—";

export function FinancialOrdersTable({ orders }: { orders: CashActivityOrder[] }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  useEffect(() => { setPage(1); }, [orders, search]);
  const filtered = useMemo(() => orders.filter(o => `${o.order_number} ${o.customer_name ?? ""}`.toLocaleLowerCase("pt-BR")
    .includes(search.toLocaleLowerCase("pt-BR"))).sort((a, b) => (b.paid_at ?? b.created_at).localeCompare(a.paid_at ?? a.created_at)), [orders, search]);
  const pages = Math.max(1, Math.ceil(filtered.length / 20));
  const currentPage = Math.min(page, pages);
  const visible = filtered.slice((currentPage - 1) * 20, currentPage * 20);
  return <div className="space-y-4">
    <div className="relative max-w-sm">
      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
      <Input aria-label="Buscar pedido ou cliente" placeholder="Pedido ou cliente" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
    </div>
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader><TableRow>
          <TableHead>Pedido / cliente</TableHead><TableHead>Criado em</TableHead><TableHead>Recebido em</TableHead>
          <TableHead>Forma / canal</TableHead><TableHead>Pedido</TableHead><TableHead>Pagamento</TableHead><TableHead className="text-right">Valor bruto</TableHead>
        </TableRow></TableHeader>
        <TableBody>{visible.map(order => <TableRow key={order.id}>
          <TableCell><span className="font-medium">#{order.order_number || order.id.slice(0, 8)}</span><span className="block max-w-48 truncate text-xs text-muted-foreground">{order.customer_name || "Sem cliente identificado"}</span></TableCell>
          <TableCell className="whitespace-nowrap">{financialTimestamp(order.created_at)}</TableCell>
          <TableCell className="whitespace-nowrap">{financialTimestamp(order.paid_at)}</TableCell>
          <TableCell><span className="whitespace-nowrap">{METHOD_LABEL[classifyOrderPayment(order)]}</span><span className="block text-xs text-muted-foreground">{order.payment_provider || order.source || "PDV"}</span></TableCell>
          <TableCell><Badge variant="outline">{labels[order.status] ?? order.status}</Badge></TableCell>
          <TableCell><Badge variant={order.payment_status === "paid" ? "secondary" : "outline"}>{labels[order.payment_status ?? ""] ?? order.payment_status ?? "Não confirmado"}</Badge></TableCell>
          <TableCell className="whitespace-nowrap text-right font-medium">{formatarMoeda(order.total)}</TableCell>
        </TableRow>)}{visible.length === 0 && <TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">Nenhum pedido encontrado.</TableCell></TableRow>}</TableBody>
      </Table>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
      <span>{filtered.length} pedidos · Página {currentPage} de {pages}</span>
      <div className="flex gap-2">
        <Button variant="outline" size="icon" aria-label="Página anterior" title="Página anterior" disabled={currentPage === 1} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
        <Button variant="outline" size="icon" aria-label="Próxima página" title="Próxima página" disabled={currentPage === pages} onClick={() => setPage(p => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
      </div>
    </div>
  </div>;
}