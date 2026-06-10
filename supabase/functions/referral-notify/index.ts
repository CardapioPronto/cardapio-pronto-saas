import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { captureEdgeException } from "../_shared/observability.ts";
import {
  notifyMaturedReferralCommissions,
  sendReferralPayoutPaidEmail,
  type MatureEntry,
} from "../_shared/referral-notifications.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

type NotifyBody = {
  action?: string;
  payout_request_id?: string;
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ success: false, error: "Method not allowed" }, 405);

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return json({ success: false, error: "Não autenticado" }, 401);

    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authData.user) return json({ success: false, error: "Sessão inválida" }, 401);

    const body = (await req.json().catch(() => ({}))) as NotifyBody;
    const action = body.action ?? "mature_user";

    if (action === "mature_user") {
      const { data, error } = await supabase.rpc("mature_referral_commissions", {
        p_referrer_user_id: authData.user.id,
      });
      if (error) throw error;

      const result = (data ?? {}) as { entries?: MatureEntry[] };
      const entries = Array.isArray(result.entries) ? result.entries : [];
      await notifyMaturedReferralCommissions(supabase, entries);

      return json({ success: true, matured_count: entries.length });
    }

    if (action === "mature_all") {
      const { data: isAdmin } = await supabase.rpc("is_super_admin", {
        user_id: authData.user.id,
      });
      if (!isAdmin) return json({ success: false, error: "Sem permissão" }, 403);

      const { data, error } = await supabase.rpc("mature_referral_commissions", {
        p_referrer_user_id: null,
      });
      if (error) throw error;

      const result = (data ?? {}) as { entries?: MatureEntry[] };
      const entries = Array.isArray(result.entries) ? result.entries : [];
      await notifyMaturedReferralCommissions(supabase, entries);

      return json({ success: true, matured_count: entries.length });
    }

    if (action === "payout_paid") {
      const { data: isAdmin } = await supabase.rpc("is_super_admin", {
        user_id: authData.user.id,
      });
      if (!isAdmin) return json({ success: false, error: "Sem permissão" }, 403);

      const requestId = body.payout_request_id;
      if (!requestId) return json({ success: false, error: "payout_request_id obrigatório" }, 400);

      const { data: payout, error: payoutError } = await supabase
        .from("affiliate_payout_requests")
        .select("user_id, amount_cents, status")
        .eq("id", requestId)
        .maybeSingle();

      if (payoutError) throw payoutError;
      if (!payout || payout.status !== "paid") {
        return json({ success: false, error: "Saque não está pago" }, 400);
      }

      await sendReferralPayoutPaidEmail(supabase, {
        userId: payout.user_id,
        amountCents: Number(payout.amount_cents),
      });

      return json({ success: true });
    }

    return json({ success: false, error: "Ação inválida" }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("referral-notify error:", message);
    await captureEdgeException(error, { functionName: "referral-notify", req });
    return json({ success: false, error: message }, 500);
  }
});
