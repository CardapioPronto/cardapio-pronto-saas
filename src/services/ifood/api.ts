import { supabase } from "@/integrations/supabase/client";
import { IfoodConnectionTestResult, IfoodPollResult } from "./types";

type IfoodFunctionAction = "get_config" | "save_config" | "toggle" | "update_polling" | "test" | "poll";

export interface IfoodIntegrationConfigResponse {
  success: boolean;
  config: {
    clientId: string;
    merchantId: string;
    restaurantIfoodId: string;
    isEnabled: boolean;
    pollingEnabled: boolean;
    pollingInterval: number;
    webhookUrl: string | null;
    hasStoredCredentials: boolean;
  };
}

export interface SaveIfoodIntegrationConfigParams {
  restaurantId?: string;
  clientId: string;
  clientSecret?: string;
  merchantId: string;
  restaurantIfoodId?: string;
  isEnabled: boolean;
  pollingEnabled: boolean;
  pollingInterval: number;
}

const invokeIfoodFunction = async <T>(
  action: IfoodFunctionAction,
  body: Record<string, unknown> = {},
): Promise<T> => {
  const { data, error } = await supabase.functions.invoke("ifood-integration", {
    body: { action, ...body },
  });

  if (error) {
    throw new Error(error.message || "Falha ao chamar integração iFood");
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data as T;
};

export const getIfoodIntegrationConfig = async (
  restaurantId?: string,
): Promise<IfoodIntegrationConfigResponse> => {
  return invokeIfoodFunction<IfoodIntegrationConfigResponse>("get_config", { restaurantId });
};

export const saveIfoodIntegrationConfig = async (
  params: SaveIfoodIntegrationConfigParams,
): Promise<IfoodIntegrationConfigResponse> => {
  return invokeIfoodFunction<IfoodIntegrationConfigResponse>("save_config", params as unknown as Record<string, unknown>);
};

export const setIfoodIntegrationStatus = async (
  restaurantId: string | undefined,
  enabled: boolean,
): Promise<IfoodIntegrationConfigResponse> => {
  return invokeIfoodFunction<IfoodIntegrationConfigResponse>("toggle", { restaurantId, enabled });
};

export const updateIfoodPollingSettings = async (
  restaurantId: string | undefined,
  pollingEnabled: boolean,
  pollingInterval?: number,
): Promise<IfoodIntegrationConfigResponse> => {
  return invokeIfoodFunction<IfoodIntegrationConfigResponse>("update_polling", {
    restaurantId,
    pollingEnabled,
    pollingInterval,
  });
};

export const testIfoodConnection = async (
  restaurantId?: string,
): Promise<IfoodConnectionTestResult> => {
  return invokeIfoodFunction<IfoodConnectionTestResult>("test", { restaurantId });
};

export const pollIfoodEvents = async (
  restaurantId?: string,
): Promise<IfoodPollResult> => {
  return invokeIfoodFunction<IfoodPollResult>("poll", { restaurantId });
};

export const getIfoodPendingOrders = async () => {
  throw new Error(
    "A busca direta de pedidos iFood foi removida. Use pollIfoodEvents pela Edge Function.",
  );
};

export const getIfoodOrderDetails = async () => {
  throw new Error(
    "A consulta direta de pedidos iFood foi removida. Use a Edge Function ifood-integration.",
  );
};

export type IfoodOrderStatusPushResult = {
  success: boolean;
  skipped?: boolean;
  reason?: string;
  ifood_order_id?: string;
  pubfy_status?: string;
  actions?: string[];
};

export const updateIfoodOrderStatus = async (
  orderId: string,
  pubfyStatus: string,
  restaurantId?: string,
): Promise<IfoodOrderStatusPushResult> => {
  return invokeIfoodFunction<IfoodOrderStatusPushResult>("update_order_status", {
    orderId,
    pubfyStatus,
    restaurantId,
  });
};

export const processIfoodWebhookEvent = async () => undefined;
