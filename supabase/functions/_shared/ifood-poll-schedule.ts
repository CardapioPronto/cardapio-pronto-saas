/** Indica se o restaurante já pode receber novo poll automático. */
export function isDueForIfoodPoll(
  lastPolledAt: string | null,
  pollingIntervalSeconds: number,
  nowMs = Date.now(),
): boolean {
  const intervalMs = Math.max(30, Number(pollingIntervalSeconds || 60)) * 1000;
  if (!lastPolledAt) return true;
  const last = Date.parse(lastPolledAt);
  if (!Number.isFinite(last)) return true;
  return nowMs - last >= intervalMs;
}
