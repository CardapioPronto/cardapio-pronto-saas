import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ upload: vi.fn(), signed: vi.fn(), insert: vi.fn(), auth: vi.fn(), from: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  storage: { from: mocks.from }, from: () => ({ insert: mocks.insert }), auth: { getUser: mocks.auth },
} }));
import { getCashReceiptUrl } from "./cashReceiptService";
import { addCashMovement } from "./cashMovementService";
beforeEach(() => {
  vi.clearAllMocks(); mocks.from.mockReturnValue({ upload: mocks.upload, createSignedUrl: mocks.signed });
  mocks.auth.mockResolvedValue({ data: { user: { id: "u1" } } });
  mocks.insert.mockResolvedValue({ error: null });
});
it("solicita URL privada válida por 60 segundos", async () => {
  mocks.signed.mockResolvedValue({ data: { signedUrl: "https://example.test/private" }, error: null });
  expect(await getCashReceiptUrl("r1/s1/u1/f1.jpg")).toBe("https://example.test/private");
  expect(mocks.from).toHaveBeenCalledWith("cash-receipts");
  expect(mocks.signed).toHaveBeenCalledWith("r1/s1/u1/f1.jpg", 60);
});
it("não registra movimento se o upload falhar", async () => {
  mocks.upload.mockResolvedValue({ error: new Error("Upload negado") });
  await expect(addCashMovement({ restaurantId: "r1", sessionId: "s1", kind: "sangria", amount: 30, reason: "Depósito", photo: { size: 100, type: "image/jpeg" } as File })).rejects.toThrow("Upload negado");
  expect(mocks.insert).not.toHaveBeenCalled();
});
it("vincula foto no mesmo lançamento sem permitir substituição", async () => {
  mocks.upload.mockResolvedValue({ error: null });
  await addCashMovement({ restaurantId: "r1", sessionId: "s1", kind: "sangria", amount: 30, reason: "Depósito", photo: { size: 100, type: "image/jpeg" } as File });
  expect(mocks.upload).toHaveBeenCalledWith(expect.stringMatching(/^r1\/s1\/u1\/.+\.jpg$/), expect.anything(), { contentType: "image/jpeg", upsert: false });
  expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({ amount: 30, receipt_path: expect.stringMatching(/^r1\/s1\/u1\/.+\.jpg$/) }));
});