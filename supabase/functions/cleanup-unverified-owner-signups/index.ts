import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cleanup-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DEFAULT_VERIFICATION_TTL_HOURS = 24;

type SupabaseAdmin = ReturnType<typeof createClient>;

type AuthUser = {
  id: string;
  created_at?: string;
  confirmed_at?: string | null;
  email_confirmed_at?: string | null;
  user_metadata?: Record<string, unknown>;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function cleanText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

function bearerToken(req: Request) {
  return (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
}

function authorize(req: Request) {
  const expectedSecret = Deno.env.get("OWNER_SIGNUP_CLEANUP_SECRET")
    || Deno.env.get("CRON_SECRET");

  if (!expectedSecret) {
    return {
      ok: false,
      status: 500,
      error: "OWNER_SIGNUP_CLEANUP_SECRET não configurado",
    };
  }

  const suppliedSecret = req.headers.get("x-cleanup-secret") || bearerToken(req);
  if (suppliedSecret !== expectedSecret) {
    return {
      ok: false,
      status: 401,
      error: "Não autorizado",
    };
  }

  return { ok: true, status: 200, error: null };
}

function isConfirmed(user: AuthUser) {
  return Boolean(user.email_confirmed_at || user.confirmed_at);
}

function verificationDeadline(user: AuthUser, metadata: Record<string, unknown>) {
  const explicitDeadline = cleanText(metadata.verification_expires_at, 80);
  if (explicitDeadline) return Date.parse(explicitDeadline);

  const createdAt = user.created_at ? Date.parse(user.created_at) : Date.now();
  return createdAt + DEFAULT_VERIFICATION_TTL_HOURS * 60 * 60 * 1000;
}

function shouldDelete(user: AuthUser) {
  const metadata = user.user_metadata ?? {};
  if (metadata.signup_intent !== "owner_signup") return false;
  if (isConfirmed(user)) return false;

  const deadline = verificationDeadline(user, metadata);
  return !Number.isFinite(deadline) || Date.now() > deadline;
}

async function cleanupOwnerSignup(supabase: SupabaseAdmin, userId: string) {
  const { data: restaurants, error: restaurantSelectError } = await supabase
    .from("restaurants")
    .select("id")
    .eq("owner_id", userId);

  if (restaurantSelectError) throw restaurantSelectError;

  const restaurantIds = (restaurants ?? [])
    .map((restaurant: { id?: string }) => restaurant.id)
    .filter(Boolean) as string[];

  if (restaurantIds.length > 0) {
    const { error: subscriptionDeleteError } = await supabase
      .from("subscriptions")
      .delete()
      .in("restaurant_id", restaurantIds);
    if (subscriptionDeleteError) throw subscriptionDeleteError;

    const { error: restaurantDeleteError } = await supabase
      .from("restaurants")
      .delete()
      .in("id", restaurantIds);
    if (restaurantDeleteError) throw restaurantDeleteError;
  }

  const { error: profileDeleteError } = await supabase
    .from("users")
    .delete()
    .eq("id", userId);
  if (profileDeleteError) throw profileDeleteError;

  const { error: authDeleteError } = await supabase.auth.admin.deleteUser(userId);
  if (authDeleteError) throw authDeleteError;
}

async function listAllUsers(supabase: SupabaseAdmin) {
  const users: AuthUser[] = [];
  const perPage = 1000;
  let page = 1;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const currentPage = (data.users ?? []) as AuthUser[];
    users.push(...currentPage);

    if (currentPage.length < perPage) break;
    page += 1;
  }

  return users;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ success: false, error: "Method not allowed" }, 405);

  const authorization = authorize(req);
  if (!authorization.ok) {
    return json({ success: false, error: authorization.error }, authorization.status);
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const users = await listAllUsers(supabase);
    const expiredUsers = users.filter(shouldDelete);
    const deletedUserIds: string[] = [];
    const failedUserIds: Array<{ id: string; error: string }> = [];

    for (const user of expiredUsers) {
      try {
        await cleanupOwnerSignup(supabase, user.id);
        deletedUserIds.push(user.id);
      } catch (error) {
        failedUserIds.push({
          id: user.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return json({
      success: failedUserIds.length === 0,
      scanned: users.length,
      expired: expiredUsers.length,
      deleted: deletedUserIds.length,
      deleted_user_ids: deletedUserIds,
      failed_user_ids: failedUserIds,
    }, failedUserIds.length === 0 ? 200 : 207);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("cleanup-unverified-owner-signups error:", message);
    return json({ success: false, error: "Erro ao limpar cadastros expirados" }, 500);
  }
});
