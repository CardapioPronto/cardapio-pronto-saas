import { useCallback, useEffect, useState } from "react";
import { endOfDay, startOfDay } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentRestaurantId } from "@/lib/supabase";
import { assertMaxReportRange } from "@/lib/reportLimits";

export type FinancialChannel = {
  code: string;
  name: string;
  orders: number;
  revenue: number;
  averageTicket: number;
  estimatedFees: number;
  estimatedNetRevenue: number;
  revenueShare: number;
};

export type FinancialProductMargin = {
  id: string;
  name: string;
  quantity: number;
  orders: number;
  revenue: number;
  estimatedCost: number;
  estimatedGrossMargin: number;
  estimatedGrossMarginPercent: number;
};

export type FinancialDashboardData = {
  settings: {
    ifoodFeePercent: number;
    gatewayFeePercent: number;
  };
  summary: {
    totalRevenue: number;
    totalOrders: number;
    averageTicket: number;
    estimatedFees: number;
    estimatedNetRevenue: number;
    ownChannelRevenue: number;
    ifoodRevenue: number;
    ownChannelShare: number;
    estimatedOwnChannelSavings: number;
    marginCoveredRevenue: number;
    estimatedProductCost: number;
    estimatedGrossMargin: number;
    estimatedGrossMarginPercent: number;
    costCoveragePercent: number;
  };
  channels: FinancialChannel[];
  products: FinancialProductMargin[];
};

type FinancialDashboardParams = {
  dateFrom: Date;
  dateTo: Date;
};

const EMPTY_DATA: FinancialDashboardData = {
  settings: {
    ifoodFeePercent: 0,
    gatewayFeePercent: 0,
  },
  summary: {
    totalRevenue: 0,
    totalOrders: 0,
    averageTicket: 0,
    estimatedFees: 0,
    estimatedNetRevenue: 0,
    ownChannelRevenue: 0,
    ifoodRevenue: 0,
    ownChannelShare: 0,
    estimatedOwnChannelSavings: 0,
    marginCoveredRevenue: 0,
    estimatedProductCost: 0,
    estimatedGrossMargin: 0,
    estimatedGrossMarginPercent: 0,
    costCoveragePercent: 0,
  },
  channels: [],
  products: [],
};

const asNumber = (value: unknown) => Number(value ?? 0);

const normalizeData = (value: unknown): FinancialDashboardData => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return EMPTY_DATA;

  const raw = value as Record<string, unknown>;
  const settings = (raw.settings ?? {}) as Record<string, unknown>;
  const summary = (raw.summary ?? {}) as Record<string, unknown>;
  const channels = Array.isArray(raw.channels) ? raw.channels : [];
  const products = Array.isArray(raw.products) ? raw.products : [];

  return {
    settings: {
      ifoodFeePercent: asNumber(settings.ifoodFeePercent),
      gatewayFeePercent: asNumber(settings.gatewayFeePercent),
    },
    summary: {
      totalRevenue: asNumber(summary.totalRevenue),
      totalOrders: asNumber(summary.totalOrders),
      averageTicket: asNumber(summary.averageTicket),
      estimatedFees: asNumber(summary.estimatedFees),
      estimatedNetRevenue: asNumber(summary.estimatedNetRevenue),
      ownChannelRevenue: asNumber(summary.ownChannelRevenue),
      ifoodRevenue: asNumber(summary.ifoodRevenue),
      ownChannelShare: asNumber(summary.ownChannelShare),
      estimatedOwnChannelSavings: asNumber(summary.estimatedOwnChannelSavings),
      marginCoveredRevenue: asNumber(summary.marginCoveredRevenue),
      estimatedProductCost: asNumber(summary.estimatedProductCost),
      estimatedGrossMargin: asNumber(summary.estimatedGrossMargin),
      estimatedGrossMarginPercent: asNumber(summary.estimatedGrossMarginPercent),
      costCoveragePercent: asNumber(summary.costCoveragePercent),
    },
    channels: channels.map((channel) => {
      const row = channel as Record<string, unknown>;
      return {
        code: String(row.code ?? ""),
        name: String(row.name ?? ""),
        orders: asNumber(row.orders),
        revenue: asNumber(row.revenue),
        averageTicket: asNumber(row.averageTicket),
        estimatedFees: asNumber(row.estimatedFees),
        estimatedNetRevenue: asNumber(row.estimatedNetRevenue),
        revenueShare: asNumber(row.revenueShare),
      };
    }),
    products: products.map((product) => {
      const row = product as Record<string, unknown>;
      return {
        id: String(row.id ?? ""),
        name: String(row.name ?? ""),
        quantity: asNumber(row.quantity),
        orders: asNumber(row.orders),
        revenue: asNumber(row.revenue),
        estimatedCost: asNumber(row.estimatedCost),
        estimatedGrossMargin: asNumber(row.estimatedGrossMargin),
        estimatedGrossMarginPercent: asNumber(row.estimatedGrossMarginPercent),
      };
    }),
  };
};

export const useFinancialDashboard = ({ dateFrom, dateTo }: FinancialDashboardParams) => {
  const [data, setData] = useState<FinancialDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const restaurantId = await getCurrentRestaurantId();
      if (!restaurantId) throw new Error("Restaurante não encontrado.");

      const from = startOfDay(dateFrom);
      const to = endOfDay(dateTo);
      if (from > to) throw new Error("A data inicial não pode ser maior que a data final.");
      assertMaxReportRange(from, to);

      const { data: raw, error: rpcError } = await supabase.rpc("get_restaurant_financial_dashboard", {
        p_restaurant_id: restaurantId,
        p_from: from.toISOString(),
        p_to: to.toISOString(),
      });

      if (rpcError) throw rpcError;
      setData(normalizeData(raw));
    } catch (err) {
      console.error("Erro ao carregar dashboard financeiro:", err);
      setError(err instanceof Error ? err.message : "Erro ao carregar dashboard financeiro.");
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  const saveSettings = useCallback(async (settings: FinancialDashboardData["settings"]) => {
    setSaving(true);
    setError(null);

    try {
      const restaurantId = await getCurrentRestaurantId();
      if (!restaurantId) throw new Error("Restaurante não encontrado.");

      const { error: saveError } = await supabase
        .from("restaurant_financial_settings")
        .upsert({
          restaurant_id: restaurantId,
          ifood_fee_percent: settings.ifoodFeePercent,
          gateway_fee_percent: settings.gatewayFeePercent,
        }, { onConflict: "restaurant_id" });

      if (saveError) throw saveError;
      await refetch();
    } catch (err) {
      console.error("Erro ao salvar configurações financeiras:", err);
      const message = err instanceof Error ? err.message : "Erro ao salvar configurações financeiras.";
      setError(message);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [refetch]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return {
    data,
    loading,
    saving,
    error,
    refetch,
    saveSettings,
  };
};
