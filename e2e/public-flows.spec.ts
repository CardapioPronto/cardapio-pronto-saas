import { expect, test } from "@playwright/test";
import { installPublicMenuSupabaseMock } from "./fixtures/publicMenuSupabase";

test.describe.configure({ timeout: 120_000 });

/** Header da landing (link da marca) fica visível em qualquer breakpoint; o `<nav>` desktop usa `hidden md:flex`. */
async function waitForPublicHeader(page: import("@playwright/test").Page) {
  await expect(
    page.getByRole("link", { name: "Pubfy página inicial" }).first(),
  ).toBeVisible({ timeout: 90_000 });
}

test("landing carrega e define título com Pubfy", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#root")).toBeAttached();
  await expect(page).toHaveTitle(/Pubfy/i);
});

test("termos exibe o título principal", async ({ page }) => {
  await page.goto("/termos");
  await waitForPublicHeader(page);
  await expect(page.getByRole("heading", { name: /Termos de Serviço/i })).toBeVisible({
    timeout: 30_000,
  });
});

test("login exibe o formulário", async ({ page }) => {
  await page.goto("/login");
  await expect(page.locator("#email")).toBeVisible({ timeout: 90_000 });
  await expect(page.getByRole("heading", { name: "Login" })).toBeVisible();
});

test("banner de cookies pode ser aceito e permanece oculto após recarregar", async ({ page }) => {
  await page.goto("/");
  await waitForPublicHeader(page);
  await page.evaluate(() => {
    localStorage.removeItem("pubfy_cookie_consent_v1");
  });
  await page.reload();
  await waitForPublicHeader(page);
  const bar = page.getByTestId("cookie-consent");
  await expect(bar).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: "Entendi e continuar" }).click();
  await expect(bar).toBeHidden();
  await page.reload();
  await expect(bar).toBeHidden();
});

const fillCheckoutInput = async (
  page: import("@playwright/test").Page,
  label: string,
  value: string,
) => {
  await page
    .locator("label")
    .filter({ hasText: label })
    .locator("xpath=following-sibling::input")
    .fill(value);
};

const fillCheckoutTextarea = async (
  page: import("@playwright/test").Page,
  label: string,
  value: string,
) => {
  await page
    .locator("label")
    .filter({ hasText: label })
    .locator("xpath=following-sibling::textarea")
    .fill(value);
};

test("checkout público cria pedido delivery com cupom, endereço e acompanhamento", async ({ page }) => {
  const publicMenuMock = await installPublicMenuSupabaseMock(page);

  await page.goto("/cardapio/publico-e2e");

  await expect(page.getByRole("heading", { name: "Restaurante Público E2E" })).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByText("Pizza Pública E2E", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Adicionar" }).first().click();
  await expect(page.getByRole("heading", { name: "Pizza Pública E2E" })).toBeVisible();
  await page.getByLabel("Observações (opcional)").fill("Sem azeitona");
  await page.getByRole("button", { name: /Adicionar •/ }).click();

  await expect(page.getByText("Sua sacola")).toBeVisible();
  await expect(page.getByText("Obs: Sem azeitona")).toBeVisible();
  await page.getByRole("button", { name: "Finalizar pedido" }).click();

  await expect(page.getByRole("heading", { name: "Como deseja pedir?" })).toBeVisible();
  await expect(page.getByText("Receber por delivery")).toBeVisible();
  await page.getByRole("button", { name: "Continuar" }).click();

  await expect(page.getByRole("heading", { name: "Endereço de entrega" })).toBeVisible();
  await fillCheckoutInput(page, "Nome completo *", "Cliente Público E2E");
  await fillCheckoutInput(page, "Telefone (WhatsApp) *", "(11) 97777-6666");
  await fillCheckoutInput(page, "E-mail para acompanhar o pedido", "cliente.publico@e2e.test");
  await page.getByText("Aceito receber novidades e cupons").click();
  await fillCheckoutInput(page, "CEP *", "01001000");
  await fillCheckoutInput(page, "Rua *", "Praça da Sé");
  await fillCheckoutInput(page, "Número *", "100");
  await fillCheckoutInput(page, "Complemento", "Apto 12");
  await fillCheckoutInput(page, "Bairro *", "Sé");
  await fillCheckoutInput(page, "Cidade *", "São Paulo");
  await fillCheckoutInput(page, "UF *", "SP");
  await fillCheckoutInput(page, "Ponto de referência", "Portaria azul");
  await page.getByRole("button", { name: "Continuar" }).click();

  await expect(page.getByRole("heading", { name: "Forma de pagamento" })).toBeVisible();
  await expect(page.getByText("PIX", { exact: true })).toBeVisible();
  await fillCheckoutTextarea(page, "Observações do pedido", "Sem talheres");
  await page.getByRole("button", { name: "Continuar" }).click();

  await expect(page.getByRole("heading", { name: "Revisar pedido" })).toBeVisible();
  await page.getByPlaceholder("Digite seu cupom").fill("E2E10");
  await page.getByRole("button", { name: "Aplicar" }).click();
  await expect(page.getByText("Cupom E2E: -R$ 10,00")).toBeVisible();
  await expect(page.getByText("Taxa de entrega")).toBeVisible();
  await expect(page.getByRole("button", { name: /Confirmar e enviar .*R\$\s*40,40/ })).toBeVisible();

  await page.getByRole("button", { name: /Confirmar e enviar/ }).click();

  await expect(page.locator("h4").filter({ hasText: "Pedido enviado!" })).toBeVisible({
    timeout: 30_000,
  });

  await expect.poll(() => publicMenuMock.getCouponValidations()).toEqual([{
    code: "E2E10",
    orderValue: 42.9,
  }]);

  await expect.poll(() => publicMenuMock.getCreatedOrders()).toHaveLength(1);
  const [createdOrder] = publicMenuMock.getCreatedOrders();
  expect(createdOrder.payload).toMatchObject({
    restaurant_id: "00000000-0000-4000-8000-000000002101",
    fulfillment_type: "delivery",
    customer_name: "Cliente Público E2E",
    customer_phone: "(11) 97777-6666",
    customer_email: "cliente.publico@e2e.test",
    payment_method: "pix",
    notes: "Sem talheres",
    coupon_code: "E2E10",
    delivery_fee: 7.5,
    estimated_delivery_minutes: 35,
    address: {
      customer_name: "Cliente Público E2E",
      customer_phone: "(11) 97777-6666",
      zip_code: "01001000",
      street: "Praça da Sé",
      number: "100",
      complement: "Apto 12",
      neighborhood: "Sé",
      city: "São Paulo",
      state: "SP",
      reference_point: "Portaria azul",
    },
    items: [{
      product_id: "00000000-0000-4000-8000-000000002301",
      quantity: 1,
      observations: "Sem azeitona",
      flavor_selection: null,
    }],
  });

  await expect.poll(() => publicMenuMock.getCrmCaptures()).toEqual([{
    orderId: createdOrder.orderId,
    acceptsMarketing: true,
    source: "cardapio",
  }]);

  await page.getByRole("button", { name: "Acompanhar pedido" }).click();

  await expect(page).toHaveURL(/\/pedido\/public-track-e2e-1$/);
  await expect(page.getByRole("heading", { name: "Restaurante Público E2E" })).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByRole("heading", { name: "Pedido recebido" })).toBeVisible();
  await expect(page.getByText("Pizza Pública E2E")).toBeVisible();
  await expect(page.getByText("Obs: Sem azeitona")).toBeVisible();
});

