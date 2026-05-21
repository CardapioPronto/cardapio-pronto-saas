import { describe, expect, it } from "vitest";
import { pickCurrentSubscription } from "./pickCurrentSubscription";

describe("pickCurrentSubscription", () => {
  it("prioriza active sobre trial", () => {
    const picked = pickCurrentSubscription([
      { status: "trialing", is_trial: true, trial_ends_at: "2099-01-01T00:00:00Z" },
      { status: "active" },
    ]);
    expect(picked?.status).toBe("active");
  });

  it("mantem trial vigente como assinatura atual mesmo com pagamento pendente", () => {
    const picked = pickCurrentSubscription([
      { status: "pending" },
      { status: "trialing", is_trial: true, trial_ends_at: "2099-01-01T00:00:00Z" },
    ]);
    expect(picked?.status).toBe("trialing");
  });

  it("usa trial cancelado ainda dentro do prazo quando não há outra vigente", () => {
    const picked = pickCurrentSubscription([
      {
        status: "canceled",
        is_trial: true,
        trial_ends_at: "2099-05-23T00:00:00Z",
      },
    ]);
    expect(picked?.status).toBe("canceled");
    expect(picked?.is_trial).toBe(true);
  });
});
