// Edge Function: pagarme-create-recipient
// Creates (or updates) a Pagar.me recipient with full register_information (KYC PF/PJ).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { pagarmeErrorMessage, pagarmeFieldErrors } from "../_shared/pagarme-errors.ts";
import { captureEdgeException } from "../_shared/observability.ts";
import {
  buildBankAccountPayload,
  buildCreateRecipientPayload,
  buildUpdateRecipientPayload,
} from "../_shared/pagarme-recipient-register.ts";
import { validateRecipientKyc } from "../_shared/pagarme-recipient-validate.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PAGARME_API_URL = "https://api.pagar.me/core/v5";

type Action = "submit" | "sync_status";

interface RequestBody {
  action?: Action;
  restaurant_id?: string;
  recipient?: unknown;
}

type PagarmeBankAccount = { id?: string | null };

type PagarmeRecipient = {
  id?: string | null;
  status?: string | null;
  kyc_details?: { status?: string | null } | null;
  default_bank_account?: PagarmeBankAccount | null;
};

class PagarmeApiError extends Error {
  fieldErrors: string[];
  constructor(message: string, fieldErrors: string[]) {
    super(message);
    this.name = "PagarmeApiError";
    this.fieldErrors = fieldErrors;
  }
}

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

async function pagarme<T>(path: string, method: string, body?: unknown): Promise<T> {
  const res = await fetch(`${PAGARME_API_URL}${path}`, {
    method,
    headers: { Authorization: authHeader(), "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const msg = `Pagar.me ${method} ${path}: ${pagarmeErrorMessage(data, res.status)}`;
    throw new PagarmeApiError(msg, pagarmeFieldErrors(data));
  }
  return data as T;
}

const VALID_RECIPIENT_STATUSES = new Set([
  "not_created", "registration", "affiliation", "active",
  "refused", "suspended", "blocked", "inactive", "unknown",
]);

function normalizeStatus(status?: string | null): string {
  const value = String(status || "").toLowerCase();
  return VALID_RECIPIENT_STATUSES.has(value) ? value : "unknown";
}

function accountRowFromInput(
  restaurantId: string,
  input: ReturnType<typeof validateRecipientKyc>,
  recipient: PagarmeRecipient,
  nowIso: string,
) {
  const status = normalizeStatus(recipient.status);
  return {
    restaurant_id: restaurantId,
    provider: "pagarme",
    holder_name: input.holder_name,
    holder_document: input.holder_document,
    holder_document_type: input.holder_document_type,
    email: input.email,
    phone: input.phone ?? null,
    birthdate: input.birthdate ?? null,
    mother_name: input.mother_name ?? null,
    professional_occupation: input.professional_occupation ?? null,
    monthly_income: input.monthly_income ?? null,
    annual_revenue: input.annual_revenue ?? null,
    company_name: input.company_name ?? null,
    trading_name: input.trading_name ?? null,
    addr_street: input.address.street,
    addr_number: input.address.number,
    addr_complement: input.address.complement ?? null,
    addr_neighborhood: input.address.neighborhood,
    addr_city: input.address.city,
    addr_state: input.address.state,
    addr_zip_code: input.address.zip_code,
    addr_reference_point: input.address.reference_point ?? null,
    managing_partners: input.managing_partners ?? [],
    bank_code: input.bank_account.bank_code,
    branch_number: input.bank_account.branch_number,
    branch_check_digit: input.bank_account.branch_check_digit ?? null,
    account_number: input.bank_account.account_number,
    account_check_digit: input.bank_account.account_check_digit,
    account_type: input.bank_account.account_type,
    recipient_id: recipient.id,
    recipient_status: status,
    bank_account_id: recipient.default_bank_account?.id ?? null,
    kyc_status: recipient.kyc_details?.status ?? null,
    last_response: recipient as unknown as Record<string, unknown>,
    last_error: null,
    synced_at: nowIso,
  };
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

    const body = (await req.json()) as RequestBody;
    const action: Action = body.action === "sync_status" ? "sync_status" : "submit";

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: profile } = await admin.from("users").select("id, restaurant_id").eq("id", userId).maybeSingle();
    const { data: isSuperAdmin } = await admin.rpc("is_super_admin", { user_id: userId });

    let restaurantId = profile?.restaurant_id || null;
    if (isSuperAdmin && body.restaurant_id) restaurantId = body.restaurant_id;

    let restaurantQuery = admin.from("restaurants").select("id, name, owner_id, email, phone");
    restaurantQuery = restaurantId
      ? restaurantQuery.eq("id", restaurantId)
      : restaurantQuery.eq("owner_id", userId);

    const { data: restaurant, error: restErr } = await restaurantQuery.maybeSingle();
    if (restErr || !restaurant) return json({ error: "Restaurant not found for user" }, 404);

    if (restaurant.owner_id !== userId && !isSuperAdmin) {
      return json({ error: "Sem permissão para gerenciar o recebedor deste restaurante." }, 403);
    }

    const { data: existing } = await admin
      .from("restaurant_recipient_accounts")
      .select("*")
      .eq("restaurant_id", restaurant.id)
      .maybeSingle();

    if (action === "sync_status") {
      const recipientId = existing?.recipient_id;
      if (!recipientId) return json({ error: "Recebedor ainda não foi criado." }, 400);

      const recipient = await pagarme<PagarmeRecipient>(`/recipients/${recipientId}`, "GET");
      const status = normalizeStatus(recipient.status);
      const kyc = recipient.kyc_details?.status ?? null;

      await admin.from("restaurant_recipient_accounts").update({
        recipient_status: status,
        kyc_status: kyc,
        last_response: recipient as unknown as Record<string, unknown>,
        synced_at: new Date().toISOString(),
      }).eq("restaurant_id", restaurant.id);

      await admin.from("restaurant_payment_settings").update({
        recipient_status: status,
        recipient_synced_at: new Date().toISOString(),
        ...(status === "active" ? { onboarding_status: "approved" } : {}),
      }).eq("restaurant_id", restaurant.id);

      return json({ recipient_id: recipientId, recipient_status: status, kyc_status: kyc });
    }

    const input = validateRecipientKyc(body.recipient);
    if (!input.phone && restaurant.phone) {
      input.phone = String(restaurant.phone).replace(/\D/g, "");
    }

    const metadata = { source: "pubfy_restaurant_onboarding", restaurant_id: restaurant.id };
    const code = `pubfy_restaurant_${restaurant.id}`;
    let recipient: PagarmeRecipient;

    if (existing?.recipient_id) {
      await pagarme<PagarmeRecipient>(
        `/recipients/${existing.recipient_id}`,
        "PUT",
        buildUpdateRecipientPayload(input),
      );
      await pagarme<PagarmeRecipient>(
        `/recipients/${existing.recipient_id}/default-bank-account`,
        "PATCH",
        { bank_account: buildBankAccountPayload(input) },
      );
      recipient = await pagarme<PagarmeRecipient>(`/recipients/${existing.recipient_id}`, "GET");
    } else {
      recipient = await pagarme<PagarmeRecipient>(
        "/recipients",
        "POST",
        buildCreateRecipientPayload(
          input,
          code,
          `Pubfy - ${restaurant.name}`,
          metadata,
        ),
      );
    }

    if (!recipient?.id) throw new Error("Pagar.me não retornou o id do recebedor.");

    const status = normalizeStatus(recipient.status);
    const kyc = recipient.kyc_details?.status ?? null;
    const nowIso = new Date().toISOString();
    const accountRow = accountRowFromInput(restaurant.id, input, recipient, nowIso);

    const { error: upsertError } = await admin
      .from("restaurant_recipient_accounts")
      .upsert(accountRow, { onConflict: "restaurant_id" });
    if (upsertError) throw upsertError;

    const nextOnboarding = status === "active" ? "approved" : "pending";
    const { data: settings } = await admin
      .from("restaurant_payment_settings")
      .select("restaurant_id")
      .eq("restaurant_id", restaurant.id)
      .maybeSingle();

    const settingsPatch = {
      recipient_id: recipient.id,
      recipient_status: status,
      recipient_synced_at: nowIso,
      marketplace_mode: "split" as const,
      onboarding_status: nextOnboarding,
    };

    if (settings) {
      await admin.from("restaurant_payment_settings").update(settingsPatch).eq("restaurant_id", restaurant.id);
    } else {
      await admin.from("restaurant_payment_settings").insert({
        restaurant_id: restaurant.id,
        provider: "pagarme",
        is_enabled: false,
        enabled_methods: ["pix"],
        ...settingsPatch,
      });
    }

    return json({
      recipient_id: recipient.id,
      recipient_status: status,
      kyc_status: kyc,
      onboarding_status: nextOnboarding,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const fieldErrors = error instanceof PagarmeApiError ? error.fieldErrors : [];
    console.error("[pagarme-create-recipient]", message);
    await captureEdgeException(error, { functionName: "pagarme-create-recipient", req });
    return json({ error: message, field_errors: fieldErrors }, 400);
  }
});
