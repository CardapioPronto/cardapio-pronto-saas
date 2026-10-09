export interface CashDeclaration {
  openingAmount: number;
  declaredCash: number;
  declaredPix: number;
  declaredCredit: number;
  declaredDebit: number;
  declaredVoucher: number;
  withdrawals: number;
}

export interface CashClosingSummary {
  declaredSales: number;
  cardMachineTotal: number;
  expectedCashInDrawer: number;
  difference: number;
  status: "ok" | "sobra" | "falta";
}

const round = (value: number) => Math.round(value * 100) / 100;

/** Converte "1.234,56" / "1234.56" / "" em número seguro (>= 0). */
export const parseMoneyInput = (value: string): number => {
  const raw = (value ?? "").trim();
  if (!raw) return 0;
  const normalized = raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw;
  const parsed = Number(normalized.replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) && parsed > 0 ? round(parsed) : 0;
};

/**
 * Conciliação do fechamento:
 * vendas declaradas = (dinheiro contado - troco inicial + sangrias) + PIX + crédito + débito + voucher
 * diferença = vendas declaradas - vendas registradas no sistema
 */
export const summarizeCashClosing = (
  declaration: CashDeclaration,
  systemSalesTotal: number,
  tolerance = 0.009,
): CashClosingSummary => {
  const cashSales =
    declaration.declaredCash - declaration.openingAmount + declaration.withdrawals;
  const cardMachineTotal =
    declaration.declaredCredit + declaration.declaredDebit + declaration.declaredVoucher;
  const declaredSales = round(cashSales + declaration.declaredPix + cardMachineTotal);
  const difference = round(declaredSales - systemSalesTotal);
  const nonCashDeclared = declaration.declaredPix + cardMachineTotal;
  const expectedCashInDrawer = round(
    declaration.openingAmount + Math.max(0, systemSalesTotal - nonCashDeclared) - declaration.withdrawals,
  );

  return {
    declaredSales,
    cardMachineTotal: round(cardMachineTotal),
    expectedCashInDrawer,
    difference,
    status: Math.abs(difference) <= tolerance ? "ok" : difference > 0 ? "sobra" : "falta",
  };
};
