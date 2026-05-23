import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.105.4";

export type IfoodCredentials = {
  client_id: string;
  client_secret: string;
  merchant_id: string;
};

export type IfoodOrderDetails = {
  id?: string;
  orderType?: string;
  type?: string;
  status?: string;
};

export type IfoodStatusPushResult = {
  success: boolean;
  actions: string[];
  skipped?: string;
};

const IFOOD_ORDER_PREFIX = "/order/v1.0/orders";

export async function ifoodFetch(path: string, init: RequestInit = {}) {
  const response = await fetch(`https://merchant-api.ifood.com.br${path}`, init);
  const text = await response.text();
  let body: Record<string, unknown> | null = null;
  if (text) {
    try {
      body = JSON.parse(text) as Record<string, unknown>;
    } catch {
      throw new Error(`iFood ${response.status}: resposta inválida`);
    }
  }
  if (!response.ok) {
    const message = String(
      body?.message || body?.error_description || body?.error || response.statusText,
    );
    throw new Error(`iFood ${response.status}: ${message}`);
  }
  return body;
}

export async function getIfoodAccessToken(config: IfoodCredentials): Promise<string> {
  const body = new URLSearchParams({
    grantType: "client_credentials",
    clientId: config.client_id,
    clientSecret: config.client_secret,
  });

  const data = await ifoodFetch("/authentication/v1.0/oauth/token", {
    method: "POST",
    headers: {
      accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const token = data?.accessToken || data?.access_token;
  if (!token) throw new Error("Token do iFood não retornado");
  return String(token);
}

async function postIfoodOrderAction(
  token: string,
  ifoodOrderId: string,
  action: string,
  body?: Record<string, unknown>,
) {
  await ifoodFetch(`${IFOOD_ORDER_PREFIX}/${encodeURIComponent(ifoodOrderId)}/${action}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

/** Ignora 4xx de ação já aplicada (idempotência do marketplace). */
async function safePostIfoodOrderAction(
  token: string,
  ifoodOrderId: string,
  action: string,
  body?: Record<string, unknown>,
) {
  try {
    await postIfoodOrderAction(token, ifoodOrderId, action, body);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/iFood 4\d\d:/i.test(message)) return;
    throw error;
  }
}

export async function fetchIfoodOrderDetails(
  token: string,
  ifoodOrderId: string,
): Promise<IfoodOrderDetails> {
  const data = await ifoodFetch(`${IFOOD_ORDER_PREFIX}/${encodeURIComponent(ifoodOrderId)}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  return data as IfoodOrderDetails;
}

function isTakeoutLike(orderType: string) {
  const t = orderType.toUpperCase();
  return t === "TAKEOUT" || t === "DINE_IN" || t === "INDOOR";
}

/**
 * Envia status do Pubfy para o iFood (confirm → preparo → pronto → cancelado).
 * `finalizado` não exige chamada (iFood conclui após dispatch/readyToPickup).
 */
export async function pushPubfyStatusToIfood(
  config: IfoodCredentials,
  ifoodOrderId: string,
  pubfyStatus: string,
  orderTypeHint?: string | null,
): Promise<IfoodStatusPushResult> {
  const token = await getIfoodAccessToken(config);
  const details = await fetchIfoodOrderDetails(token, ifoodOrderId);
  const orderType = String(
    orderTypeHint || details.orderType || details.type || "DELIVERY",
  );

  const actions: string[] = [];

  switch (pubfyStatus) {
    case "preparo":
    case "em-andamento": {
      await safePostIfoodOrderAction(token, ifoodOrderId, "confirm");
      actions.push("confirm");
      await safePostIfoodOrderAction(token, ifoodOrderId, "startPreparation");
      actions.push("startPreparation");
      break;
    }
    case "pronto": {
      if (isTakeoutLike(orderType)) {
        await safePostIfoodOrderAction(token, ifoodOrderId, "readyToPickup");
        actions.push("readyToPickup");
      } else {
        await safePostIfoodOrderAction(token, ifoodOrderId, "dispatch", { deliveredBy: "MERCHANT" });
        actions.push("dispatch");
      }
      break;
    }
    case "cancelado": {
      await safePostIfoodOrderAction(token, ifoodOrderId, "requestCancellation", {
        reason: "503",
      });
      actions.push("requestCancellation");
      break;
    }
    case "finalizado":
      return { success: true, actions: [], skipped: "ifood_auto_conclude" };
    case "pendente":
      return { success: true, actions: [], skipped: "awaiting_staff_action" };
    default:
      return { success: true, actions: [], skipped: `unsupported_status:${pubfyStatus}` };
  }

  return { success: true, actions };
}

export async function loadIfoodCredentialsForRestaurant(
  admin: SupabaseClient,
  restaurantId: string,
): Promise<IfoodCredentials & { is_enabled: boolean }> {
  const { data, error } = await admin
    .from("ifood_integration")
    .select("client_id, client_secret, merchant_id, is_enabled")
    .eq("restaurant_id", restaurantId)
    .maybeSingle();

  if (error) throw error;
  if (!data?.client_id || !data?.client_secret || !data?.merchant_id) {
    throw new Error("Credenciais do iFood incompletas");
  }
  if (!data.is_enabled) {
    throw new Error("Integração com iFood está desativada");
  }

  return {
    client_id: data.client_id,
    client_secret: data.client_secret,
    merchant_id: data.merchant_id,
    is_enabled: true,
  };
}
