
import { supabase } from "@/lib/supabase";
import { Plano } from "@/types/plano";

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

  // Transform data to match Plano type
  return data?.map(item => ({
    id: item.id,
    name: item.name,
    price_monthly: item.price_monthly,
    price_yearly: item.price_yearly,
    is_active: item.is_active || false,
    created_at: item.created_at || undefined,
    updated_at: item.updated_at || undefined,
    features: item.plan_features?.map(f => ({
      feature: f.feature,
      is_enabled: f.is_enabled || false
    })) || []
  })) || [];
};

export const fetchPlanosForLanding = async () => {
  const planos = await fetchPlanos();
  
  // Transform to landing page format
  return planos.map(plano => ({
    name: plano.name,
    price: plano.price_monthly,
    priceYearly: plano.price_yearly,
    description: getPlanoDescription(plano.name),
    popular: plano.name === "Profissional",
    features: plano.features?.filter(f => f.is_enabled).map(f => ({
      feature: f.feature,
      included: true
    })) || [],
    buttonText: getButtonText(plano.name)
  }));
};

const getPlanoDescription = (name: string): string => {
  const descriptions: Record<string, string> = {
    "Inicial": "Para estabelecimentos com operação simplificada.",
    "Básico": "Ideal para pequenos negócios iniciando sua presença digital",
    "Profissional": "Ideal para restaurantes de médio porte.",
    "Empresarial": "Sistema completo para redes de restaurantes",
    "Enterprise": "Para redes e estabelecimentos de grande porte."
  };
  return descriptions[name] || "Plano personalizado para suas necessidades.";
};

const getButtonText = (name: string): string => {
  const buttonTexts: Record<string, string> = {
    "Inicial": "Começar grátis",
    "Básico": "Começar agora",
    "Profissional": "Começar teste grátis",
    "Empresarial": "Escolher Profissional",
    "Enterprise": "Falar com consultor"
  };
  return buttonTexts[name] || "Escolher plano";
};
