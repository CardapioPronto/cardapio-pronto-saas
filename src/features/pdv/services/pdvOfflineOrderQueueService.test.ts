import { describe, expect, it } from "vitest";

import {
  evaluatePDVOfflineTableSnapshot,
  type PDVOfflineTableSnapshot,
} from "./pdvOfflineOrderQueueService";

const snapshot: PDVOfflineTableSnapshot = {
  id: "table-1",
  number: "10",
  name: "Mesa 10",
  status: "livre",
  updatedAt: "2026-06-22T10:00:00.000Z",
};

describe("evaluatePDVOfflineTableSnapshot", () => {
  it("libera sincronizacao quando a mesa nao mudou", () => {
    const result = evaluatePDVOfflineTableSnapshot(snapshot, {
      number: "10",
      status: "livre",
      isActive: true,
      updatedAt: snapshot.updatedAt,
    });

    expect(result).toEqual({ outcome: "safe", conflict: null });
  });

  it("exige revisao quando status ou versao da mesa mudou", () => {
    const result = evaluatePDVOfflineTableSnapshot(snapshot, {
      number: "10",
      status: "ocupada",
      isActive: true,
      updatedAt: "2026-06-22T10:05:00.000Z",
    }, "2026-06-22T10:06:00.000Z");

    expect(result.outcome).toBe("review");
    expect(result.conflict).toMatchObject({
      canConfirm: true,
      currentStatus: "ocupada",
      currentUpdatedAt: "2026-06-22T10:05:00.000Z",
    });
  });

  it("bloqueia confirmacao quando a mesa esta indisponivel", () => {
    const result = evaluatePDVOfflineTableSnapshot(snapshot, {
      number: "10",
      status: "indisponivel",
      isActive: true,
      updatedAt: "2026-06-22T10:05:00.000Z",
    });

    expect(result.outcome).toBe("blocked");
    expect(result.conflict?.canConfirm).toBe(false);
  });
});
