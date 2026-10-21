import { summarizeCashActivity, type CashActivityOrder } from "../../supabase/functions/_shared/cash-shift-activity";
import { REPORT_RPC_MAX_RANGE_DAYS } from "@/lib/reportLimits";

export const FINANCIAL_TIME_ZONE = "America/Sao_Paulo";
const DAY = 86_400_000;
export const financialDate = (date = new Date()) => new Intl.DateTimeFormat("en-CA", {
  timeZone: FINANCIAL_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit",
}).format(date);
export function financialPreset(days: number, now = new Date()) {
  const end = financialDate(now);
  const start = new Date(Date.parse(`${end}T12:00:00Z`) - (days - 1) * DAY).toISOString().slice(0, 10);
  return { start, end };
}
export function financialPeriod(start: string, end: string, now = new Date()) {
  const valid = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value)
    && Number.isFinite(Date.parse(`${value}T00:00:00Z`))
    && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
  if (!valid(start) || !valid(end) || start > end) throw new Error("Selecione um período válido.");
  const since = Date.parse(`${start}T00:00:00-03:00`);
  const nextDay = Date.parse(`${end}T00:00:00-03:00`) + DAY;
  if ((nextDay - since) / DAY > REPORT_RPC_MAX_RANGE_DAYS) throw new Error(`Período máximo de ${REPORT_RPC_MAX_RANGE_DAYS} dias.`);
  if (since > now.getTime()) throw new Error("A data inicial não pode estar no futuro.");
  return { since: new Date(since).toISOString(), until: new Date(Math.min(nextDay, now.getTime())).toISOString() };
}
export interface CashFlowClosing {
  id: string;
  closed_at: string;
  withdrawals: number;
}
const rounded = (value: number) => Math.round(value * 100) / 100;
export function buildRestaurantCashFlow(orders: CashActivityOrder[], closings: CashFlowClosing[], since: string, until: string) {
  const activity = summarizeCashActivity(orders, since, until);
  const daily = new Map<string, { date: string; sales: number; received: number; external: number; withdrawals: number; net: number }>();
  const row = (iso: string) => {
    const date = financialDate(new Date(iso));
    const existing = daily.get(date) ?? { date, sales: 0, received: 0, external: 0, withdrawals: 0, net: 0 };
    daily.set(date, existing);
    return existing;
  };
  for (const order of activity.sales) row(order.created_at).sales += Math.round(order.total * 100);
  for (const order of activity.received) if (order.paid_at) row(order.paid_at).received += Math.round(order.total * 100);
  for (const order of activity.external) if (order.paid_at) row(order.paid_at).external += Math.round(order.total * 100);
  const periodClosings = [...new Map(closings.map(c => [c.id, c])).values()].filter(c => c.closed_at >= since && c.closed_at < until);
  for (const closing of periodClosings) row(closing.closed_at).withdrawals += Math.round(Number(closing.withdrawals) * 100);
  const withdrawals = periodClosings.reduce((sum, c) => sum + Math.round(Number(c.withdrawals) * 100), 0) / 100;
  return {
    ...activity, withdrawals, netRecorded: rounded(activity.receivedTotal - withdrawals),
    daily: [...daily.values()].sort((a, b) => a.date.localeCompare(b.date)).map(d => ({
      date: d.date, sales: d.sales / 100, received: d.received / 100, external: d.external / 100,
      withdrawals: d.withdrawals / 100, net: (d.received - d.withdrawals) / 100,
    })),
  };
}