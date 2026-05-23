import { describe, expect, it } from "vitest";
import { mapPedidoStatusToDeliveryStatus } from "./deliveryOrderStatusWhatsApp";

describe("mapPedidoStatusToDeliveryStatus", () => {
  it("mapeia status do PDV para delivery_orders.status", () => {
    expect(mapPedidoStatusToDeliveryStatus("pendente")).toBe("pending");
    expect(mapPedidoStatusToDeliveryStatus("preparo")).toBe("preparing");
    expect(mapPedidoStatusToDeliveryStatus("em-andamento")).toBe("preparing");
    expect(mapPedidoStatusToDeliveryStatus("pronto")).toBe("ready");
    expect(mapPedidoStatusToDeliveryStatus("finalizado")).toBe("delivered");
    expect(mapPedidoStatusToDeliveryStatus("cancelado")).toBe("cancelled");
    expect(mapPedidoStatusToDeliveryStatus("aguardando_pagamento")).toBe(
      "awaiting_payment",
    );
    expect(mapPedidoStatusToDeliveryStatus("pagamento_falhou")).toBe(
      "payment_failed",
    );
  });
});
