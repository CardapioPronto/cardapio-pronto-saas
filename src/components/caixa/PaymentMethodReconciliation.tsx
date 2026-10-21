import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatarMoeda } from "@/utils/dashboardUtils";
import {
  METHOD_LABEL,
  classifyOrderPayment,
  compareByMethod,
  type DeclaredByMethod,
  type ReconciliationMethod,
} from "@/lib/paymentMethods";
import type { SessionOrder } from "@/services/cashRegisterService";

interface Props {
  orders: SessionOrder[];
  declared: DeclaredByMethod;
  pendingOrders?: SessionOrder[];
  externalOrders?: SessionOrder[];
  reviewOrders?: SessionOrder[];
}

const DiffBadge = ({ value }: { value: number | null }) => {
  if (value === null) return <Badge variant="outline">Explicar</Badge>;
  if (Math.abs(value) < 0.01) return <Badge variant="secondary">Conferido</Badge>;
  return <Badge variant={value < 0 ? "destructive" : "outline"}>{value < 0 ? "Falta" : "Sobra"} {formatarMoeda(Math.abs(value))}</Badge>;
};

const PaymentMethodReconciliation = ({ orders, declared, pendingOrders = [], externalOrders = [], reviewOrders = [] }: Props) => {
  const [filter, setFilter] = useState<ReconciliationMethod | "todos">("todos");
  const rows = useMemo(() => compareByMethod(orders, declared), [orders, declared]);
  const classified = useMemo(() => orders.map((o) => ({ ...o, method: classifyOrderPayment(o) })), [orders]);
  const missing = classified.filter((o) => o.method === "sem_forma").length;
  const visible = filter === "todos" ? classified : classified.filter((o) => o.method === filter);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Conferência por forma de pagamento</CardTitle>
        <CardDescription>
          Recebimentos locais confirmados por data de pagamento, incluindo pedidos de turnos anteriores.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {reviewOrders.length > 0 && <p role="alert" className="text-destructive">{reviewOrders.length} pedidos a revisar: pagamento misto, data ausente, coleta iFood não identificada ou cancelamento/estorno. Justifique nas observações.</p>}
        {missing > 0 && (
          <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
            {missing} {missing === 1 ? "pedido está" : "pedidos estão"} sem forma de pagamento. Registre no PDV (Histórico de pedidos) antes de fechar.
          </p>
        )}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Forma</TableHead>
              <TableHead className="text-right">Pedidos</TableHead>
              <TableHead className="text-right">Sistema</TableHead>
              <TableHead className="text-right">Declarado</TableHead>
              <TableHead>Resultado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.method} className="cursor-pointer" onClick={() => setFilter(r.method)}>
                <TableCell className="font-medium">{METHOD_LABEL[r.method]}</TableCell>
                <TableCell className="text-right">{r.count}</TableCell>
                <TableCell className="text-right">{formatarMoeda(r.system)}</TableCell>
                <TableCell className="text-right">{r.declared === null ? "—" : formatarMoeda(r.declared)}</TableCell>
                <TableCell>{r.method === "online" ? <Badge variant="secondary">Fora do caixa</Badge> : <DiffBadge value={r.difference} />}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">
              Pedido a pedido {filter !== "todos" && `· ${METHOD_LABEL[filter]}`}
            </h3>
            {filter !== "todos" && <Button size="sm" variant="ghost" onClick={() => setFilter("todos")}>Ver todos</Button>}
          </div>
          {visible.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum pedido neste turno.</p>
          ) : (
            <div className="max-h-80 overflow-y-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Recebido em</TableHead>
                    <TableHead>Pedido</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Forma</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visible.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell>{o.paid_at ? new Date(o.paid_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "Sem data"}</TableCell>
                      <TableCell>#{o.order_number}</TableCell>
                      <TableCell className="max-w-40 truncate">{o.customer_name || "—"}</TableCell>
                      <TableCell>
                        <Badge variant={o.method === "sem_forma" ? "destructive" : "outline"}>{METHOD_LABEL[o.method]}</Badge>
                      </TableCell>
                      <TableCell className="text-right">{formatarMoeda(Number(o.total))}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
        {[
          { label: "Pagamentos pendentes", items: pendingOrders },
          { label: "Canais externos · repasse não confirmado", items: externalOrders },
          { label: "Pedidos a revisar", items: reviewOrders },
        ].filter(group => group.items.length > 0).map(group => (
          <details key={group.label} className="border-t pt-3">
            <summary className="cursor-pointer text-sm font-semibold">{group.label} ({group.items.length})</summary>
            <div className="max-h-80 overflow-auto"><Table><TableHeader><TableRow>
              <TableHead>Pedido</TableHead><TableHead>Pagamento</TableHead><TableHead>Data do pagamento</TableHead><TableHead className="text-right">Valor</TableHead>
            </TableRow></TableHeader><TableBody>{group.items.map(o => <TableRow key={o.id}>
              <TableCell>#{o.order_number}</TableCell><TableCell>{o.payment_method || "Sem forma"} · {o.payment_status === "paid" ? "Confirmado" : o.payment_status === "refunded" ? "Estornado" : "Sem confirmação"}</TableCell>
              <TableCell>{o.paid_at ? new Date(o.paid_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "Sem data"}</TableCell>
              <TableCell className="text-right">{formatarMoeda(Number(o.total))}</TableCell>
            </TableRow>)}</TableBody></Table></div>
          </details>
        ))}
      </CardContent>
    </Card>
  );
};

export default PaymentMethodReconciliation;
