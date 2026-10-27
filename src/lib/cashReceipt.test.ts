import { describe, expect, it } from "vitest";
import { validateCashReceipt, cashReceiptPath } from "./cashReceipt";
describe("comprovantes privados", () => {
  it("aceita foto de até 6 MB", () => expect(validateCashReceipt({ type: "image/jpeg", size: 6 * 1024 * 1024 })).toBeNull());
  it("rejeita arquivo maior ou vazio", () => {
    expect(validateCashReceipt({ type: "image/jpeg", size: 6 * 1024 * 1024 + 1 })).not.toBeNull();
    expect(validateCashReceipt({ type: "image/jpeg", size: 0 })).not.toBeNull();
  });
  it("rejeita SVG e arquivos não fotográficos", () => expect(validateCashReceipt({ type: "image/svg+xml", size: 100 })).not.toBeNull());
  it("isola caminho por restaurante turno e operador", () => expect(cashReceiptPath("r1", "s1", "u1", "f1", "image/png")).toBe("r1/s1/u1/f1.png"));
  it("rejeita travessia de caminho", () => expect(() => cashReceiptPath("../r2", "s1", "u1", "f1", "image/png")).toThrow());
});