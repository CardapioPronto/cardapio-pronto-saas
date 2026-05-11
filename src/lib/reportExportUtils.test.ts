import { describe, expect, it } from "vitest";
import {
  CSV_DELIMITER,
  calcularPeriodoComparacao,
  calcularVariacao,
  escapeCsvCell,
  getColumns,
  labelCanal,
  labelStatus,
  sanitizeSpreadsheetCell,
} from "./reportExportUtils";

describe("sanitizeSpreadsheetCell", () => {
  it("prefixa valores que parecem fórmula", () => {
    expect(sanitizeSpreadsheetCell("=1+1")).toBe("'=1+1");
    expect(sanitizeSpreadsheetCell("+1234")).toBe("'+1234");
    expect(sanitizeSpreadsheetCell("-0")).toBe("'-0");
    expect(sanitizeSpreadsheetCell("@ref")).toBe("'@ref");
  });

  it("não altera texto comum", () => {
    expect(sanitizeSpreadsheetCell("Total")).toBe("Total");
    expect(sanitizeSpreadsheetCell(100)).toBe(100);
  });
});

describe("escapeCsvCell", () => {
  it("usa aspas quando há delimitador ou quebra de linha", () => {
    expect(escapeCsvCell(`a${CSV_DELIMITER}b`)).toBe(`"a${CSV_DELIMITER}b"`);
    expect(escapeCsvCell('say "hi"')).toBe(`"say ""hi"""`);
    expect(escapeCsvCell("line1\nline2")).toBe(`"line1\nline2"`);
  });
});

describe("calcularVariacao", () => {
  it("evita divisão por zero", () => {
    expect(calcularVariacao(10, 0)).toBe(100);
    expect(calcularVariacao(0, 0)).toBe(0);
  });

  it("calcula percentual", () => {
    expect(calcularVariacao(110, 100)).toBeCloseTo(10);
  });
});

describe("labels", () => {
  it("labelCanal e labelStatus conhecem chaves padrão", () => {
    expect(labelCanal("source:app")).toBe("PDV");
    expect(labelStatus("finalizado")).toBe("Finalizados");
  });
});

describe("calcularPeriodoComparacao", () => {
  it("retorna mês anterior por omissão", () => {
    const from = new Date("2026-03-10T12:00:00Z");
    const to = new Date("2026-03-20T12:00:00Z");
    const r = calcularPeriodoComparacao(from, to);
    expect(r.label).toBe("Mês anterior");
    expect(r.from.getUTCMonth()).toBe(1);
    expect(r.to.getUTCMonth()).toBe(1);
  });
});

describe("getColumns", () => {
  it("união ordenada de chaves", () => {
    const cols = getColumns([{ a: 1, b: 2 }, { b: 3, c: 4 }]);
    expect(cols.sort()).toEqual(["a", "b", "c"]);
  });
});
