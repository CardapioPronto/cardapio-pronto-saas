
import { supabase } from "@/integrations/supabase/client";
import { PagarmePaymentMethod, Plano } from "@/types/plano";
import { fetchPublicPlanSummaries, type PublicPlanSummary } from "./publicPlansService";

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

const mapPlano = (item: PublicPlanSummary): Plano => ({
  id: item.id,
  name: item.name,
  description: item.description,
  price_monthly: item.price_monthly,
  price_yearly: item.price_yearly,
  is_active: item.is_active || false,
  trial_days: item.trial_days ?? 14,
  pagarme_plan_id_monthly: null,
  pagarme_plan_id_yearly: null,
  pagarme_synced_at: null,
  pagarme_sync_status: undefined,
  pagarme_sync_error: null,
  pagarme_payment_methods: ["credit_card", "boleto"],
  features: item.features,
  email_campaigns_enabled: item.email_campaigns_enabled,
  email_campaign_monthly_limit: item.email_campaign_monthly_limit,
  email_campaign_contact_limit: item.email_campaign_contact_limit,
  email_custom_templates_enabled: item.email_custom_templates_enabled,
});

export const fetchPlanos = async (): Promise<Plano[]> => {
  try {
    const planos = (await fetchPublicPlanSummaries()).map(mapPlano);
    const pubfyPlan = planos.find((plano) => plano.id === PUBFY_SINGLE_PLAN_ID);
    return pubfyPlan ? [pubfyPlan] : planos;
  } catch (error) {
    console.error("Erro ao buscar planos:", error);
    return [];
  }
};

const PAGARME_METHODS = new Set<PagarmePaymentMethod>([
  "credit_card",
  "debit_card",
  "boleto",
  "pix",
  "cash",
]);

const normalizeSyncStatus = (status: string | null | undefined): Plano["pagarme_sync_status"] =>
  status === "synced" || status === "error" ? status : "pending";

const normalizePaymentMethods = (methods: string[] | null | undefined): PagarmePaymentMethod[] => {
  const valid = (methods ?? []).filter((method): method is PagarmePaymentMethod =>
    PAGARME_METHODS.has(method as PagarmePaymentMethod),
  );
  return valid.length ? valid : ["credit_card", "boleto"];
};

type CheckoutPlanRow = {
  id: string;
  name: string;
  description: string | null;
  price_monthly: number;
  price_yearly: number;
  is_active: boolean;
  trial_days: number | null;
  pagarme_plan_id_monthly: string | null;
  pagarme_plan_id_yearly: string | null;
  pagarme_sync_status: string | null;
  pagarme_payment_methods: string[] | null;
  features?: PublicPlanSummary["features"];
};

/** Planos ativos com IDs Pagar.me — uso em /assinaturas (checkout do dono). */
export const fetchCheckoutPlanos = async (): Promise<Plano[]> => {
  try {
    const { data, error } = await supabase.rpc("get_checkout_plan_summaries");
    if (error) throw error;
    if (!Array.isArray(data)) return [];

    const planos = (data as CheckoutPlanRow[]).map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      price_monthly: Number(item.price_monthly),
      price_yearly: Number(item.price_yearly),
      is_active: Boolean(item.is_active),
      trial_days: item.trial_days ?? 14,
      pagarme_plan_id_monthly: item.pagarme_plan_id_monthly ?? null,
      pagarme_plan_id_yearly: item.pagarme_plan_id_yearly ?? null,
      pagarme_synced_at: null,
      pagarme_sync_status: normalizeSyncStatus(item.pagarme_sync_status),
      pagarme_sync_error: null,
      pagarme_payment_methods: normalizePaymentMethods(item.pagarme_payment_methods),
      features: item.features ?? [],
      email_campaigns_enabled: false,
      email_campaign_monthly_limit: 0,
      email_campaign_contact_limit: 0,
      email_custom_templates_enabled: true,
    })) as Plano[];

    const pubfyPlan = planos.find((plano) => plano.id === PUBFY_SINGLE_PLAN_ID);
    return pubfyPlan ? [pubfyPlan] : planos;
  } catch (error) {
    console.error("Erro ao buscar planos para checkout:", error);
    return [];
  }
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
