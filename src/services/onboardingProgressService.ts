import { supabase } from "@/integrations/supabase/client";
import type { DashboardOverview } from "@/services/dashboardService";

export type OnboardingStepId =
  | "restaurant-profile"
  | "menu-products"
  | "public-menu"
  | "test-order"
  | "team-training"
  | "support-handoff";

export type OnboardingProgressStatus = "pending" | "done" | "skipped";
export type OnboardingHealthStatus = "blocked" | "at_risk" | "active" | "ready_to_sell";
export type OnboardingCapability = "settings" | "products" | "pdv";

export type RestaurantOnboardingProgress = {
  id: string;
  restaurant_id: string;
  step_id: string;
  status: OnboardingProgressStatus;
  completed_at: string | null;
  completed_by: string | null;
  skipped_at: string | null;
  skipped_by: string | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type OnboardingStepDefinition = {
  id: OnboardingStepId;
  title: string;
  description: (overview: DashboardOverview) => string;
  href: string;
  actionLabel: string;
  capability: OnboardingCapability;
  automaticDone: (overview: DashboardOverview) => boolean;
  manualOnly?: boolean;
};

export type OnboardingChecklistItem = {
  id: OnboardingStepId;
  title: string;
  description: string;
  href: string;
  actionLabel: string;
  done: boolean;
  skipped: boolean;
  automaticDone: boolean;
  manualOnly: boolean;
  persistedStatus: OnboardingProgressStatus | null;
  progress: RestaurantOnboardingProgress | null;
};

export type OnboardingChecklistSummary = {
  items: OnboardingChecklistItem[];
  completed: number;
  total: number;
  progressPercent: number;
  nextItem: OnboardingChecklistItem | null;
  health: {
    status: OnboardingHealthStatus;
    label: string;
    description: string;
  };
};

export type OnboardingCapabilities = {
  canAccessPDV: boolean;
  canManageProducts: boolean;
  canManageSettings: boolean;
};

export const ONBOARDING_STEPS: OnboardingStepDefinition[] = [
  {
    id: "restaurant-profile",
    title: "Completar dados do restaurante",
    description: () => "Nome, contato, endereco e cardapio publico ativo.",
    href: "/configuracoes",
    actionLabel: "Abrir configuracoes",
    capability: "settings",
    automaticDone: (overview) => overview.restaurantProfileCompleted,
  },
  {
    id: "menu-products",
    title: "Cadastrar categorias e produtos",
    description: (overview) =>
      `${overview.availableProducts}/${overview.totalProducts} produtos ativos em ${overview.totalCategories} categoria${overview.totalCategories === 1 ? "" : "s"}.`,
    href: "/produtos",
    actionLabel: "Abrir produtos",
    capability: "products",
    automaticDone: (overview) => overview.totalCategories > 0 && overview.availableProducts > 0,
  },
  {
    id: "public-menu",
    title: "Publicar QR Code e link rastreavel",
    description: () => "QR Code, link para bio e material de divulgacao prontos para o canal proprio.",
    href: "/cardapio?tab=qrcode",
    actionLabel: "Abrir QR Code",
    capability: "products",
    automaticDone: (overview) =>
      overview.isRestaurantActive === true
      && overview.menuThemeConfigured
      && overview.totalCategories > 0
      && overview.availableProducts > 0,
  },
  {
    id: "test-order",
    title: "Fazer um pedido de teste",
    description: () => "Pedido validado ate PDV, historico e cozinha antes do primeiro turno.",
    href: "/pdv",
    actionLabel: "Abrir PDV",
    capability: "pdv",
    automaticDone: (overview) => overview.totalOrders > 0,
  },
  {
    id: "team-training",
    title: "Treinar equipe de operacao",
    description: () => "Dono, caixa e cozinha alinhados para pedido, status e suporte no turno.",
    href: "/funcionarios",
    actionLabel: "Abrir equipe",
    capability: "settings",
    automaticDone: () => false,
    manualOnly: true,
  },
  {
    id: "support-handoff",
    title: "Confirmar canal de suporte",
    description: () => "Contato principal, horario de atendimento e responsavel interno registrados.",
    href: "/dashboard",
    actionLabel: "Ver dashboard",
    capability: "settings",
    automaticDone: () => false,
    manualOnly: true,
  },
];

const capabilityAllowed = (
  capability: OnboardingCapability,
  capabilities: OnboardingCapabilities,
) => {
  if (capability === "pdv") return capabilities.canAccessPDV;
  if (capability === "products") return capabilities.canManageProducts;
  return capabilities.canManageSettings;
};

const normalizeProgressStatus = (status: string | null | undefined): OnboardingProgressStatus => {
  if (status === "done" || status === "skipped") return status;
  return "pending";
};

const resolveHealth = (
  overview: DashboardOverview,
  items: OnboardingChecklistItem[],
  progressPercent: number,
) => {
  if (!overview.restaurantProfileCompleted || overview.availableProducts === 0 || overview.totalCategories === 0) {
    return {
      status: "blocked" as const,
      label: "Travado",
      description: "Faltam dados basicos ou cardapio minimo para iniciar piloto.",
    };
  }

  if (progressPercent === 100 && overview.totalOrders > 0) {
    return {
      status: "ready_to_sell" as const,
      label: "Pronto para venda",
      description: "Checklist essencial concluido e pedido de teste registrado.",
    };
  }

  if (overview.totalOrders > 0 && progressPercent >= 70) {
    return {
      status: "active" as const,
      label: "Ativo",
      description: "Operacao inicial validada; faltam apenas etapas finais de implantacao.",
    };
  }

  if (items.some((item) => item.manualOnly && !item.done && !item.skipped)) {
    return {
      status: "at_risk" as const,
      label: "Em risco",
      description: "Fluxo tecnico avancou, mas ainda falta alinhamento operacional.",
    };
  }

  return {
    status: "at_risk" as const,
    label: "Em risco",
    description: "Ainda falta pedido de teste ou validacao final antes de piloto real.",
  };
};

export function buildOnboardingChecklist(
  overview: DashboardOverview,
  progressRows: RestaurantOnboardingProgress[],
  capabilities: OnboardingCapabilities,
): OnboardingChecklistSummary {
  const progressByStep = new Map(
    progressRows.map((row) => [row.step_id, row]),
  );

  const items = ONBOARDING_STEPS
    .filter((step) => capabilityAllowed(step.capability, capabilities))
    .map((step): OnboardingChecklistItem => {
      const progress = progressByStep.get(step.id) ?? null;
      const persistedStatus = progress ? normalizeProgressStatus(progress.status) : null;
      const automaticDone = step.automaticDone(overview);
      const skipped = persistedStatus === "skipped";
      const done = automaticDone || persistedStatus === "done";

      return {
        id: step.id,
        title: step.title,
        description: step.description(overview),
        href: step.href,
        actionLabel: step.actionLabel,
        done,
        skipped,
        automaticDone,
        manualOnly: Boolean(step.manualOnly),
        persistedStatus,
        progress,
      };
    });

  const completed = items.filter((item) => item.done || item.skipped).length;
  const total = items.length;
  const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;
  const nextItem = items.find((item) => !item.done && !item.skipped) ?? null;

  return {
    items,
    completed,
    total,
    progressPercent,
    nextItem,
    health: resolveHealth(overview, items, progressPercent),
  };
}

export async function listRestaurantOnboardingProgress(restaurantId: string) {
  const { data, error } = await supabase
    .from("restaurant_onboarding_progress")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return (data || []) as RestaurantOnboardingProgress[];
}

export async function saveRestaurantOnboardingStep(input: {
  restaurantId: string;
  stepId: OnboardingStepId;
  status: OnboardingProgressStatus;
  userId?: string | null;
}) {
  const now = new Date().toISOString();
  const completed = input.status === "done";
  const skipped = input.status === "skipped";

  const { data, error } = await supabase
    .from("restaurant_onboarding_progress")
    .upsert({
      restaurant_id: input.restaurantId,
      step_id: input.stepId,
      status: input.status,
      completed_at: completed ? now : null,
      completed_by: completed ? input.userId ?? null : null,
      skipped_at: skipped ? now : null,
      skipped_by: skipped ? input.userId ?? null : null,
    }, {
      onConflict: "restaurant_id,step_id",
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as RestaurantOnboardingProgress;
}
