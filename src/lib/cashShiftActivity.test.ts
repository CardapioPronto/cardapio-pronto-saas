import { describe, expect, it } from 'vitest';
import { summarizeCashActivity, type CashActivityOrder } from '../../supabase/functions/_shared/cash-shift-activity';
const since = '2026-10-21T18:00:00Z';
const until = '2026-10-21T23:00:00Z';
const order = (changes: Partial<CashActivityOrder> = {}): CashActivityOrder => ({
  id: '1', order_number: '1', created_at: '2026-10-21T19:00:00Z', paid_at: '2026-10-21T20:00:00Z',
  customer_name: null, total: 100, status: 'finalizado', payment_method: 'dinheiro', payment_provider: 'pdv',
  payment_status: 'paid', source: 'pdv', order_type: 'balcao', ...changes,
});
const summarize = (orders: CashActivityOrder[]) => summarizeCashActivity(orders, since, until);
describe('cash shift activity', () => {
  it('includes an older order received now exactly once', () => {
    const older = order({ created_at: '2026-10-20T18:00:00Z' });
    expect(summarize([older, older])).toMatchObject({ total: 0, receivedTotal: 100, cashReceived: 100 });
  });
  it('unpaid sales do not become receipts even with a PIX method', () => {
    expect(summarize([order({ payment_status: 'pending', payment_method: 'pix', paid_at: null })])).toMatchObject({ total: 100, pendingTotal: 100, receivedTotal: 0, cashReceived: 0 });
  });
  it('not_required is not proof of receipt', () => {
    expect(summarize([order({ payment_status: 'not_required', paid_at: null })]).pendingTotal).toBe(100);
  });
  it('online receipts never inflate the drawer or local comparison', () => {
    expect(summarize([order({ payment_provider: 'pagarme', payment_method: 'pix' })])).toMatchObject({ externalTotal: 100, receivedTotal: 0, cashReceived: 0 });
  });
  it('iFood collector cannot be inferred from the method', () => {
    expect(summarize([order({ source: 'ifood', payment_provider: null })])).toMatchObject({ reviewTotal: 100, cashReceived: 0, receivedTotal: 0 });
  });
  it('missing dates and mixed payments require review, not invented receipts', () => {
    const activity = summarize([order({ paid_at: null }), order({ id: '2', payment_method: 'misto', total: 60 })]);
    expect(activity).toMatchObject({ reviewTotal: 160, receivedTotal: 0 });
  });
  it('uses a half-open receipt interval independently of creation', () => {
    expect(summarize([order({ paid_at: since }), order({ id: '2', paid_at: until })]).receivedTotal).toBe(100);
  });
  it('does not count previously paid sales again', () => {
    expect(summarize([order({ paid_at: '2026-10-21T17:00:00Z' })])).toMatchObject({ total: 100, receivedTotal: 0, pendingTotal: 0 });
  });
  it('retains canceled collections and refunds for review', () => {
    expect(summarize([order({ status: 'cancelado' }), order({ id: '2', payment_status: 'refunded' })])).toMatchObject({ receivedTotal: 0, reviewTotal: 200 });
  });
  it('counts more than 1000 orders without truncation', () => {
    const activity = summarize(Array.from({ length: 1205 }, (_, i) => order({ id: String(i), total: 0.1 })));
    expect(activity.receivedTotal).toBe(120.5);
    expect(activity.received).toHaveLength(1205);
  });
});