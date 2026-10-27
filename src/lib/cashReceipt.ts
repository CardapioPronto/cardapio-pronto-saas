export const CASH_RECEIPT_MAX_BYTES = 6 * 1024 * 1024;
const extensions: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
export function validateCashReceipt(file: Pick<File, "size" | "type">): string | null {
  if (!extensions[file.type]) return "Selecione uma foto JPG, PNG ou WebP.";
  if (file.size <= 0 || file.size > CASH_RECEIPT_MAX_BYTES) return "A foto deve ter até 6 MB e não pode estar vazia.";
  return null;
}
export function cashReceiptPath(restaurantId: string, sessionId: string, userId: string, fileId: string, type: string) {
  const extension = extensions[type];
  if (!extension || [restaurantId, sessionId, userId, fileId].some(id => !/^[a-zA-Z0-9-]+$/.test(id))) throw new Error("Dados inválidos do comprovante.");
  return `${restaurantId}/${sessionId}/${userId}/${fileId}.${extension}`;
}