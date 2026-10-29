/** One deterministic classification shared by cash UI and AI; amounts are gross BRL. */
export interface PaymentSplit {
  method: string;
  amount: number;
}

export interface CashActivityOrder {
  id: string;
  order_number: string;
  created_at: string;
  paid_at: string | null;
  customer_name: string | null;
  total: number;
  status: string;
  payment_method: string | null;
  payment_provider: string | null;
  payment_status: string | null;
  source: string | null;
  order_type: string;
  /** Parcelas do pagamento misto; quando presentes e a soma bate com o total, rateiam o recebimento por forma. */
  splits?: PaymentSplit[];
}

/** Soma das parcelas bate com o total do pedido (tolerância de 1 centavo). */
export function splitsMatchTotal(splits: PaymentSplit[] | undefined, total: number): boolean {
  if (!splits || splits.length === 0) return false;
  const sum = splits.reduce((acc, s) => acc + Math.round(Number(s.amount) * 100), 0) / 100;
  return Math.abs(sum - Math.round(Number(total) * 100) / 100) <= 0.01;
}

const canceled = new Set(['cancelled', 'canceled', 'cancelado', 'cancelada']);
const methods: Record<string, string> = {
  dinheiro: 'dinheiro', cash: 'dinheiro', pix: 'pix', credito: 'credito', credit: 'credito',
  credit_card: 'credito', cartao_credito: 'credito', debito: 'debito', debit: 'debito',
  debit_card: 'debito', cartao_debito: 'debito', voucher: 'voucher', vale: 'voucher', meal_voucher: 'voucher',
};
const normalized = (value: string | null) => (value ?? '').trim().toLowerCase();
const money = (orders: CashActivityOrder[]) => orders.reduce((sum, o) => sum + Math.round(Number(o.total) * 100), 0) / 100;
export function summarizeCashActivity(input: CashActivityOrder[], since: string, until: string) {
  const start = Date.parse(since);
  const end = Date.parse(until);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) throw new Error('Período inválido');
  const inPeriod = (value: string | null) => {
    const time = value ? Date.parse(value) : NaN;
    return time >= start && time < end;
  };
  const unique = [...new Map(input.map(o => [o.id, o])).values()];
  const sales = unique.filter(o => inPeriod(o.created_at) && !canceled.has(normalized(o.status)));
  const received: CashActivityOrder[] = [];
  const external: CashActivityOrder[] = [];
  const pending: CashActivityOrder[] = [];
  const review: CashActivityOrder[] = [];
  const byMethod: Record<string, { pedidos: number; total: number }> = {};
  for (const o of unique) {
    if (!inPeriod(o.created_at) && !inPeriod(o.paid_at)) continue;
    const payment = normalized(o.payment_status);
    if (canceled.has(normalized(o.status)) || payment === 'refunded' || payment === 'canceled') {
      if (payment === 'paid' || payment === 'refunded') review.push(o);
      continue;
    }
    if (payment !== 'paid') {
      if (inPeriod(o.created_at)) pending.push(o);
      continue;
    }
    if (!o.paid_at || !Number.isFinite(Date.parse(o.paid_at))) { review.push(o); continue; }
    if (!inPeriod(o.paid_at)) continue;
    const provider = normalized(o.payment_provider);
    // iFood import does not yet establish who collected: never assume cash from its method alone.
    if (normalized(o.source) === 'ifood' && (!provider || provider === 'pdv')) { review.push(o); continue; }
    if (provider && provider !== 'pdv') { external.push(o); continue; }
    const rawMethod = normalized(o.payment_method);
    if (rawMethod === 'misto') {
      // Pagamento misto só é recebimento quando as parcelas batem com o total; caso contrário, revisar.
      if (!splitsMatchTotal(o.splits, o.total)) { review.push(o); continue; }
      received.push(o);
      for (const split of o.splits!) {
        const splitMethod = methods[normalized(split.method)];
        if (!splitMethod) continue;
        const cur = byMethod[splitMethod] ?? { pedidos: 0, total: 0 };
        byMethod[splitMethod] = { pedidos: cur.pedidos + 1, total: (Math.round(cur.total * 100) + Math.round(Number(split.amount) * 100)) / 100 };
      }
      continue;
    }
    const method = methods[rawMethod];
    if (!method) { review.push(o); continue; }
    received.push(o);
    const current = byMethod[method] ?? { pedidos: 0, total: 0 };
    byMethod[method] = { pedidos: current.pedidos + 1, total: (Math.round(current.total * 100) + Math.round(Number(o.total) * 100)) / 100 };
  }
  return {
    count: sales.length, total: money(sales), orders: unique,
    sales, received, external, pending, review, byMethod, since, until,
    receivedTotal: money(received), externalTotal: money(external), pendingTotal: money(pending), reviewTotal: money(review),
    cashReceived: byMethod.dinheiro?.total ?? 0,
  };
}
export type CashShiftActivity = ReturnType<typeof summarizeCashActivity>;