import { buildPaymentBreakdown } from "@/lib/orderPaymentBreakdown";
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
  /** Valor bruto cobrado do cliente. */
  gross_amount: number;
  platform_commission: number;
  pagarme_fee: number | null;
  net_repasse: number | null;
  paid_at: string | null;
  created_at: string;
}

export interface StatementSummary {
  /** Soma dos valores brutos dos pedidos pagos. */
  total_gross: number;
  total_platform_commission: number;
  total_pagarme_fees: number | null;
  total_net_repasse: number | null;
  paid_count: number;
  pending_count: number;
  average_gross_ticket: number;
  average_net_ticket: number | null;
  /** @deprecated Use total_gross */
  total_received: number;
  /** @deprecated Use average_gross_ticket */
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
    const [{ data: payments, error }, { data: settings, error: settingsError }] = await Promise.all([
      supabase
        .from("order_payments")
        .select("id, order_id, payment_method, status, amount, paid_at, created_at, raw_response")
        .eq("restaurant_id", restaurantId)
        .gte("created_at", sinceISO)
        .order("created_at", { ascending: false }),
      supabase
        .from("restaurant_payment_settings")
        .select("recipient_id, commission_type, commission_value")
        .eq("restaurant_id", restaurantId)
        .maybeSingle(),
    ]);

    if (error) throw error;
    if (settingsError) throw settingsError;

    const commissionSettings = {
      recipient_id: settings?.recipient_id ?? null,
      commission_type: (["percentage", "flat"].includes(String(settings?.commission_type))
        ? settings?.commission_type
        : "none") as "none" | "percentage" | "flat",
      commission_value: Number(settings?.commission_value || 0),
    };

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

    const entries: StatementEntry[] = rows.map(row => {
      const gross = Number(row.amount || 0);
      const breakdown = buildPaymentBreakdown(gross, row.raw_response, commissionSettings);
      return {
        id: row.id,
        order_id: row.order_id,
        order_number: orderInfo.get(row.order_id)?.order_number ?? null,
        customer_name: orderInfo.get(row.order_id)?.customer_name ?? null,
        payment_method: row.payment_method,
        status: row.status,
        gross_amount: breakdown.gross,
        platform_commission: breakdown.platform_commission,
        pagarme_fee: breakdown.pagarme_fee,
        net_repasse: breakdown.net_repasse,
        paid_at: row.paid_at ?? null,
        created_at: row.created_at,
      };
    });

    const paid = entries.filter(entry => entry.status === "paid");
    const totalGross = paid.reduce((sum, entry) => sum + entry.gross_amount, 0);
    const totalCommission = paid.reduce((sum, entry) => sum + entry.platform_commission, 0);
    const feesKnown = paid.every(entry => entry.pagarme_fee != null);
    const totalFees = feesKnown
      ? paid.reduce((sum, entry) => sum + (entry.pagarme_fee || 0), 0)
      : null;
    const netKnown = paid.every(entry => entry.net_repasse != null);
    const totalNet = netKnown
      ? paid.reduce((sum, entry) => sum + (entry.net_repasse || 0), 0)
      : null;

    const summary: StatementSummary = {
      total_gross: totalGross,
      total_platform_commission: totalCommission,
      total_pagarme_fees: totalFees,
      total_net_repasse: totalNet,
      paid_count: paid.length,
      pending_count: entries.filter(entry => entry.status === "pending").length,
      average_gross_ticket: paid.length ? totalGross / paid.length : 0,
      average_net_ticket: netKnown && paid.length ? (totalNet || 0) / paid.length : null,
      total_received: totalGross,
      average_ticket: paid.length ? totalGross / paid.length : 0,
    };

    return { entries, summary };
  },
};

export const formatBRL = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);

/** Pagar.me balance amounts come in cents. */
export const centsToBRL = (cents: number) => formatBRL((cents || 0) / 100);
