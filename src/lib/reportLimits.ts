import { differenceInCalendarDays, endOfDay, startOfDay } from "date-fns";

/** Período máximo para RPCs de relatório / performance (alinhado ao banco). */
export const REPORT_RPC_MAX_RANGE_DAYS = 366;

/** Exportação no browser: evita carregar dezenas de milhares de pedidos. */
export const EXPORT_MAX_RANGE_DAYS = 120;

/** Limite de linhas de pedidos por exportação (mais recentes primeiro). */
export const EXPORT_MAX_ORDER_ROWS = 2500;

/** A partir deste tamanho de período, mostrar aviso de processamento. */
export const REPORT_LARGE_PERIOD_THRESHOLD_DAYS = 62;

export function calendarDaysInclusive(from: Date, to: Date): number {
  return differenceInCalendarDays(endOfDay(to), startOfDay(from)) + 1;
}

export function assertMaxReportRange(from: Date, to: Date, maxDays = REPORT_RPC_MAX_RANGE_DAYS): void {
  const days = calendarDaysInclusive(from, to);
  if (days < 1) throw new Error("Período inválido.");
  if (days > maxDays) {
    throw new Error(`Período máximo de ${maxDays} dias para relatórios. Reduza o intervalo.`);
  }
}

export function assertMaxExportRange(from: Date, to: Date, maxDays = EXPORT_MAX_RANGE_DAYS): void {
  const days = calendarDaysInclusive(from, to);
  if (days < 1) throw new Error("Período inválido.");
  if (days > maxDays) {
    throw new Error(
      `Exportação limitada a ${maxDays} dias no navegador. Reduza o intervalo ou exporte em partes.`,
    );
  }
}
