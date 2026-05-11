import { subMonths, subYears } from "date-fns";

/** Delimitador CSV usado nas exportações de relatório (pt-BR). */
export const CSV_DELIMITER = ";";

/**
 * Evita formula injection em células de planilha (prefixo com apóstrofo se começar como fórmula).
 */
export function sanitizeSpreadsheetCell(value: string | number | boolean | null) {
  const text = String(value ?? "");
  return /^[=+\-@]/.test(text.trim()) ? `'${text}` : value;
}

export function escapeCsvCell(value: string | number | boolean | null) {
  const sanitized = sanitizeSpreadsheetCell(value);
  const text = String(sanitized ?? "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  if (text.includes(CSV_DELIMITER) || text.includes('"') || text.includes("\n")) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

export function calcularVariacao(atual: number, anterior: number) {
  if (anterior === 0) return atual > 0 ? 100 : 0;
  return ((atual - anterior) / anterior) * 100;
}

export function labelCanal(canal = "todos") {
  const labels: Record<string, string> = {
    todos: "Todas",
    "source:app": "PDV",
    "source:cardapio": "Cardápio digital",
    "source:ifood": "iFood",
    "tipo:mesa": "Mesa",
    "tipo:balcao": "Balcão",
    "tipo:delivery": "Delivery",
  };
  return labels[canal] || canal;
}

export function labelStatus(status = "todos") {
  const labels: Record<string, string> = {
    todos: "Todos",
    finalizado: "Finalizados",
    pendente: "Pendentes",
    preparo: "Em preparo",
    "em-andamento": "Em andamento",
    cancelado: "Cancelados",
  };
  return labels[status] || status;
}

export function calcularPeriodoComparacao(dateFrom: Date, dateTo: Date, tipo = "mes-anterior") {
  switch (tipo) {
    case "ano-anterior":
      return {
        from: subYears(dateFrom, 1),
        to: subYears(dateTo, 1),
        label: "Mesmo período do ano anterior",
      };
    default:
      return {
        from: subMonths(dateFrom, 1),
        to: subMonths(dateTo, 1),
        label: "Mês anterior",
      };
  }
}

export type ExportRow = Record<string, string | number | boolean | null>;

export function getColumns(rows: ExportRow[]) {
  return Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
}

export function appendCsvRow(lines: string[], cells: Array<string | number | boolean | null>) {
  lines.push(cells.map(escapeCsvCell).join(CSV_DELIMITER));
}
