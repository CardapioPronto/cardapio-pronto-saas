import { describe, expect, it } from "vitest";
import { buildFirstWeekFollowUp, daysSince, type FollowUpSignals } from "./onboardingFollowUp";

const emptySignals: FollowUpSignals = {
  profileCompleted: false,
  hasProducts: false,
  publicMenuActive: false,
  hasAnyOrder: false,
  teamTrained: false,
  extraChannelReady: false,
  hasRecentOrders: false,
};

const start = new Date("2026-08-01T12:00:00.000Z");

describe("daysSince", () => {
  it("conta dias completos e nunca retorna negativo", () => {
    expect(daysSince(start, new Date("2026-08-01T18:00:00.000Z"))).toBe(0);
    expect(daysSince(start, new Date("2026-08-04T12:00:00.000Z"))).toBe(3);
    expect(daysSince(start, new Date("2026-07-30T12:00:00.000Z"))).toBe(0);
  });
});

describe("buildFirstWeekFollowUp", () => {
  it("marca o dia atual e mantem futuros como upcoming", () => {
    const plan = buildFirstWeekFollowUp(start, emptySignals, new Date("2026-08-01T13:00:00.000Z"));
    expect(plan.dayIndex).toBe(0);
    expect(plan.tasks[0].status).toBe("today");
    expect(plan.tasks[1].status).toBe("upcoming");
    expect(plan.lateTasks).toHaveLength(0);
    expect(plan.currentTask?.id).toBe("d0-ativacao");
  });

  it("aponta atrasos quando etapas passadas seguem pendentes", () => {
    const plan = buildFirstWeekFollowUp(start, emptySignals, new Date("2026-08-05T12:00:00.000Z"));
    expect(plan.dayIndex).toBe(4);
    expect(plan.lateTasks.map((task) => task.id)).toEqual([
      "d0-ativacao",
      "d1-cardapio",
      "d2-pedido-teste",
      "d3-equipe",
    ]);
    expect(plan.summary).toContain("atrasada");
  });

  it("conclui a rotina quando todos os sinais estao ok", () => {
    const plan = buildFirstWeekFollowUp(
      start,
      {
        profileCompleted: true,
        hasProducts: true,
        publicMenuActive: true,
        hasAnyOrder: true,
        teamTrained: true,
        extraChannelReady: true,
        hasRecentOrders: true,
      },
      new Date("2026-08-09T12:00:00.000Z"),
    );
    expect(plan.completed).toBe(plan.total);
    expect(plan.progressPercent).toBe(100);
    expect(plan.windowClosed).toBe(true);
    expect(plan.summary).toContain("concluida");
  });
});
