export type MultiFlavorPricingStrategy = "highest" | "average";

export interface MultiFlavorConfig {
  enabled: boolean;
  pricing_strategy: MultiFlavorPricingStrategy;
  max_flavors: number;
}

export interface MultiFlavorSelectionFlavor {
  product_id: string;
  name: string;
  price: number;
  final_price?: number | null;
  portion: number;
}

export interface MultiFlavorSelection {
  mode: "combined";
  pricing_strategy: MultiFlavorPricingStrategy;
  base_unit_price: number;
  unit_price: number;
  flavors: MultiFlavorSelectionFlavor[];
}

export const DEFAULT_MULTI_FLAVOR_CONFIG: MultiFlavorConfig = {
  enabled: true,
  pricing_strategy: "highest",
  max_flavors: 2,
};

const roundCurrency = (value: number) => Math.round(value * 100) / 100;

const effectiveFlavorPrice = (flavor: Pick<MultiFlavorSelectionFlavor, "price" | "final_price">) =>
  Number.isFinite(Number(flavor.final_price)) ? Number(flavor.final_price) : Number(flavor.price);

export const normalizeMultiFlavorConfig = (value: Partial<MultiFlavorConfig> | null | undefined): MultiFlavorConfig => ({
  enabled: typeof value?.enabled === "boolean" ? value.enabled : DEFAULT_MULTI_FLAVOR_CONFIG.enabled,
  pricing_strategy: value?.pricing_strategy === "average" ? "average" : DEFAULT_MULTI_FLAVOR_CONFIG.pricing_strategy,
  max_flavors: Math.max(2, Math.min(4, Number(value?.max_flavors || DEFAULT_MULTI_FLAVOR_CONFIG.max_flavors))),
});

export const calculateMultiFlavorUnitPrice = (
  flavors: Array<Pick<MultiFlavorSelectionFlavor, "price" | "final_price" | "portion">>,
  strategy: MultiFlavorPricingStrategy,
  useFinalPrice = true,
) => {
  if (flavors.length === 0) return 0;

  const priceFor = (flavor: Pick<MultiFlavorSelectionFlavor, "price" | "final_price">) =>
    useFinalPrice ? effectiveFlavorPrice(flavor) : Number(flavor.price);

  if (strategy === "average") {
    const portionTotal = flavors.reduce((sum, flavor) => sum + Math.max(Number(flavor.portion || 0), 0), 0);
    const fallbackPortion = 1 / flavors.length;
    const total = flavors.reduce((sum, flavor) => {
      const portion = portionTotal > 0 ? Number(flavor.portion || 0) / portionTotal : fallbackPortion;
      return sum + priceFor(flavor) * portion;
    }, 0);
    return roundCurrency(total);
  }

  return roundCurrency(Math.max(...flavors.map(priceFor)));
};

export const formatMultiFlavorNames = (flavors: Array<Pick<MultiFlavorSelectionFlavor, "name">>) =>
  flavors.map((flavor) => flavor.name).join(" / ");
