import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

async function extractEdgeFunctionError(
  data: unknown,
  error: { message?: string; context?: Response } | null,
): Promise<string> {
  if (data && typeof data === "object" && "error" in data) {
    const message = (data as { error?: unknown }).error;
    if (typeof message === "string" && message.trim()) return message;
  }

  if (error instanceof FunctionsHttpError) {
    const body = await error.context.clone().json().catch(() => null) as
      | { error?: string; message?: string }
      | null;
    if (body?.error) return body.error;
    if (body?.message) return body.message;
  }

  if (error?.context) {
    const body = await error.context.clone().json().catch(() => null) as
      | { error?: string; message?: string }
      | null;
    if (body?.error) return body.error;
    if (body?.message) return body.message;
  }

  return error?.message || "Falha ao criar assinatura";
}

export interface CreateSubscriptionInput {
  local_plan_id: string;
  billing_cycle: "monthly" | "yearly";
  customer: {
    name: string;
    email: string;
    document: string;
    phone: string;
    document_type?: "cpf" | "cnpj";
  };
  card: {
    number: string;
    holder_name: string;
    exp_month: number | string;
    exp_year: number | string;
    cvv: string;
  };
  billing_address?: {
    zip_code: string;
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
  };
}

export async function createPagarmeSubscription(input: CreateSubscriptionInput) {
  const { data, error } = await supabase.functions.invoke(
    "pagarme-create-subscription",
    { body: input },
  );
  if (error) throw new Error(await extractEdgeFunctionError(data, error));
  if (data?.success === false) throw new Error(data.error || "Falha ao criar assinatura");
  return data;
}

export interface CreateOfflineSubscriptionInput {
  local_plan_id: string;
  billing_cycle: "monthly" | "yearly";
  payment_method: "boleto" | "pix";
  customer: {
    name: string;
    email: string;
    document: string;
    phone: string;
    document_type?: "cpf" | "cnpj";
  };
}

/** @deprecated Use CreateOfflineSubscriptionInput */
export type CreateBoletoPixInput = CreateOfflineSubscriptionInput;

export async function createPagarmeBoletoPix(input: CreateOfflineSubscriptionInput) {
  const { data, error } = await supabase.functions.invoke(
    "pagarme-create-boleto-pix",
    { body: input },
  );
  if (error) throw new Error(await extractEdgeFunctionError(data, error));
  if (data?.success === false) throw new Error(data.error || "Falha ao criar assinatura");
  return data;
}

export async function syncPagarmePendingPayment(subscription_id: string) {
  const { data, error } = await supabase.functions.invoke(
    "pagarme-update-subscription",
    { body: { action: "sync_payment", subscription_id } },
  );
  if (error) throw new Error(await extractEdgeFunctionError(data, error));
  if (data?.success === false) throw new Error(data.error || "Falha ao sincronizar pagamento");
  return data;
}

export async function cancelPagarmeSubscription(subscription_id: string) {
  const { data, error } = await supabase.functions.invoke(
    "pagarme-update-subscription",
    { body: { action: "cancel", subscription_id } },
  );
  if (error) throw new Error(await extractEdgeFunctionError(data, error));
  if (data?.success === false) throw new Error(data.error || "Falha ao cancelar");
  return data;
}

export async function changePagarmeSubscriptionCycle(
  subscription_id: string,
  billing_cycle: "monthly" | "yearly",
) {
  const { data, error } = await supabase.functions.invoke(
    "pagarme-update-subscription",
    { body: { action: "change_plan", subscription_id, billing_cycle } },
  );
  if (error) throw new Error(await extractEdgeFunctionError(data, error));
  if (data?.success === false) throw new Error(data.error || "Falha ao alterar plano");
  return data;
}

export interface PagarmeReceipt {
  charge_id: string | null;
  status: string | null;
  amount: number | null;
  paid_amount: number | null;
  payment_method: string | null;
  paid_at: string | null;
  created_at: string | null;
  due_at: string | null;
  boleto_url: string | null;
  boleto_barcode: string | null;
  boleto_line: string | null;
  pix_qr_code: string | null;
  pix_qr_code_url: string | null;
  pix_expires_at: string | null;
  card_brand: string | null;
  card_last_four: string | null;
  acquirer_tid: string | null;
  acquirer_nsu: string | null;
}

export interface PagarmeReceiptResponse {
  success: boolean;
  latest: PagarmeReceipt | null;
  last_paid: PagarmeReceipt | null;
  history: PagarmeReceipt[];
  error?: string;
}

export async function getPagarmeReceipt(
  subscription_id: string,
): Promise<PagarmeReceiptResponse> {
  const { data, error } = await supabase.functions.invoke(
    "pagarme-get-receipt",
    { body: { subscription_id } },
  );
  if (error) throw new Error(await extractEdgeFunctionError(data, error));
  if (data?.success === false) throw new Error(data.error || "Falha ao buscar comprovante");
  return data as PagarmeReceiptResponse;
}
