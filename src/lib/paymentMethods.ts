export type PosPaymentMethod = "dinheiro" | "pix" | "credito" | "debito" | "voucher" | "misto";
export type ReconciliationMethod = PosPaymentMethod | "online" | "sem_forma";

export const POS_PAYMENT_METHODS: { value: PosPaymentMethod; label: string }[] = [
  { value: "dinheiro", label: "Dinheiro" },
  { value: "pix", label: "PIX" },
  { value: "credito", label: "Crédito" },
  { value: "debito", label: "Débito" },
  { value: "voucher", label: "Voucher / refeição" },
  { value: "misto", label: "Misto (mais de uma)" },
];

export const METHOD_LABEL: Record<ReconciliationMethod, string> = {
  dinheiro: "Dinheiro",
  pix: "PIX",
  credito: "Crédito",
  debito: "Débito",
  voucher: "Voucher",
  misto: "Misto",
  online: "Pago online",
  sem_forma: "Sem forma registrada",
};

export interface ReconciliationOrder {
  id: string;
  total: number;
  payment_method: string | null;
  payment_provider: string | null;
  payment_status: string | null;
  /** Parcelas do pagamento misto; quando a soma bate com o total, rateiam a conferência por forma. */
  splits?: { method: string; amount: number }[];
}

const ALIASES: Record<string, PosPaymentMethod> = {
  dinheiro: "dinheiro", cash: "dinheiro",
  pix: "pix",
  credito: "credito", credit: "credito", credit_card: "credito", cartao_credito: "credito",
  debito: "debito", debit: "debito", debit_card: "debito", cartao_debito: "debito",
  voucher: "voucher", vale: "voucher", meal_voucher: "voucher",
  misto: "misto",
};

/** Classifica o pedido para a conferência: online fica fora da gaveta/maquininha. */
export function classifyOrderPayment(order: ReconciliationOrder): ReconciliationMethod {
  const provider = (order.payment_provider ?? "").toLowerCase();
  if (provider && provider !== "pdv" && (order.payment_status ?? "").toLowerCase() === "paid") return "online";
  const method = ALIASES[(order.payment_method ?? "").toLowerCase().trim()];
  return method ?? "sem_forma";
}

export interface DeclaredByMethod {
  dinheiro: number; // vendas em dinheiro = gaveta - troco + sangrias
  pix: number;
  credito: number;
  debito: number;
  voucher: number;
}

export interface MethodRow {
  method: ReconciliationMethod;
  count: number;
  system: number;
  declared: number | null;
  difference: number | null;
}

const round = (v: number) => Math.round(v * 100) / 100;

/** Parcelas válidas: soma bate com o total do pedido (tolerância de 1 centavo). */
export function splitsMatchTotal(splits: { method: string; amount: number }[] | undefined, total: number): boolean {
  if (!splits || splits.length === 0) return false;
  const sum = splits.reduce((acc, s) => acc + Math.round(Number(s.amount) * 100), 0) / 100;
  return Math.abs(sum - round(Number(total))) <= 0.01;
}

/**
 * Compara, forma a forma, o que o PDV registrou com o que foi declarado.
 * "Misto" com parcelas válidas é rateado nas formas correspondentes; sem parcelas
 * válidas, "misto" e "sem forma" não têm declarado próprio: entram como pendência a explicar.
 */
export function compareByMethod(orders: ReconciliationOrder[], declared: DeclaredByMethod): MethodRow[] {
  const acc = new Map<ReconciliationMethod, { count: number; total: number }>();
  const bump = (key: ReconciliationMethod, count: number, total: number) => {
    const cur = acc.get(key) ?? { count: 0, total: 0 };
    cur.count += count;
    cur.total += total;
    acc.set(key, cur);
  };
  for (const o of orders) {
    const key = classifyOrderPayment(o);
    if (key === "misto" && splitsMatchTotal(o.splits, o.total)) {
      for (const split of o.splits!) {
        const method = ALIASES[(split.method ?? "").toLowerCase().trim()];
        if (method && method !== "misto") bump(method, 1, Number(split.amount ?? 0));
      }
      continue;
    }
    bump(key, 1, Number(o.total ?? 0));
  }
  const keys: (keyof DeclaredByMethod)[] = ["dinheiro", "pix", "credito", "debito", "voucher"];
  const rows: MethodRow[] = keys.map((k) => {
    const s = acc.get(k) ?? { count: 0, total: 0 };
    const d = round(declared[k]);
    return { method: k, count: s.count, system: round(s.total), declared: d, difference: round(d - s.total) };
  });
  for (const extra of ["misto", "online", "sem_forma"] as const) {
    const s = acc.get(extra);
    if (s) rows.push({ method: extra, count: s.count, system: round(s.total), declared: null, difference: null });
  }
  return rows;
}
