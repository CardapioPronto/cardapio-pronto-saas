const BR_TIMEZONE = "America/Sao_Paulo";

const WEEKDAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

export type BrazilWeekdayKey = (typeof WEEKDAY_KEYS)[number];

/** Horário e dia da semana no fuso America/Sao_Paulo (alinha ao cardápio/RPC). */
export function getBrazilDateTimeParts(date = new Date()): {
  weekdayKey: BrazilWeekdayKey;
  hhmm: string;
} {
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

  return {
    weekdayKey,
    hhmm: `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`,
  };
}

export function formatBrazilDateTime(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleString("pt-BR", { timeZone: BR_TIMEZONE });
}
