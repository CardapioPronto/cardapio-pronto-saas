import { addDays } from "date-fns";
import { describe, expect, it } from "vitest";
import {
  EXPORT_BROWSER_PDF_MAX_RANGE_DAYS,
  REPORT_LARGE_PERIOD_THRESHOLD_DAYS,
  REPORT_RPC_MAX_RANGE_DAYS,
  assertMaxBrowserPdfExportRange,
  assertMaxExportRange,
  assertMaxReportRange,
  calendarDaysInclusive,
} from "./reportLimits";

describe("calendarDaysInclusive", () => {
  it("conta inclusive mesmo dia como 1", () => {
    const d = new Date("2026-03-10T15:00:00Z");
    expect(calendarDaysInclusive(d, d)).toBe(1);
  });

  it("conta dois dias consecutivos como 2", () => {
    const a = new Date(2026, 2, 10, 12, 0, 0);
    const b = new Date(2026, 2, 11, 12, 0, 0);
    expect(calendarDaysInclusive(a, b)).toBe(2);
  });
});

describe("assertMaxReportRange", () => {
  it("aceita período no limite (366 dias inclusive)", () => {
    const from = new Date("2026-01-01T12:00:00Z");
    const to = addDays(from, REPORT_RPC_MAX_RANGE_DAYS - 1);
    expect(() => assertMaxReportRange(from, to)).not.toThrow();
  });

  it("rejeita acima do máximo", () => {
    const from = new Date("2026-01-01T12:00:00Z");
    const to = addDays(from, REPORT_RPC_MAX_RANGE_DAYS);
    expect(() => assertMaxReportRange(from, to)).toThrow(/366/);
  });
});

describe("assertMaxExportRange", () => {
  it("rejeita acima do limite de exportação", () => {
    const from = new Date("2026-01-01T12:00:00Z");
    const to = addDays(from, 121);
    expect(() => assertMaxExportRange(from, to)).toThrow(/120/);
  });
});

describe("assertMaxBrowserPdfExportRange", () => {
  it("aceita PDF no limite curto do navegador", () => {
    const from = new Date("2026-01-01T12:00:00Z");
    const to = addDays(from, EXPORT_BROWSER_PDF_MAX_RANGE_DAYS - 1);
    expect(() => assertMaxBrowserPdfExportRange(from, to)).not.toThrow();
  });

  it("orienta CSV para períodos maiores em PDF", () => {
    const from = new Date("2026-01-01T12:00:00Z");
    const to = addDays(from, EXPORT_BROWSER_PDF_MAX_RANGE_DAYS);
    expect(() => assertMaxBrowserPdfExportRange(from, to)).toThrow(/Use CSV/);
  });
});

describe("threshold", () => {
  it("constante de aviso UI", () => {
    expect(REPORT_LARGE_PERIOD_THRESHOLD_DAYS).toBeGreaterThan(30);
  });
});
