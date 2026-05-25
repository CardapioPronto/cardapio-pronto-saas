import { describe, expect, it } from "vitest";
import {
  getLocalSubscriptionStatus,
  isDisplayableSubscriptionStatus,
  normalizeSubscriptionStatus,
} from "./subscriptionStatusUi";

describe("subscriptionStatusUi", () => {
  it("normaliza status legados de assinatura para canônicos", () => {
    expect(normalizeSubscriptionStatus("pendente")).toBe("pending");
    expect(normalizeSubscriptionStatus("ativa")).toBe("active");
    expect(normalizeSubscriptionStatus("cancelada")).toBe("canceled");
  });

  it("usa status normalizado nas verificações da UI", () => {
    expect(isDisplayableSubscriptionStatus("pendente")).toBe(true);
    expect(getLocalSubscriptionStatus({ status: "pendente" })).toBe("pending");
  });
});
