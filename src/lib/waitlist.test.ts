import { describe, expect, it } from "vitest";
import { averageWaitMinutes, buildWhatsAppCallLink, estimateWaitMinutes, minutesBetween } from "./waitlist";

describe("waitlist", () => {
  it("calcula minutos sem valores negativos", () => {
    expect(minutesBetween("2026-10-08T20:00:00Z", "2026-10-08T20:25:30Z")).toBe(25);
    expect(minutesBetween("2026-10-08T20:30:00Z", "2026-10-08T20:00:00Z")).toBe(0);
  });

  it("média considera apenas quem sentou", () => {
    expect(
      averageWaitMinutes([
        { status: "seated", created_at: "2026-10-08T20:00:00Z", seated_at: "2026-10-08T20:20:00Z" },
        { status: "seated", created_at: "2026-10-08T20:00:00Z", seated_at: "2026-10-08T20:10:00Z" },
        { status: "canceled", created_at: "2026-10-08T20:00:00Z", seated_at: null },
      ]),
    ).toBe(15);
    expect(averageWaitMinutes([])).toBeNull();
  });

  it("estimativa usa média ou 10 min por grupo", () => {
    expect(estimateWaitMinutes(3, null)).toBe(30);
    expect(estimateWaitMinutes(2, 12)).toBe(24);
    expect(estimateWaitMinutes(0, 12)).toBe(0);
  });

  it("monta link do WhatsApp com +55", () => {
    expect(buildWhatsAppCallLink("(11) 98888-7777", "Ana", "Bar")).toMatch(/^https:\/\/wa\.me\/5511988887777\?text=/);
  });
});
