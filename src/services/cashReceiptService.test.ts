import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ upload: vi.fn(), signed: vi.fn(), remove: vi.fn(), insert: vi.fn(), auth: vi.fn(), from: vi.fn(), select: vi.fn(), single: vi.fn(), eq: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  storage: { from: mocks.from }, from: () => ({ insert: mocks.insert, select: mocks.select }), auth: { getUser: mocks.auth },
} }));
import { getCashReceiptUrl } from "./cashReceiptService";
import { addCashMovement } from "./cashMovementService";
beforeEach(() => {
  vi.clearAllMocks(); mocks.from.mockReturnValue({ upload: mocks.upload, createSignedUrl: mocks.signed, remove: mocks.remove });
  mocks.auth.mockResolvedValue({ data: { user: { id: "u1" } } });
  mocks.insert.mockResolvedValue({ error: null });
  mocks.select.mockReturnValue({ eq: mocks.eq });
  mocks.eq.mockReturnValue({ eq: mocks.eq, maybeSingle: mocks.single });
  mocks.single.mockResolvedValue({ data: null, error: null });
  mocks.remove.mockResolvedValue({ error: null });
  mocks.upload.mockResolvedValue({ error: null });
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
  expect(mocks.remove).not.toHaveBeenCalled();
});
const input = { restaurantId: "r1", sessionId: "s1", kind: "sangria" as const, amount: 30, reason: "Depósito", photo: { size: 100, type: "image/jpeg" } as File };
it("remove somente a foto transferida quando o lançamento não existe", async () => {
  mocks.insert.mockResolvedValue({ error: new Error("Caixa fechado") });
  await expect(addCashMovement(input)).rejects.toThrow("Caixa fechado");
  const path = mocks.insert.mock.calls[0][0].receipt_path;
  expect(mocks.remove).toHaveBeenCalledWith([path]);
  expect(mocks.eq).toHaveBeenCalledWith("restaurant_id", "r1");
  expect(mocks.eq).toHaveBeenCalledWith("id", mocks.insert.mock.calls[0][0].id);
});
it("preserva foto e evita novo lançamento quando a resposta foi perdida mas a gravação ocorreu", async () => {
  mocks.insert.mockRejectedValue(new Error("Conexão interrompida"));
  mocks.single.mockResolvedValue({ data: { id: "confirmado" }, error: null });
  await expect(addCashMovement(input)).resolves.toBeUndefined();
  expect(mocks.insert).toHaveBeenCalledTimes(1);
  expect(mocks.remove).not.toHaveBeenCalled();
});
it("não apaga foto quando não consegue confirmar se o movimento foi registrado", async () => {
  mocks.insert.mockRejectedValue(new Error("Conexão interrompida"));
  mocks.single.mockResolvedValue({ data: null, error: new Error("Sem conexão") });
  await expect(addCashMovement(input)).rejects.toThrow("confira os movimentos antes de tentar novamente");
  expect(mocks.remove).not.toHaveBeenCalled();
});
it("expõe a falha de limpeza sem esconder que a foto permanece privada", async () => {
  mocks.insert.mockResolvedValue({ error: new Error("Caixa fechado") });
  mocks.remove.mockResolvedValue({ error: new Error("Sem conexão") });
  await expect(addCashMovement(input)).rejects.toThrow("continua privada");
});
it("não tenta limpar foto quando não houve anexo", async () => {
  mocks.insert.mockResolvedValue({ error: new Error("Caixa fechado") });
  await expect(addCashMovement({ ...input, photo: null })).rejects.toThrow("Caixa fechado");
  expect(mocks.remove).not.toHaveBeenCalled();
});