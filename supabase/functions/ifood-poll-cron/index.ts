import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.105.4";
import { captureEdgeException } from "../_shared/observability.ts";
import { pollIfoodEvents, type IfoodPollConfig } from "../_shared/ifood-poll-core.ts";
import { isDueForIfoodPoll } from "../_shared/ifood-poll-schedule.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(supabaseUrl, serviceRoleKey);

type IfoodRow = IfoodPollConfig & {
  last_polled_at: string | null;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function bearerToken(req: Request) {
  return (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
}

function authorizeCron(req: Request) {
  const expected = Deno.env.get("IFOOD_POLL_CRON_SECRET")
    || Deno.env.get("CRON_SECRET")
    || Deno.env.get("OWNER_SIGNUP_CLEANUP_SECRET");

  if (!expected) {
    return { ok: false as const, status: 500, error: "CRON_SECRET não configurado" };
  }

  const supplied = req.headers.get("x-cron-secret") || bearerToken(req);
  if (supplied !== expected) {
    return { ok: false as const, status: 401, error: "Não autorizado" };
  }

  return { ok: true as const, status: 200, error: null };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const auth = authorizeCron(req);
  if (!auth.ok) return json({ error: auth.error }, auth.status);

  const startedAt = new Date().toISOString();
  const results: Array<Record<string, unknown>> = [];

  try {
    const { data: rows, error } = await admin
      .from("ifood_integration")
      .select(
        "restaurant_id, client_id, client_secret, merchant_id, restaurant_ifood_id, is_enabled, polling_enabled, polling_interval, webhook_url, last_polled_at",
      )
      .eq("is_enabled", true)
      .eq("polling_enabled", true)
      .not("client_id", "is", null)
      .not("client_secret", "is", null)
      .not("merchant_id", "is", null);

    if (error) throw error;

    const configs = (rows ?? []) as IfoodRow[];
    let polled = 0;
    let skipped = 0;
    let failed = 0;

    for (const config of configs) {
      if (!isDueForIfoodPoll(config.last_polled_at, config.polling_interval)) {
        skipped++;
        results.push({
          restaurant_id: config.restaurant_id,
          skipped: true,
          reason: "interval_not_elapsed",
          polling_interval: config.polling_interval,
          last_polled_at: config.last_polled_at,
        });
        continue;
      }

      const polledAt = new Date().toISOString();

      try {
        const pollResult = await pollIfoodEvents(admin, config.restaurant_id, config);
        polled++;

        await admin
          .from("ifood_integration")
          .update({
            last_polled_at: polledAt,
            last_poll_error: null,
            updated_at: polledAt,
          })
          .eq("restaurant_id", config.restaurant_id);

        results.push({
          restaurant_id: config.restaurant_id,
          success: true,
          ...pollResult,
        });
      } catch (pollError) {
        failed++;
        const message = pollError instanceof Error ? pollError.message : String(pollError);

        await admin
          .from("ifood_integration")
          .update({
            last_polled_at: polledAt,
            last_poll_error: message.slice(0, 500),
            updated_at: polledAt,
          })
          .eq("restaurant_id", config.restaurant_id);

        results.push({
          restaurant_id: config.restaurant_id,
          success: false,
          error: message,
        });
      }
    }

    return json({
      success: true,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      restaurants_eligible: configs.length,
      polled,
      skipped_interval: skipped,
      failed,
      results,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[ifood-poll-cron]", message);
    await captureEdgeException(error, {
      functionName: "ifood-poll-cron",
      req,
    });
    return json({ success: false, error: message }, 500);
  }
});
