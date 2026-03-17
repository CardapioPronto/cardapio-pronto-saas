
import { supabase } from "@/lib/supabase";
import { Plano } from "@/types/plano";

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

export const fetchPlanos = async (): Promise<Plano[]> => {
  const { data, error } = await supabase
    .from("plans")
    .select(`
      id,
      name,
      price_monthly,
      price_yearly,
      is_active,
      created_at,
      updated_at,
      plan_features (
        feature,
        is_enabled
      )
    `)
    .eq("is_active", true)
    .order("price_monthly", { ascending: true });

  if (error) {
    console.error("Erro ao buscar planos:", error);
    return [];
  }

  return data?.map((item) => ({
    id: item.id,
    name: item.name,
    price_monthly: item.price_monthly,
    price_yearly: item.price_yearly,
    is_active: item.is_active || false,
    created_at: item.created_at || undefined,
    updated_at: item.updated_at || undefined,
    features:
      item.plan_features?.map((f) => ({
        feature: f.feature,
        is_enabled: f.is_enabled || false,
      })) || [],
  })) || [];
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
