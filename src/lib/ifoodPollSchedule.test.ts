import { describe, expect, it } from "vitest";
import { isDueForIfoodPoll } from "../../supabase/functions/_shared/ifood-poll-schedule.ts";

describe("isDueForIfoodPoll", () => {
  const now = Date.parse("2026-05-23T12:00:00Z");

  it("dispara quando nunca houve poll", () => {
    expect(isDueForIfoodPoll(null, 60, now)).toBe(true);
  });

  it("respeita intervalo configurado", () => {
    const last = "2026-05-23T11:59:01Z";
    expect(isDueForIfoodPoll(last, 60, now)).toBe(false);
    expect(isDueForIfoodPoll(last, 60, now + 60_000)).toBe(true);
  });

  it("usa mínimo de 30 segundos", () => {
    const last = "2026-05-23T11:59:40Z";
    expect(isDueForIfoodPoll(last, 10, now)).toBe(false);
    expect(isDueForIfoodPoll(last, 10, now + 31_000)).toBe(true);
  });
});
