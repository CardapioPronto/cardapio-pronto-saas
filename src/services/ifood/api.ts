import { supabase } from "@/integrations/supabase/client";
import { IfoodConnectionTestResult, IfoodPollResult } from "./types";

type IfoodFunctionAction = "test" | "poll";

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

export const updateIfoodOrderStatus = async () => {
  throw new Error(
    "A atualização direta de status iFood ainda precisa ser implementada via Edge Function.",
  );
};

export const processIfoodWebhookEvent = async () => undefined;
