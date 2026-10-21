import { expect, test } from '@playwright/test';
import { installAuthenticatedSupabaseMock } from './fixtures/authenticatedSupabase';

test('cash reconciles old receipts without including pending or external orders (simulated)', async ({ page }) => {
  await installAuthenticatedSupabaseMock(page, 'owner');
  const now = Date.now();
  const since = new Date(now - 3_600_000).toISOString();
  const restaurant = '00000000-0000-4000-8000-000000000101';
  let session: Record<string, unknown> | null = { id: '00000000-0000-4000-8000-000000000901', restaurant_id: restaurant, opened_at: since, opening_amount: 100, status: 'open' };
  const history: Record<string, unknown>[] = [];
  const order = { id: 'older', order_number: '101', created_at: new Date(now - 86_400_000).toISOString(), paid_at: new Date(now - 60_000).toISOString(), customer_name: 'Recebimento anterior', total: 100, status: 'finalizado', payment_method: 'dinheiro', payment_status: 'paid', payment_provider: 'pdv', source: 'pdv', order_type: 'balcao' };
  await page.route('**/rest/v1/rpc/get_cash_shift_activity', async route => {
    await route.fulfill({ json: { since, until: new Date().toISOString(), orders: [
      order,
      { ...order, id: 'pending', order_number: '102', created_at: new Date(now - 90_000).toISOString(), paid_at: null, payment_method: 'pix', payment_status: 'pending', total: 50 },
      { ...order, id: 'online', order_number: '103', created_at: new Date(now - 90_000).toISOString(), payment_provider: 'pagarme', payment_method: 'pix', total: 80 },
    ] } });
  });
  await page.route('**/rest/v1/cash_register_sessions*', async route => {
    if (route.request().method() === 'PATCH') {
      const payload = route.request().postDataJSON();
      if (session) history.push({ ...session, ...payload, closed_at: new Date().toISOString() });
      session = null;
      await route.fulfill({ status: 204 });
    } else {
      const closed = new URL(route.request().url()).searchParams.get('status') === 'eq.closed';
      await route.fulfill({ json: closed ? history : session });
    }
  });
  await page.goto('/caixa');
  await expect(page.getByText('Recebido no caixa', { exact: true }).first()).toBeVisible();
  const metric = (label: string) => page.getByText(label, { exact: true }).first().locator('..');
  await expect(metric('Recebido no caixa')).toContainText('100,00');
  await expect(metric('Pagamento pendente no turno')).toContainText('50,00');
  await expect(metric('Recebido por canal externo')).toContainText('80,00');
  await page.getByLabel('Dinheiro contado na gaveta').fill('200');
  await expect(metric('Diferença')).toContainText('0,00');
  await expect(page.getByText('#101', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Fechar caixa', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Abrir caixa', exact: true })).toBeVisible();
  expect(history[0]).toMatchObject({ system_sales_total: 130, system_received_total: 100, system_pending_total: 50, system_external_total: 80, difference_amount: 0 });
});