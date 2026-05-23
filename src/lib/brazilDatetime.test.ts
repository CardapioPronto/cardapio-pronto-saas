import { describe, expect, it } from "vitest";

// Espelha a lógica da Edge Function (_shared/brazil-datetime.ts) para regressão no CI.
const BR_TIMEZONE = "America/Sao_Paulo";
const WEEKDAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

function getBrazilDateTimeParts(date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: BR_TIMEZONE,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const weekdayShort = parts.find((p) => p.type === "weekday")?.value?.toLowerCase() ?? "sun";
  const hour = parts.find((p) => p.type === "hour")?.value ?? "00";
  const minute = parts.find((p) => p.type === "minute")?.value ?? "00";
  const weekdayKey = WEEKDAY_KEYS.find((k) => weekdayShort.startsWith(k.slice(0, 2))) ?? "sun";
  return { weekdayKey, hhmm: `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}` };
}

describe("getBrazilDateTimeParts", () => {
  it("usa fuso America/Sao_Paulo (não UTC puro do ISO)", () => {
    const utcNoon = new Date("2026-01-15T12:00:00.000Z");
    const parts = getBrazilDateTimeParts(utcNoon);
    expect(parts.hhmm).toBe("09:00");
  });
});
