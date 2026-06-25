import { describe, expect, it, vi } from "vitest";
import type { DashboardOverview } from "@/services/dashboardService";
import {
  buildOnboardingChecklist,
  type RestaurantOnboardingProgress,
} from "./onboardingProgressService";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {},
}));

const baseOverview: DashboardOverview = {
  restaurantName: "Restaurante Teste",
  isRestaurantActive: true,
  restaurantProfileCompleted: true,
  publicMenuSlug: "restaurante-teste",
  totalProducts: 4,
  availableProducts: 4,
  unavailableProducts: 0,
  totalOrders: 1,
  totalCategories: 2,
  ordersToday: 1,
  openOrders: 0,
  openOrdersToday: 0,
  overdueOpenOrders: 0,
  pendingOrders: 0,
  preparingOrders: 0,
  totalTables: 4,
  occupiedTables: 0,
  reservedTables: 0,
  unavailableTables: 0,
  activeCoupons: 0,
  expiringCoupons: 0,
  activePromotions: 0,
  whatsappInstances: 0,
  whatsappConnectedInstances: 0,
  whatsappNeedsAttention: 0,
  waitingHuman: 0,
  unreadMessages: 0,
  menuThemeConfigured: true,
};

const progressRow = (
  stepId: string,
  status: RestaurantOnboardingProgress["status"],
): RestaurantOnboardingProgress => ({
  id: `progress-${stepId}`,
  restaurant_id: "restaurant-1",
  step_id: stepId,
  status,
  completed_at: status === "done" ? "2026-06-25T12:00:00.000Z" : null,
  completed_by: status === "done" ? "user-1" : null,
  skipped_at: status === "skipped" ? "2026-06-25T12:00:00.000Z" : null,
  skipped_by: status === "skipped" ? "user-1" : null,
  notes: null,
  metadata: {},
  created_at: "2026-06-25T12:00:00.000Z",
  updated_at: "2026-06-25T12:00:00.000Z",
});

describe("buildOnboardingChecklist", () => {
  it("marca conta como travada quando dados basicos ou cardapio minimo faltam", () => {
    const checklist = buildOnboardingChecklist(
      {
        ...baseOverview,
        restaurantProfileCompleted: false,
        availableProducts: 0,
        totalCategories: 0,
      },
      [],
      { canAccessPDV: true, canManageProducts: true, canManageSettings: true },
    );

    expect(checklist.health.status).toBe("blocked");
    expect(checklist.nextItem?.id).toBe("restaurant-profile");
    expect(checklist.progressPercent).toBeLessThan(50);
  });

  it("combina passos automaticos e manuais persistidos para liberar pronto para venda", () => {
    const checklist = buildOnboardingChecklist(
      baseOverview,
      [
        progressRow("team-training", "done"),
        progressRow("support-handoff", "done"),
      ],
      { canAccessPDV: true, canManageProducts: true, canManageSettings: true },
    );

    expect(checklist.progressPercent).toBe(100);
    expect(checklist.health.status).toBe("ready_to_sell");
    expect(checklist.nextItem).toBeNull();
  });

  it("filtra passos por permissao disponivel ao usuario", () => {
    const checklist = buildOnboardingChecklist(
      baseOverview,
      [],
      { canAccessPDV: true, canManageProducts: false, canManageSettings: false },
    );

    expect(checklist.items.map((item) => item.id)).toEqual(["test-order"]);
    expect(checklist.progressPercent).toBe(100);
  });
});
