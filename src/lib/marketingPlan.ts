const PREFERRED_MARKETING_PLAN_NAMES = ["Plano Pubfy", "Profissional", "Básico"];

export type MarketingPlanLike = {
  name?: string | null;
  is_active?: boolean | null;
  price_monthly?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
};

function preferredPlanRank(plan: MarketingPlanLike) {
  const rank = PREFERRED_MARKETING_PLAN_NAMES.indexOf(plan.name ?? "");
  return rank === -1 ? 99 : rank;
}

export function compareMarketingPlans(a: MarketingPlanLike, b: MarketingPlanLike) {
  const rankDiff = preferredPlanRank(a) - preferredPlanRank(b);
  if (rankDiff !== 0) return rankDiff;

  const priceDiff = Number(a.price_monthly ?? Number.MAX_SAFE_INTEGER) -
    Number(b.price_monthly ?? Number.MAX_SAFE_INTEGER);
  if (priceDiff !== 0) return priceDiff;

  const updatedAtA = new Date(a.updated_at ?? a.created_at ?? 0).getTime();
  const updatedAtB = new Date(b.updated_at ?? b.created_at ?? 0).getTime();
  return updatedAtB - updatedAtA;
}

export function selectMarketingPlan<T extends MarketingPlanLike>(plans: T[]) {
  return [...plans]
    .filter((plan) => plan.is_active !== false)
    .sort(compareMarketingPlans)[0] ?? null;
}
