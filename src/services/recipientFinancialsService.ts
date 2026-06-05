import { supabase } from "@/integrations/supabase/client";

export interface RecipientBalance {
  currency: string;
  available_amount: number;
  waiting_funds_amount: number;
  transferred_amount: number;
}

export interface RecipientTransfer {
  id: string | null;
  amount: number;
  status: string | null;
  created_at: string | null;
  funding_date: string | null;
}

export interface RecipientFinancials {
  has_recipient: boolean;
  recipient_status: string;
  balance: RecipientBalance | null;
  transfers: RecipientTransfer[];
}

export interface StatementEntry {
  id: string;
  order_id: string;
  order_number: string | null;
  customer_name: string | null;
  payment_method: string;
  status: string;
  amount: number;
  paid_at: string | null;
  created_at: string;
}

export interface StatementSummary {
  total_received: number;
  paid_count: number;
  pending_count: number;
  average_ticket: number;
}

export interface StatementResult {
  entries: StatementEntry[];
  summary: StatementSummary;
}

export const recipientFinancialsService = {
  async getFinancials(restaurantId?: string): Promise<RecipientFinancials> {
    const { data, error } = await supabase.functions.invoke<RecipientFinancials>(
      "pagarme-recipient-financials",
      { body: { restaurant_id: restaurantId } },
    );
    if (error) throw new Error(error.message || "Falha ao consultar saldo");
    if (!data) throw new Error("Resposta vazia do servidor");
    return data;
  },

  async getStatement(restaurantId: string, sinceISO: string): Promise<StatementResult> {
    const { data: payments, error } = await supabase
      .from("order_payments")
      .select("id, order_id, payment_method, status, amount, paid_at, created_at")
      .eq("restaurant_id", restaurantId)
      .gte("created_at", sinceISO)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const rows = payments || [];
    const orderIds = Array.from(new Set(rows.map(row => row.order_id).filter(Boolean)));

    const orderInfo = new Map<string, { order_number: string | null; customer_name: string | null }>();
    if (orderIds.length) {
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("id, order_number, customer_name")
        .in("id", orderIds);
      if (ordersError) throw ordersError;
      for (const order of orders || []) {
        orderInfo.set(order.id, {
          order_number: order.order_number ?? null,
          customer_name: order.customer_name ?? null,
        });
      }
    }

    const entries: StatementEntry[] = rows.map(row => ({
      id: row.id,
      order_id: row.order_id,
      order_number: orderInfo.get(row.order_id)?.order_number ?? null,
      customer_name: orderInfo.get(row.order_id)?.customer_name ?? null,
      payment_method: row.payment_method,
      status: row.status,
      amount: Number(row.amount || 0),
      paid_at: row.paid_at ?? null,
      created_at: row.created_at,
    }));

    const paid = entries.filter(entry => entry.status === "paid");
    const totalReceived = paid.reduce((sum, entry) => sum + entry.amount, 0);
    const summary: StatementSummary = {
      total_received: totalReceived,
      paid_count: paid.length,
      pending_count: entries.filter(entry => entry.status === "pending").length,
      average_ticket: paid.length ? totalReceived / paid.length : 0,
    };

    return { entries, summary };
  },
};

export const formatBRL = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);

/** Pagar.me balance amounts come in cents. */
export const centsToBRL = (cents: number) => formatBRL((cents || 0) / 100);
