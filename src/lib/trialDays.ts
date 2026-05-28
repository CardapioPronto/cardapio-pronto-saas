export const DEFAULT_TRIAL_DAYS = 14;
export const MAX_TRIAL_DAYS = 365;

export function normalizeTrialDays(
  value: number | string | null | undefined,
  fallback = DEFAULT_TRIAL_DAYS,
) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(MAX_TRIAL_DAYS, Math.max(0, Math.trunc(numeric)));
}

export function formatTrialDaysBadge(days: number) {
  const normalized = normalizeTrialDays(days);
  if (normalized <= 0) return "Sem teste grátis";
  return normalized === 1 ? "1 dia grátis" : `${normalized} dias grátis`;
}

export function formatTrialPeriodText(days: number) {
  const normalized = normalizeTrialDays(days);
  if (normalized <= 0) return "sem período de teste grátis";
  return normalized === 1 ? "1 dia grátis" : `${normalized} dias grátis`;
}

export function formatTrialDurationText(days: number) {
  const normalized = normalizeTrialDays(days);
  if (normalized <= 0) return "sem período de teste";
  return normalized === 1 ? "1 dia" : `${normalized} dias`;
}
