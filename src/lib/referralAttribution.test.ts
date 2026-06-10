import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  applyReferralTemplate,
  buildRestaurantSignupUrl,
  captureReferralFromSearch,
  getReferralSignupMetadata,
  persistReferralAttribution,
  readReferralAttribution,
} from "./referralAttribution";

function createStorageMock() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => store.clear(),
  };
}

describe("referralAttribution", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createStorageMock());
    vi.stubGlobal("document", { cookie: "" });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("normaliza e persiste código do query param", () => {
    const stored = captureReferralFromSearch("?ref=maria-7k2p");
    expect(stored?.code).toBe("MARIA-7K2P");
    expect(readReferralAttribution()?.code).toBe("MARIA-7K2P");
  });

  it("expõe metadata para signup", () => {
    persistReferralAttribution("JOAO-1234");
    const metadata = getReferralSignupMetadata();
    expect(metadata?.referral_code).toBe("JOAO-1234");
    expect(metadata?.referral_first_click_at).toBeTruthy();
  });

  it("monta URL de cadastro com ref", () => {
    const url = buildRestaurantSignupUrl("MARIA-7K2P", "https://app.pubfy.test");
    expect(url).toBe("https://app.pubfy.test/cadastro?ref=MARIA-7K2P");
  });

  it("substitui placeholders no template", () => {
    const text = applyReferralTemplate("Link: {{ref_link}} Código: {{ref_code}}", {
      refLink: "https://x/cadastro?ref=A",
      refCode: "A",
    });
    expect(text).toContain("https://x/cadastro?ref=A");
    expect(text).toContain("Código: A");
  });

  it("ignora ref inválido", () => {
    expect(captureReferralFromSearch("?ref=ab")).toBeNull();
  });
});
