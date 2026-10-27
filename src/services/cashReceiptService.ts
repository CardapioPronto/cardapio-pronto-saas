import { supabase } from "@/integrations/supabase/client";
import { cashReceiptPath, validateCashReceipt } from "@/lib/cashReceipt";
export async function uploadCashReceipt(file: File, restaurantId: string, sessionId: string, userId: string) {
  const invalid = validateCashReceipt(file);
  if (invalid) throw new Error(invalid);
  const path = cashReceiptPath(restaurantId, sessionId, userId, crypto.randomUUID(), file.type);
  const { error } = await supabase.storage.from("cash-receipts").upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  return path;
}
export async function getCashReceiptUrl(path: string) {
  const { data, error } = await supabase.storage.from("cash-receipts").createSignedUrl(path, 60);
  if (error) throw error;
  return data.signedUrl;
}