test("checkout público gera pagamento PIX online em modo homologação/mock", async ({ page }) => {
  const publicMenuMock = await installPublicMenuSupabaseMock(page, {
    onlinePaymentEnabled: true,
  });

  await page.goto("/cardapio/publico-e2e");

  await expect(page.getByRole("heading", { name: "Restaurante Público E2E" })).toBeVisible({
    timeout: 30_000,
  });

  await page.getByRole("button", { name: "Adicionar" }).first().click();
  await expect(page.getByRole("heading", { name: "Pizza Pública E2E" })).toBeVisible();
  await page.getByRole("button", { name: /Adicionar •/ }).click();

  await page.getByRole("button", { name: "Finalizar pedido" }).click();
  await expect(page.getByRole("heading", { name: "Como deseja pedir?" })).toBeVisible();
  await page.getByRole("button", { name: "Continuar" }).click();

  await expect(page.getByRole("heading", { name: "Endereço de entrega" })).toBeVisible();
  await fillCheckoutInput(page, "Nome completo *", "Cliente PIX E2E");
  await fillCheckoutInput(page, "Telefone (WhatsApp) *", "(11) 96666-5555");
  await fillCheckoutInput(page, "CEP *", "01001000");
  await fillCheckoutInput(page, "Rua *", "Praça da Sé");
  await fillCheckoutInput(page, "Número *", "200");
  await fillCheckoutInput(page, "Bairro *", "Sé");
  await fillCheckoutInput(page, "Cidade *", "São Paulo");
  await fillCheckoutInput(page, "UF *", "SP");
  await page.getByRole("button", { name: "Continuar" }).click();

  await expect(page.getByRole("heading", { name: "Forma de pagamento" })).toBeVisible();
  await page.getByText("PIX online", { exact: true }).click();
  await page.getByRole("button", { name: "Continuar" }).click();

  await expect(page.getByRole("heading", { name: "Revisar pedido" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Confirmar e enviar .*R\$\s*50,40/ })).toBeVisible();
  await page.getByRole("button", { name: /Confirmar e enviar/ }).click();

  await expect(page.locator("h4").filter({ hasText: "Pedido enviado!" })).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByText("PIX copia e cola")).toBeVisible();
  await expect(page.locator("textarea").first()).toHaveValue("000201PIX-E2E-COPIA-E-COLA");

  await expect.poll(() => publicMenuMock.getCreatedOrders()).toHaveLength(1);
  const [createdOrder] = publicMenuMock.getCreatedOrders();
  expect(createdOrder.payload).toMatchObject({
    restaurant_id: "00000000-0000-4000-8000-000000002101",
    fulfillment_type: "delivery",
    customer_name: "Cliente PIX E2E",
    customer_phone: "(11) 96666-5555",
    payment_method: "pix_online",
    delivery_fee: 7.5,
    address: {
      zip_code: "01001000",
      street: "Praça da Sé",
      number: "200",
      neighborhood: "Sé",
      city: "São Paulo",
      state: "SP",
    },
    items: [{
      product_id: "00000000-0000-4000-8000-000000002301",
      quantity: 1,
      observations: null,
      flavor_selection: null,
    }],
  });

  await expect.poll(() => publicMenuMock.getOnlinePaymentRequests()).toEqual([{
    orderId: createdOrder.orderId,
    trackingId: createdOrder.trackingId,
    paymentMethod: "pix",
  }]);

  await page.getByRole("button", { name: "Acompanhar pedido" }).click();

  await expect(page).toHaveURL(/\/pedido\/public-track-e2e-1$/);
  await expect(page.getByRole("heading", { name: "Aguardando pagamento" })).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByText("Pagamento PIX")).toBeVisible();
  await expect(page.locator("textarea").first()).toHaveValue("000201PIX-E2E-COPIA-E-COLA");
});
