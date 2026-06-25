import { expect, test } from "@playwright/test";
import { installAuthenticatedSupabaseMock } from "./fixtures/authenticatedSupabase";

test.describe.configure({ timeout: 120_000 });

test.describe("fluxos críticos autenticados", () => {
  test("dono acessa indicadores financeiros e abre o PDV com catálogo", async ({ page }) => {
    await installAuthenticatedSupabaseMock(page, "owner");

    await page.goto("/dashboard");

    await expect(page.getByRole("heading", { name: "Restaurante E2E" })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText("Faturamento (30 dias)")).toBeVisible();
    await expect(page.getByText("R$ 1.234,56", { exact: true })).toBeVisible();

    await page.getByRole("link", { name: "Abrir PDV" }).first().click();
    await expect(page).toHaveURL(/\/pdv$/);
    await expect(page.getByRole("heading", { name: "Restaurante E2E" })).toBeVisible();
    await expect(page.getByText("X-Burger E2E", { exact: true })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Histórico" })).toBeVisible();
  });

  test("PDV cria pedido de balcão e permite cancelar e reabrir no histórico", async ({ page }) => {
    const supabaseMock = await installAuthenticatedSupabaseMock(page, "owner");

    await page.goto("/pdv");

    await expect(page.getByRole("heading", { name: "Restaurante E2E" })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText("X-Burger E2E", { exact: true })).toBeVisible();

    await page.getByRole("tab", { name: "Balcão" }).click();
    await expect(page.getByText("Comanda: Balcão")).toBeVisible();

    await page.getByRole("button", { name: /X-Burger E2E/ }).click();
    await expect(page.getByRole("heading", { name: "Adicionar X-Burger E2E" })).toBeVisible();
    await page.getByPlaceholder(/Alguma observação/).fill("Sem cebola");
    await page.getByRole("button", { name: "Adicionar ao Pedido" }).click();

    await expect(page.getByText("1 item").first()).toBeVisible();
    await expect(page.getByText("R$ 29.90").first()).toBeVisible();

    await page.getByLabel("Nome do Cliente").fill("Cliente Balcão E2E");
    await page.getByLabel("Telefone/WhatsApp").fill("(11) 98888-7777");
    await page.getByLabel(/Cliente autorizou receber campanhas/).check();

    await expect(page.getByRole("button", { name: "Finalizar Pedido" })).toBeEnabled();
    await page.getByRole("button", { name: "Finalizar Pedido" }).click();

    await expect(page.getByRole("tab", { name: "Histórico" })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByText("Cliente Balcão E2E")).toBeVisible();
    await expect(page.getByText("Balcão").first()).toBeVisible();

    await expect.poll(() => supabaseMock.getCreatedPosOrders()).toHaveLength(1);
    const [createdOrder] = supabaseMock.getCreatedPosOrders();
    expect(createdOrder.payload).toMatchObject({
      restaurant_id: "00000000-0000-4000-8000-000000000101",
      order_type: "balcao",
      table_id: null,
      customer_name: "Cliente Balcão E2E",
      customer_phone: "(11) 98888-7777",
      items: [{
        product_id: "00000000-0000-4000-8000-000000000301",
        quantity: 1,
        observations: "Sem cebola",
      }],
    });

    await page.getByRole("button", { name: "Ver mais" }).first().click();
    await expect(page.getByText("1x X-Burger E2E")).toBeVisible();
    await expect(page.getByText("Obs: Sem cebola")).toBeVisible();

    await page.getByRole("button", { name: "Cancelar" }).first().click();
    await expect(page.getByText("Cancelado").first()).toBeVisible();

    await page.getByRole("button", { name: "Reabrir pedido" }).first().click();
    await expect(page.getByText("Pendente").first()).toBeVisible();

    await expect.poll(() => supabaseMock.getStatusChanges().map((change) => change.status))
      .toEqual(["cancelado", "pendente"]);
  });

  test("PDV cria pedido de mesa e percorre preparo, pronto, finalizado e reabertura", async ({ page }) => {
    const supabaseMock = await installAuthenticatedSupabaseMock(page, "owner");

    await page.goto("/pdv");

    await expect(page.getByRole("heading", { name: "Restaurante E2E" })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText("X-Burger E2E", { exact: true })).toBeVisible();
    await expect(page.getByText("Comanda: Mesa não selecionada")).toBeVisible();

    await page.getByRole("button", { name: "Selecionar mesa", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Selecionar Mesa" })).toBeVisible();
    await page.getByRole("button", { name: /Mesa 1/ }).click();
    await expect(page.getByText("Comanda: Mesa 1")).toBeVisible();

    await page.getByRole("button", { name: /X-Burger E2E/ }).click();
    await expect(page.getByRole("heading", { name: "Adicionar X-Burger E2E" })).toBeVisible();
    await page.getByRole("button", { name: "Adicionar ao Pedido" }).click();

    await page.getByLabel("Nome do Cliente").fill("Cliente Mesa E2E");
    await expect(page.getByRole("button", { name: "Finalizar Pedido" })).toBeEnabled();
    await page.getByRole("button", { name: "Finalizar Pedido" }).click();

    await expect(page.getByRole("tab", { name: "Histórico" })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByText("Cliente Mesa E2E")).toBeVisible();
    await expect(page.getByText("Mesa 1").first()).toBeVisible();

    await expect.poll(() => supabaseMock.getCreatedPosOrders()).toHaveLength(1);
    const [createdOrder] = supabaseMock.getCreatedPosOrders();
    expect(createdOrder.payload).toMatchObject({
      restaurant_id: "00000000-0000-4000-8000-000000000101",
      order_type: "mesa",
      table_id: "00000000-0000-4000-8000-000000000501",
      customer_name: "Cliente Mesa E2E",
      items: [{
        product_id: "00000000-0000-4000-8000-000000000301",
        quantity: 1,
      }],
    });

    await page.getByRole("button", { name: "Iniciar preparo" }).first().click();
    await expect(page.getByText("Em preparo").first()).toBeVisible();

    await page.getByRole("button", { name: "Marcar como pronto" }).first().click();
    await expect(page.getByText("Pronto").first()).toBeVisible();

    await page.getByRole("button", { name: "Finalizar pedido" }).first().click();
    await expect(page.getByText("Finalizado").first()).toBeVisible();

    await page.getByRole("button", { name: "Reabrir pedido" }).first().click();
    await expect(page.getByText("Pendente").first()).toBeVisible();

    await expect.poll(() => supabaseMock.getStatusChanges().map((change) => change.status))
      .toEqual(["preparo", "pronto", "finalizado", "pendente"]);
  });

  test("Cozinha recebe pedido do PDV e avança de entrada para pronto", async ({ page }) => {
    const supabaseMock = await installAuthenticatedSupabaseMock(page, "owner");

    await page.goto("/pdv");

    await expect(page.getByRole("heading", { name: "Restaurante E2E" })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText("X-Burger E2E", { exact: true })).toBeVisible();

    await page.getByRole("tab", { name: "Balcão" }).click();
    await expect(page.getByText("Comanda: Balcão")).toBeVisible();

    await page.getByRole("button", { name: /X-Burger E2E/ }).click();
    await expect(page.getByRole("heading", { name: "Adicionar X-Burger E2E" })).toBeVisible();
    await page.getByRole("button", { name: "Adicionar ao Pedido" }).click();

    await page.getByLabel("Nome do Cliente").fill("Cliente Cozinha E2E");
    await expect(page.getByRole("button", { name: "Finalizar Pedido" })).toBeEnabled();
    await page.getByRole("button", { name: "Finalizar Pedido" }).click();

    await expect(page.getByRole("tab", { name: "Histórico" })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByText("Cliente Cozinha E2E")).toBeVisible();

    await expect.poll(() => supabaseMock.getCreatedPosOrders()).toHaveLength(1);
    const [createdOrder] = supabaseMock.getCreatedPosOrders();

    await page.goto("/cozinha");

    await expect(page.getByRole("heading", { name: "Restaurante E2E" })).toBeVisible({
      timeout: 30_000,
    });
    const orderCard = page.getByTestId(`kitchen-order-${createdOrder.id}`);
    await expect(page.getByTestId("kitchen-column-pendente").getByText("Cliente Cozinha E2E")).toBeVisible();
    await expect(orderCard.getByText("Balcao")).toBeVisible();
    await expect(orderCard.getByText("Entrada", { exact: true })).toBeVisible();

    await orderCard.getByRole("button", { name: "Iniciar" }).click();
    await expect(page.getByTestId("kitchen-column-preparo").getByTestId(`kitchen-order-${createdOrder.id}`)).toBeVisible();
    await expect(orderCard.getByText("Em preparo", { exact: true })).toBeVisible();

    await orderCard.getByRole("button", { name: "Pronto" }).click();
    await expect(page.getByTestId("kitchen-column-pronto").getByTestId(`kitchen-order-${createdOrder.id}`)).toBeVisible();
    await expect(orderCard.getByText("Pronto", { exact: true })).toBeVisible();

    await expect.poll(() =>
      supabaseMock
        .getStatusChanges()
        .filter((change) => change.orderId === createdOrder.id)
        .map((change) => change.status),
    ).toEqual(["preparo", "pronto"]);
  });

  test("funcionário restrito não vê financeiro nem acessa configurações", async ({ page }) => {
    await installAuthenticatedSupabaseMock(page, "restricted_employee");

    await page.goto("/dashboard");

    await expect(page.getByRole("heading", { name: "Restaurante E2E" })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText("Faturamento (30 dias)")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Restrito" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Configurações" })).toHaveCount(0);

    await page.goto("/configuracoes");
    await expect(page.getByRole("heading", { name: "Acesso negado" })).toBeVisible();
    await expect(page.getByText("Ver Configurações", { exact: true })).toBeVisible();
  });
});

test.describe("controle de acesso por assinatura", () => {
  test("trial ativo libera o dashboard e exibe os dias restantes", async ({ page }) => {
    await installAuthenticatedSupabaseMock(page, "owner", "trial_active");

    await page.goto("/dashboard");

    await expect(page.getByRole("heading", { name: "Restaurante E2E" })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText(/período de teste/).first()).toBeVisible();
    await expect(page.getByText(/Restam 5 dias/)).toBeVisible();
  });

  test("trial expirado bloqueia a área autenticada", async ({ page }) => {
    await installAuthenticatedSupabaseMock(page, "owner", "trial_expired");

    await page.goto("/dashboard");

    await expect(page.getByRole("heading", { name: "Assinatura Necessária" })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText(/período de teste expirou/i)).toBeVisible();
  });

  test("past_due dentro da tolerância mantém acesso e alerta o dono", async ({ page }) => {
    await installAuthenticatedSupabaseMock(page, "owner", "past_due_grace");

    await page.goto("/dashboard");

    await expect(page.getByRole("heading", { name: "Restaurante E2E" })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText("Pagamento em atraso", { exact: true }).first()).toBeVisible();
    await expect(page.getByText(/continua com acesso por mais 5 dias/i).first()).toBeVisible();
  });

  test("past_due fora da tolerância bloqueia a operação", async ({ page }) => {
    await installAuthenticatedSupabaseMock(page, "owner", "past_due_blocked");

    await page.goto("/dashboard");

    await expect(page.getByRole("heading", { name: "Assinatura Necessária" })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText(/prazo de tolerância após o vencimento terminou/i)).toBeVisible();
  });
});
