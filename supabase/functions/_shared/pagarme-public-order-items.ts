export type OrderItemForPagarme = {
  id: string;
  product_name: string | null;
  quantity: number | null;
  price: number | string | null;
};

export type PagarmeLineItem = {
  amount: number;
  description: string;
  quantity: number;
  code: string;
};

export function toCents(value: number): number {
  return Math.max(0, Math.round(Number(value || 0) * 100));
}

function sumLineItemsCents(lineItems: PagarmeLineItem[]): number {
  return lineItems.reduce((sum, li) => sum + li.amount * li.quantity, 0);
}

/**
 * Builds Pagar.me order line items so the charged amount matches orders.total.
 * Includes delivery fee and reconciles coupon/promotion discounts on product lines.
 */
export function buildPagarmeOrderLineItems(input: {
  items: OrderItemForPagarme[];
  orderTotal: number;
  deliveryFee?: number;
}): PagarmeLineItem[] {
  const lineItems: PagarmeLineItem[] = input.items.map((item) => ({
    amount: toCents(Number(item.price || 0)),
    description: item.product_name || "Item",
    quantity: Math.max(1, Number(item.quantity || 1)),
    code: item.id,
  }));

  const deliveryCents = toCents(input.deliveryFee ?? 0);
  if (deliveryCents > 0) {
    lineItems.push({
      amount: deliveryCents,
      description: "Taxa de entrega",
      quantity: 1,
      code: "delivery_fee",
    });
  }

  const expectedCents = toCents(input.orderTotal);
  let currentCents = sumLineItemsCents(lineItems);
  let diff = expectedCents - currentCents;

  if (diff === 0) return lineItems;

  if (diff > 0) {
    lineItems.push({
      amount: diff,
      description: "Ajuste do pedido",
      quantity: 1,
      code: "order_adjustment",
    });
    return lineItems;
  }

  let toRemove = -diff;
  const adjustable = lineItems.filter((li) => li.code !== "delivery_fee");
  for (const li of adjustable) {
    if (toRemove <= 0) break;
    const lineTotal = li.amount * li.quantity;
    if (lineTotal <= li.quantity) continue;
    const maxCut = lineTotal - li.quantity;
    const cut = Math.min(toRemove, maxCut);
    const perUnit = Math.floor(cut / li.quantity);
    if (perUnit <= 0) continue;
    const applied = perUnit * li.quantity;
    li.amount -= perUnit;
    toRemove -= applied;
  }

  currentCents = sumLineItemsCents(lineItems);
  diff = expectedCents - currentCents;
  if (diff !== 0) {
    throw new Error(
      `Order line items do not match total: expected ${expectedCents}c, got ${currentCents}c (diff ${diff}c)`,
    );
  }

  return lineItems;
}
