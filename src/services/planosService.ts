
import { supabase } from "@/lib/supabase";
import { Plano } from "@/types/plano";

const PUBFY_SINGLE_PLAN_ID = "4953d3fc-4945-4d80-bc84-58e4f6f26698";

const LANDING_PLAN_NAMES = ["Básico", "Profissional", "Empresarial"] as const;

type LandingPlanName = (typeof LANDING_PLAN_NAMES)[number];

type LandingPlanConfig = {
  description: string;
  buttonText: string;
  popular?: boolean;
};

const LANDING_PLAN_CONFIG: Record<LandingPlanName, LandingPlanConfig> = {
  Básico: {
    description: "Entrada profissional para digitalizar atendimento, organizar produtos e começar a vender com mais agilidade.",
    buttonText: "Começar agora",
  },
  Profissional: {
    description: "Plano mais equilibrado para operar com cardápio digital, PDV, mesas, equipe e relatórios com eficiência real.",
    buttonText: "Começar teste grátis",
    popular: true,
  },
  Empresarial: {
    description: "Estrutura avançada para operações maiores, múltiplos fluxos e gestão com suporte estratégico e mais controle.",
    buttonText: "Falar com especialista",
  },
};

type PlanFeatureRow = {
  feature: string;
  is_enabled: boolean | null;
};

type PlanRow = {
  id: string;
  name: string;
  description: string | null;
  price_monthly: number;
  price_yearly: number;
  is_active: boolean | null;
  trial_days: number | null;
  pagarme_plan_id_monthly: string | null;
  pagarme_plan_id_yearly: string | null;
  pagarme_synced_at: string | null;
  pagarme_sync_status: string | null;
  pagarme_sync_error: string | null;
  pagarme_payment_methods: string[] | null;
  created_at: string | null;
  updated_at: string | null;
  plan_features?: PlanFeatureRow[] | null;
};

const PLAN_FIELDS = `
  id,
  name,
  description,
  price_monthly,
  price_yearly,
  is_active,
  trial_days,
  pagarme_plan_id_monthly,
  pagarme_plan_id_yearly,
  pagarme_synced_at,
  pagarme_sync_status,
  pagarme_sync_error,
  created_at,
  updated_at
`;

const mapPlano = (item: PlanRow): Plano => ({
  id: item.id,
  name: item.name,
  description: item.description,
  price_monthly: item.price_monthly,
  price_yearly: item.price_yearly,
  is_active: item.is_active || false,
  trial_days: item.trial_days ?? 14,
  pagarme_plan_id_monthly: item.pagarme_plan_id_monthly,
  pagarme_plan_id_yearly: item.pagarme_plan_id_yearly,
  pagarme_synced_at: item.pagarme_synced_at,
  pagarme_sync_status: item.pagarme_sync_status as Plano["pagarme_sync_status"],
  pagarme_sync_error: item.pagarme_sync_error,
  pagarme_payment_methods: (item.pagarme_payment_methods ?? ["credit_card", "boleto"]) as Plano["pagarme_payment_methods"],
  created_at: item.created_at || undefined,
  updated_at: item.updated_at || undefined,
  features:
    item.plan_features?.map((feature) => ({
      feature: feature.feature,
      is_enabled: feature.is_enabled || false,
    })) || [],
});

const fetchActivePlansWithoutFeatures = async () => {
  const { data, error } = await supabase
    .from("plans")
    .select(PLAN_FIELDS)
    .eq("is_active", true)
    .order("price_monthly", { ascending: true });

  if (error) throw error;
  return ((data ?? []) as PlanRow[]).map(mapPlano);
};

const fetchSinglePubfyPlan = async () => {
  const { data, error } = await supabase
    .from("plans")
    .select(PLAN_FIELDS)
    .eq("id", PUBFY_SINGLE_PLAN_ID)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    console.error("Erro ao buscar Plano Pubfy pelo ID:", error);
    return null;
  }

  return data ? mapPlano(data as PlanRow) : null;
};

export const fetchPlanos = async (): Promise<Plano[]> => {
  const { data, error } = await supabase
    .from("plans")
    .select(`
      ${PLAN_FIELDS},
      plan_features (
        feature,
        is_enabled
      )
    `)
    .eq("is_active", true)
    .order("price_monthly", { ascending: true });

  if (error) {
    console.error("Erro ao buscar planos:", error);
    try {
      const fallbackPlans = await fetchActivePlansWithoutFeatures();
      const pubfyPlan = fallbackPlans.find((plano) => plano.id === PUBFY_SINGLE_PLAN_ID);
      return pubfyPlan ? [pubfyPlan] : fallbackPlans;
    } catch (fallbackError) {
      console.error("Erro ao buscar planos sem features:", fallbackError);
      const pubfyPlan = await fetchSinglePubfyPlan();
      return pubfyPlan ? [pubfyPlan] : [];
    }
  }

  const planos = ((data ?? []) as PlanRow[]).map(mapPlano);
  const pubfyPlan = planos.find((plano) => plano.id === PUBFY_SINGLE_PLAN_ID);
  if (pubfyPlan) return [pubfyPlan];

  const directPubfyPlan = await fetchSinglePubfyPlan();
  return directPubfyPlan ? [directPubfyPlan] : planos;
};

export const fetchPlanosForLanding = async () => {
  const planos = await fetchPlanos();
  const landingPlanos = selectBestPlansForLanding(planos);

  return landingPlanos.map((plano) => ({
    id: plano.id,
    name: plano.name,
    price: plano.price_monthly,
    priceYearly: plano.price_yearly,
    description: getPlanoDescription(plano.name as LandingPlanName),
    popular: LANDING_PLAN_CONFIG[plano.name as LandingPlanName]?.popular || false,
    features:
      plano.features
        ?.filter((feature) => feature.is_enabled)
        .map((feature) => ({
          feature: feature.feature,
          included: true,
        })) || [],
    buttonText: getButtonText(plano.name as LandingPlanName),
  }));
};

const selectBestPlansForLanding = (planos: Plano[]): Plano[] => {
  return LANDING_PLAN_NAMES.map((planName) => {
    const matchingPlans = planos.filter(
      (plano) => plano.is_active && plano.name === planName,
    );

    return matchingPlans.sort(comparePlansForLanding)[0];
  }).filter(Boolean) as Plano[];
};

const comparePlansForLanding = (a: Plano, b: Plano) => {
  const enabledFeaturesDiff = getEnabledFeaturesCount(b) - getEnabledFeaturesCount(a);
  if (enabledFeaturesDiff !== 0) return enabledFeaturesDiff;

  const updatedAtA = new Date(a.updated_at ?? a.created_at ?? 0).getTime();
  const updatedAtB = new Date(b.updated_at ?? b.created_at ?? 0).getTime();
  if (updatedAtB !== updatedAtA) return updatedAtB - updatedAtA;

  return Number(b.price_monthly) - Number(a.price_monthly);
};

const getEnabledFeaturesCount = (plano: Plano) =>
  plano.features?.filter((feature) => feature.is_enabled).length ?? 0;

const getPlanoDescription = (name: LandingPlanName): string => {
  return LANDING_PLAN_CONFIG[name]?.description || "Plano personalizado para sua operação.";
};

const getButtonText = (name: LandingPlanName): string => {
  return LANDING_PLAN_CONFIG[name]?.buttonText || "Escolher plano";
};
