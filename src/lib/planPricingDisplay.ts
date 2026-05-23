/** `price_yearly` no banco = valor mensal equivalente do plano anual (ex.: 49,90). */

export function yearlyPlanTotalReais(yearlyPerMonthReais: number): number {
  return Math.round(yearlyPerMonthReais * 12 * 100) / 100;
}

export function formatPlanCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export type YearlyPlanDisplay = {
  perMonthReais: number;
  totalAnnualReais: number;
  perMonthLabel: string;
  totalAnnualLabel: string;
};

export function getYearlyPlanDisplay(yearlyPerMonthReais: number): YearlyPlanDisplay {
  const perMonthReais = yearlyPerMonthReais;
  const totalAnnualReais = yearlyPlanTotalReais(perMonthReais);
  return {
    perMonthReais,
    totalAnnualReais,
    perMonthLabel: formatPlanCurrency(perMonthReais),
    totalAnnualLabel: formatPlanCurrency(totalAnnualReais),
  };
}

export function formatYearlyBillingShort(yearlyPerMonth: number): string {
  const yearly = getYearlyPlanDisplay(yearlyPerMonth);
  return `${yearly.totalAnnualLabel}/ano (${yearly.perMonthLabel}/mês)`;
}

export function formatYearlyBillingDetail(yearlyPerMonth: number): string {
  const yearly = getYearlyPlanDisplay(yearlyPerMonth);
  return `${yearly.totalAnnualLabel} por ano (${yearly.perMonthLabel}/mês), à vista ou em até 12x no cartão`;
}

export function formatCycleChangeDescription(
  targetCycle: "monthly" | "yearly",
  monthly: number,
  yearlyPerMonth: number,
): string {
  if (targetCycle === "monthly") {
    return `A próxima cobrança passará a ser mensal, no valor de ${formatPlanCurrency(monthly)} por mês. O Pagar.me ajustará o ciclo da assinatura.`;
  }
  const yearly = getYearlyPlanDisplay(yearlyPerMonth);
  return (
    `A próxima cobrança passará a ser anual, no valor de ${yearly.totalAnnualLabel} por ano ` +
    `(${yearly.perMonthLabel}/mês), à vista ou parcelado em até 12x no cartão. ` +
    `O Pagar.me ajustará o ciclo da assinatura.`
  );
}

export function formatCurrentPlanValue(
  cycle: string | null | undefined,
  monthly: number,
  yearlyPerMonth: number,
): { value: string; helper?: string } {
  if (cycle === "yearly") {
    const yearly = getYearlyPlanDisplay(yearlyPerMonth);
    return {
      value: `${yearly.totalAnnualLabel}/ano`,
      helper: `${yearly.perMonthLabel}/mês · à vista ou até 12x`,
    };
  }
  return { value: `${formatPlanCurrency(monthly)}/mês`, helper: "Ciclo mensal" };
}

export function formatCyclePriceHint(
  targetCycle: "monthly" | "yearly",
  monthly: number,
  yearlyPerMonth: number,
): string {
  if (targetCycle === "yearly") {
    const yearly = getYearlyPlanDisplay(yearlyPerMonth);
    return `Ao mudar para anual, o valor será ${yearly.totalAnnualLabel} por ano (${yearly.perMonthLabel}/mês), à vista ou em até 12x.`;
  }
  return `Ao mudar para mensal, o valor será ${formatPlanCurrency(monthly)}/mês.`;
}
