import { supabase } from "@/integrations/supabase/client";

type WebhookAdminAction = "reprocess_event" | "sync_order_payment";

export async function invokePagarmeWebhookAdmin<T>(
  action: WebhookAdminAction,
  body: Record<string, string>,
): Promise<T> {
  const { data, error } = await supabase.functions.invoke("pagarme-webhook-admin", {
    body: { action, ...body },
  });

  if (error) {
    throw new Error(error.message || "Falha na operação administrativa do webhook");
  }
  if (data?.error) {
    throw new Error(String(data.error));
  }
  return data as T;
}

export const reprocessPagarmeWebhookEvent = (eventLogId: string) =>
  invokePagarmeWebhookAdmin<{ success: boolean }>("reprocess_event", { eventLogId });

export const syncPagarmeOrderPayment = (orderId: string) =>
  invokePagarmeWebhookAdmin<{ success: boolean; remote_status?: string }>(
    "sync_order_payment",
    { orderId },
  );
