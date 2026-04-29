import { supabase } from "@/integrations/supabase/client";

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
}

export async function createPagarmeSubscription(input: CreateSubscriptionInput) {
  const { data, error } = await supabase.functions.invoke(
    "pagarme-create-subscription",
    { body: input },
  );
  if (error) throw new Error(error.message || "Falha ao criar assinatura");
  if (data?.success === false) throw new Error(data.error || "Falha ao criar assinatura");
  return data;
}

export interface CreateBoletoPixInput {
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

export async function createPagarmeBoletoPix(input: CreateBoletoPixInput) {
  const { data, error } = await supabase.functions.invoke(
    "pagarme-create-boleto-pix",
    { body: input },
  );
  if (error) throw new Error(error.message || "Falha ao criar assinatura");
  if (data?.success === false) throw new Error(data.error || "Falha ao criar assinatura");
  return data;
}

export async function cancelPagarmeSubscription(subscription_id: string) {
  const { data, error } = await supabase.functions.invoke(
    "pagarme-update-subscription",
    { body: { action: "cancel", subscription_id } },
  );
  if (error) throw new Error(error.message || "Falha ao cancelar");
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
  if (error) throw new Error(error.message || "Falha ao alterar plano");
  if (data?.success === false) throw new Error(data.error || "Falha ao alterar plano");
  return data;
}