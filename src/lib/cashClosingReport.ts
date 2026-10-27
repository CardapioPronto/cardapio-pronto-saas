import type { CashRegisterSession } from "@/services/cashRegisterService";
import { classifyOrderPayment, METHOD_LABEL, type PosPaymentMethod } from "@/lib/paymentMethods";

export interface FrozenOrder {
  id: string; order_number: string | number | null; total: number;
  paid_at: string | null; class: string | null; payment_method?: string | null;
}
export interface ClosingReport {
  session: CashRegisterSession;
  openedBy: string;
  closedBy: string;
  orders: FrozenOrder[];
  methods: { label: string; system: number | null; declared: number; difference: number | null }[];
  warnings: string[];
}
const round = (v: number) => Math.round(v * 100) / 100;
export function buildClosingReport(session: CashRegisterSession, names: Map<string, string> = new Map()): ClosingReport {
  if (session.status !== "closed") throw new Error("O relatório exige um caixa fechado.");
  const snapshot = session.closing_snapshot;
  const orders: FrozenOrder[] = Array.isArray(snapshot) ? snapshot.filter((o): o is FrozenOrder =>
    typeof o === "object" && o !== null && typeof o.id === "string" && Number.isFinite(Number(o.total))
  ).map(o => ({ ...o, total: Number(o.total) })) : [];
  const complete = Array.isArray(snapshot) && orders.length === snapshot.length;
  const received = orders.filter(o => o.class === "received");
  const methodsKnown = complete && received.every(o => typeof o.payment_method === "string") && session.system_received_total != null;
  const values: Record<Exclude<PosPaymentMethod, "misto">, number> = {
    dinheiro: round(Number(session.declared_cash) - Number(session.opening_amount) + Number(session.withdrawals) - Number(session.supplies_total ?? 0)),
    pix: Number(session.declared_pix), credito: Number(session.declared_credit),
    debito: Number(session.declared_debit), voucher: Number(session.declared_voucher),
  };
  const warnings: string[] = [];
  if (!complete) warnings.push("Este histórico não possui uma lista congelada completa de pedidos.");
  if (!methodsKnown) warnings.push("Conferência por forma indisponível neste histórico; os dados atuais dos pedidos não substituem o fechamento original.");
  if (session.system_received_total == null) warnings.push("Recebimentos não classificados neste fechamento antigo.");
  return {
    session, orders, warnings,
    openedBy: names.get(session.opened_by) ?? "Responsável indisponível",
    closedBy: session.closed_by ? names.get(session.closed_by) ?? "Responsável indisponível" : "Responsável indisponível",
    methods: (Object.keys(values) as (keyof typeof values)[]).map(method => {
      const system = method === "dinheiro" && session.closing_cash_received != null ? Number(session.closing_cash_received)
        : methodsKnown ? round(received.filter(o => classifyOrderPayment({ ...o, payment_method: o.payment_method ?? null, payment_provider: "pdv", payment_status: "paid" }) === method).reduce((sum, o) => sum + o.total, 0)) : null;
      return { label: METHOD_LABEL[method], system, declared: values[method], difference: system == null ? null : round(values[method] - system) };
    }),
  };
}
export const reportMoney = (value: number | null) => value == null ? "Não disponível" : value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const reportDate = (value: string | null) => value ? new Date(value).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "Não disponível";
export const CLASS_LABEL: Record<string, string> = { received: "Recebido local", external: "Externo bruto", pending: "Pendente", review: "Para revisar" };
export function closingReportRows(report: ClosingReport): (string | number)[][] {
  const s = report.session;
  return [
    ["Pubfy — Relatório de fechamento", s.id], ["Restaurante", s.restaurant_id],
    ["Abertura (São Paulo)", reportDate(s.opened_at)], ["Fechamento (São Paulo)", reportDate(s.closed_at)],
    ["Aberto por", report.openedBy], ["Fechado por", report.closedBy],
    ["Vendas", reportMoney(s.system_sales_total)], ["Recebimentos locais", reportMoney(s.system_received_total)],
    ["Pendentes", reportMoney(s.system_pending_total)], ["Externo bruto — repasse não confirmado", reportMoney(s.system_external_total)],
    ["Troco inicial", reportMoney(s.opening_amount)], ["Sangrias", reportMoney(s.withdrawals)],
    ["Suprimentos", reportMoney(s.supplies_total ?? null)], ["Dinheiro contado", reportMoney(s.declared_cash)],
    ["Diferença registrada", reportMoney(s.difference_amount)],
    ["Maquininha / lote", [s.card_machine_provider, s.card_machine_batch].filter(Boolean).join(" / ")],
    ["Observações", s.notes ?? "—"], ...report.warnings.map(w => ["Limitação", w]),
    [], ["Forma", "Sistema", "Declarado líquido", "Diferença"],
    ...report.methods.map(m => [m.label, reportMoney(m.system), reportMoney(m.declared), reportMoney(m.difference)]),
    [], ["Pedido", "Classificação congelada", "Recebido em (São Paulo)", "Valor"],
    ...report.orders.map(o => [o.order_number ?? o.id, CLASS_LABEL[o.class ?? ""] ?? "Venda sem recebimento no turno", reportDate(o.paid_at), reportMoney(o.total)]),
  ];
}
export function closingReportCsv(report: ClosingReport): string {
  const cell = (v: string | number) => {
    const text = String(v);
    const safe = /^[\s]*[=+\-@\t\r]/.test(text) ? `'${text}` : text;
    return `"${safe.replace(/"/g, '""')}"`;
  };
  return "\uFEFF" + closingReportRows(report).map(row => row.map(cell).join(";")).join("\r\n");
}