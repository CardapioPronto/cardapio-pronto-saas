import { describe, expect, it } from "vitest";
import { buildClosingReport, closingReportCsv } from "./cashClosingReport";
import type { CashRegisterSession } from "@/services/cashRegisterService";

const session = {
  id: "s1", restaurant_id: "r1", status: "closed", opened_by: "u1", closed_by: "u2",
  opened_at: "2026-10-27T10:00:00Z", closed_at: "2026-10-27T12:00:00Z",
  opening_amount: 100, declared_cash: 80, withdrawals: 30, supplies_total: 10,
  declared_pix: 60, declared_credit: 0, declared_debit: 0, declared_voucher: 0,
  system_sales_total: 60, system_received_total: 60, system_pending_total: 0,
  system_external_total: 0, closing_cash_received: 0, difference_amount: 0,
  closing_snapshot: [{ id: "p1", total: 60, class: "received", payment_method: "pix", paid_at: "2026-10-27T11:00:00Z", order_number: 1 }],
} as CashRegisterSession;
describe("relatório congelado", () => {
  it("desconta suprimento e considera sangria sem tratá-los como venda", () => {
    const report = buildClosingReport(session);
    expect(report.methods[0].declared).toBe(0);
    expect(report.methods[1]).toMatchObject({ system: 60, declared: 60, difference: 0 });
  });
  it("não inventa totais por forma para snapshots antigos", () => {
    const report = buildClosingReport({ ...session, closing_snapshot: [{ id: "p1", total: 60, class: "received" }] });
    expect(report.methods[1].system).toBeNull();
  });
  it("mantém recebimentos históricos nulos", () => {
    const report = buildClosingReport({ ...session, system_received_total: null, closing_snapshot: null, closing_cash_received: null });
    expect(report.methods[0].system).toBeNull();
    expect(closingReportCsv(report)).toContain('"Recebimentos locais";"Não disponível"');
  });
  it("não soma pagamentos externos à forma local", () => {
    const report = buildClosingReport({ ...session, closing_snapshot: [{ id: "p2", total: 80, class: "external", payment_method: "pix" }] });
    expect(report.methods[1].system).toBe(0);
  });
  it("protege a exportação contra fórmulas em observações", () => {
    expect(closingReportCsv(buildClosingReport({ ...session, notes: '=HYPERLINK("evil")' }))).toContain("'=HYPERLINK");
  });
  it("usa nomes autorizados e não apresenta usuário desconhecido como sistema", () => {
    const report = buildClosingReport(session, new Map([["u1", "Gerente"]]));
    expect(report.openedBy).toBe("Gerente"); expect(report.closedBy).toBe("Responsável indisponível");
  });
});