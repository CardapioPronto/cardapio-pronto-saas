// Edge Function: pagarme-recipient-financials
// Returns the Pagar.me balance (saldo) and recent transfers (liquidações) for a
// restaurant's recipient, so the owner can track money settled to their account.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { pagarmeErrorMessage } from "../_shared/pagarme-errors.ts";
import { captureEdgeException } from "../_shared/observability.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PAGARME_API_URL = "https://api.pagar.me/core/v5";

type Body = {
  restaurant_id?: string;
};

type PagarmeBalance = {
  currency?: string | null;
  available_amount?: number | null;
  waiting_funds_amount?: number | null;
  transferred_amount?: number | null;
};

type PagarmeTransfer = {
  id?: string | null;
  amount?: number | null;
  status?: string | null;
  created_at?: string | null;
  funding_date?: string | null;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function authHeader() {
  const key = Deno.env.get("PAGARME_SECRET_KEY");
  if (!key) throw new Error("PAGARME_SECRET_KEY not configured");
  return `Basic ${btoa(key + ":")}`;
}

async function pagarme<T>(path: string): Promise<T> {
  const res = await fetch(`${PAGARME_API_URL}${path}`, {
    method: "GET",
    headers: { Authorization: authHeader(), "Content-Type": "application/json" },
  });
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    throw new Error(`Pagar.me GET ${path}: ${pagarmeErrorMessage(data, res.status)}`);
  }
  return data as T;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeaderValue = req.headers.get("Authorization") || "";
    if (!authHeaderValue.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const authClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeaderValue } } },
    );
    const token = authHeaderValue.replace("Bearer ", "");
    const { data: userData, error: userErr } = await authClient.auth.getUser(token);
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);
    const userId = userData.user.id;

    const body = (await req.json().catch(() => ({}))) as Body;

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: profile } = await admin
      .from("users")
      .select("id, restaurant_id")
      .eq("id", userId)
      .maybeSingle();
    const { data: isSuperAdmin } = await admin.rpc("is_super_admin", { user_id: userId });

    let restaurantId = profile?.restaurant_id || null;
    if (isSuperAdmin && body.restaurant_id) restaurantId = body.restaurant_id;

    let restaurantQuery = admin.from("restaurants").select("id, owner_id");
    restaurantQuery = restaurantId
      ? restaurantQuery.eq("id", restaurantId)
      : restaurantQuery.eq("owner_id", userId);
    const { data: restaurant, error: restErr } = await restaurantQuery.maybeSingle();
    if (restErr || !restaurant) return json({ error: "Restaurant not found for user" }, 404);

    if (restaurant.owner_id !== userId && !isSuperAdmin) {
      return json({ error: "Sem permissão para ver o financeiro deste restaurante." }, 403);
    }

    const { data: account } = await admin
      .from("restaurant_recipient_accounts")
      .select("recipient_id, recipient_status")
      .eq("restaurant_id", restaurant.id)
      .maybeSingle();

    const recipientId = account?.recipient_id;
    if (!recipientId) {
      return json({
        has_recipient: false,
        recipient_status: account?.recipient_status ?? "not_created",
        balance: null,
        transfers: [],
      });
    }

    const balance = await pagarme<PagarmeBalance>(`/recipients/${recipientId}/balance`);

    let transfers: PagarmeTransfer[] = [];
    try {
      const transfersResponse = await pagarme<{ data?: PagarmeTransfer[] }>(
        `/recipients/${recipientId}/transfers?size=10`,
      );
      transfers = Array.isArray(transfersResponse?.data) ? transfersResponse.data : [];
    } catch (transferError) {
      console.warn("[pagarme-recipient-financials] transfers fetch failed", transferError);
    }

    return json({
      has_recipient: true,
      recipient_status: account?.recipient_status ?? "unknown",
      balance: {
        currency: balance.currency ?? "BRL",
        available_amount: Number(balance.available_amount ?? 0),
        waiting_funds_amount: Number(balance.waiting_funds_amount ?? 0),
        transferred_amount: Number(balance.transferred_amount ?? 0),
      },
      transfers: transfers.map((t) => ({
        id: t.id ?? null,
        amount: Number(t.amount ?? 0),
        status: t.status ?? null,
        created_at: t.created_at ?? null,
        funding_date: t.funding_date ?? null,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[pagarme-recipient-financials]", message);
    await captureEdgeException(error, { functionName: "pagarme-recipient-financials", req });
    return json({ error: message }, 400);
  }
});
