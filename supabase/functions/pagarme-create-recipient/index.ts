// Edge Function: pagarme-create-recipient
// Creates (or updates) a Pagar.me recipient ("recebedor") for a restaurant so PIX
// order revenue can be settled automatically via marketplace split.
//
// Actions:
//   - submit:      create/update the recipient + default bank account on Pagar.me.
//   - sync_status: refresh the local recipient status from Pagar.me.
//
// The restaurant never sends Pagar.me API keys; this function uses the platform
// PAGARME_SECRET_KEY (Supabase secret).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { pagarmeErrorMessage } from "../_shared/pagarme-errors.ts";
import { captureEdgeException } from "../_shared/observability.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PAGARME_API_URL = "https://api.pagar.me/core/v5";

type Action = "submit" | "sync_status";

interface BankAccountInput {
  bank_code: string;
  branch_number: string;
  branch_check_digit?: string;
  account_number: string;
  account_check_digit: string;
  account_type: "checking" | "savings";
}

interface RecipientInput {
  holder_name: string;
  holder_document: string;
  holder_document_type?: "cpf" | "cnpj";
  email: string;
  phone?: string;
  birthdate?: string;
  mother_name?: string;
  bank_account: BankAccountInput;
}

interface RequestBody {
  action?: Action;
  restaurant_id?: string;
  recipient?: RecipientInput;
}

type PagarmeBankAccount = {
  id?: string | null;
};

type PagarmeRecipient = {
  id?: string | null;
  status?: string | null;
  kyc_details?: { status?: string | null } | null;
  default_bank_account?: PagarmeBankAccount | null;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

const digits = (s?: string | null) => String(s || "").replace(/\D/g, "");

function authHeader() {
  const key = Deno.env.get("PAGARME_SECRET_KEY");
  if (!key) throw new Error("PAGARME_SECRET_KEY not configured");
  return `Basic ${btoa(key + ":")}`;
}

async function pagarme<T>(path: string, method: string, body?: unknown): Promise<T> {
  const res = await fetch(`${PAGARME_API_URL}${path}`, {
    method,
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
    },
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
    throw new Error(`Pagar.me ${method} ${path}: ${pagarmeErrorMessage(data, res.status)}`);
  }
  return data as T;
}

const VALID_RECIPIENT_STATUSES = new Set([
  "not_created",
  "registration",
  "affiliation",
  "active",
  "refused",
  "suspended",
  "blocked",
  "inactive",
  "unknown",
]);

function normalizeStatus(status?: string | null): string {
  const value = String(status || "").toLowerCase();
  return VALID_RECIPIENT_STATUSES.has(value) ? value : "unknown";
}

function validateRecipient(input: unknown): RecipientInput {
  if (!isRecord(input)) throw new Error("Dados do recebedor ausentes.");
  const bank = isRecord(input.bank_account) ? input.bank_account : null;

  const holderName = String(input.holder_name || "").trim();
  const holderDoc = digits(input.holder_document as string);
  const email = String(input.email || "").trim();

  if (!holderName) throw new Error("Nome do titular é obrigatório.");
  if (holderDoc.length !== 11 && holderDoc.length !== 14) {
    throw new Error("Documento do titular deve ser um CPF (11 dígitos) ou CNPJ (14 dígitos).");
  }
  if (!email || !email.includes("@")) throw new Error("E-mail válido é obrigatório.");
  if (!bank) throw new Error("Dados bancários são obrigatórios.");

  const bankCode = digits(bank.bank_code as string);
  const branch = digits(bank.branch_number as string);
  const account = digits(bank.account_number as string);
  const accountDigit = String(bank.account_check_digit || "").trim();
  const accountType = bank.account_type === "savings" ? "savings" : "checking";

  if (!bankCode) throw new Error("Código do banco é obrigatório.");
  if (!branch) throw new Error("Agência é obrigatória.");
  if (!account) throw new Error("Número da conta é obrigatório.");
  if (!accountDigit) throw new Error("Dígito da conta é obrigatório.");

  return {
    holder_name: holderName,
    holder_document: holderDoc,
    holder_document_type: holderDoc.length === 14 ? "cnpj" : "cpf",
    email,
    phone: input.phone ? digits(input.phone as string) : undefined,
    birthdate: input.birthdate ? String(input.birthdate).trim() : undefined,
    mother_name: input.mother_name ? String(input.mother_name).trim() : undefined,
    bank_account: {
      bank_code: bankCode,
      branch_number: branch,
      branch_check_digit: bank.branch_check_digit ? digits(bank.branch_check_digit as string) : undefined,
      account_number: account,
      account_check_digit: accountDigit,
      account_type: accountType,
    },
  };
}

function buildBankAccountPayload(input: RecipientInput) {
  return {
    holder_name: input.holder_name,
    holder_type: input.holder_document_type === "cnpj" ? "company" : "individual",
    holder_document: input.holder_document,
    bank: input.bank_account.bank_code,
    branch_number: input.bank_account.branch_number,
    ...(input.bank_account.branch_check_digit
      ? { branch_check_digit: input.bank_account.branch_check_digit }
      : {}),
    account_number: input.bank_account.account_number,
    account_check_digit: input.bank_account.account_check_digit,
    type: input.bank_account.account_type,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeaderValue = req.headers.get("Authorization") || "";
    if (!authHeaderValue.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

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

    const { data: profile } = await admin
      .from("users")
      .select("id, restaurant_id")
      .eq("id", userId)
      .maybeSingle();

    const { data: isSuperAdmin } = await admin.rpc("is_super_admin", { user_id: userId });

    // Resolve target restaurant. Super admins may target any restaurant by id.
    let restaurantId = profile?.restaurant_id || null;
    if (isSuperAdmin && body.restaurant_id) restaurantId = body.restaurant_id;

    let restaurantQuery = admin.from("restaurants").select("id, name, owner_id, email, phone");
    restaurantQuery = restaurantId
      ? restaurantQuery.eq("id", restaurantId)
      : restaurantQuery.eq("owner_id", userId);

    const { data: restaurant, error: restErr } = await restaurantQuery.maybeSingle();
    if (restErr || !restaurant) return json({ error: "Restaurant not found for user" }, 404);

    const isOwner = restaurant.owner_id === userId;
    if (!isOwner && !isSuperAdmin) {
      return json({ error: "Sem permissão para gerenciar o recebedor deste restaurante." }, 403);
    }

    const { data: existing } = await admin
      .from("restaurant_recipient_accounts")
      .select("*")
      .eq("restaurant_id", restaurant.id)
      .maybeSingle();

    // --- sync_status -------------------------------------------------------
    if (action === "sync_status") {
      const recipientId = existing?.recipient_id;
      if (!recipientId) return json({ error: "Recebedor ainda não foi criado." }, 400);

      const recipient = await pagarme<PagarmeRecipient>(`/recipients/${recipientId}`, "GET");
      const status = normalizeStatus(recipient.status);
      const kyc = recipient.kyc_details?.status ?? null;

      await admin
        .from("restaurant_recipient_accounts")
        .update({
          recipient_status: status,
          kyc_status: kyc,
          last_response: recipient as unknown as Record<string, unknown>,
          synced_at: new Date().toISOString(),
        })
        .eq("restaurant_id", restaurant.id);

      await admin
        .from("restaurant_payment_settings")
        .update({
          recipient_status: status,
          recipient_synced_at: new Date().toISOString(),
          ...(status === "active" ? { onboarding_status: "approved" } : {}),
        })
        .eq("restaurant_id", restaurant.id);

      return json({ recipient_id: recipientId, recipient_status: status, kyc_status: kyc });
    }

    // --- submit ------------------------------------------------------------
    const input = validateRecipient(body.recipient);
    const bankAccountPayload = buildBankAccountPayload(input);
    const phone = input.phone || digits(restaurant.phone);

    let recipient: PagarmeRecipient;
    if (existing?.recipient_id) {
      // Update the default bank account on the existing recipient.
      await pagarme<PagarmeRecipient>(
        `/recipients/${existing.recipient_id}/default-bank-account`,
        "PATCH",
        { bank_account: bankAccountPayload },
      );
      recipient = await pagarme<PagarmeRecipient>(`/recipients/${existing.recipient_id}`, "GET");
    } else {
      recipient = await pagarme<PagarmeRecipient>("/recipients", "POST", {
        name: input.holder_name,
        email: input.email,
        description: `Pubfy - ${restaurant.name}`,
        document: input.holder_document,
        type: input.holder_document_type === "cnpj" ? "corporation" : "individual",
        code: `pubfy_restaurant_${restaurant.id}`.slice(0, 52),
        default_bank_account: bankAccountPayload,
        transfer_settings: {
          transfer_enabled: true,
          transfer_interval: "Daily",
          transfer_day: 0,
        },
        ...(phone
          ? {
              register_information: {
                phone_numbers: [
                  {
                    ddd: phone.replace(/^55/, "").slice(0, 2),
                    number: phone.replace(/^55/, "").slice(2),
                    type: "mobile",
                  },
                ],
              },
            }
          : {}),
        metadata: { source: "pubfy_restaurant_onboarding", restaurant_id: restaurant.id },
      });
    }

    if (!recipient?.id) throw new Error("Pagar.me não retornou o id do recebedor.");

    const status = normalizeStatus(recipient.status);
    const kyc = recipient.kyc_details?.status ?? null;
    const bankAccountId = recipient.default_bank_account?.id ?? null;
    const nowIso = new Date().toISOString();

    const accountRow = {
      restaurant_id: restaurant.id,
      provider: "pagarme",
      holder_name: input.holder_name,
      holder_document: input.holder_document,
      holder_document_type: input.holder_document_type!,
      email: input.email,
      phone: input.phone ?? null,
      birthdate: input.birthdate ?? null,
      mother_name: input.mother_name ?? null,
      bank_code: input.bank_account.bank_code,
      branch_number: input.bank_account.branch_number,
      branch_check_digit: input.bank_account.branch_check_digit ?? null,
      account_number: input.bank_account.account_number,
      account_check_digit: input.bank_account.account_check_digit,
      account_type: input.bank_account.account_type,
      recipient_id: recipient.id,
      recipient_status: status,
      bank_account_id: bankAccountId,
      kyc_status: kyc,
      last_response: recipient as unknown as Record<string, unknown>,
      last_error: null,
      synced_at: nowIso,
    };

    const { error: upsertError } = await admin
      .from("restaurant_recipient_accounts")
      .upsert(accountRow, { onConflict: "restaurant_id" });
    if (upsertError) throw upsertError;

    // Mirror status + recipient_id into payment settings (no PII), keeping
    // onboarding pending until the recipient is fully active.
    const { data: settings } = await admin
      .from("restaurant_payment_settings")
      .select("restaurant_id, onboarding_status")
      .eq("restaurant_id", restaurant.id)
      .maybeSingle();

    const nextOnboarding = status === "active" ? "approved" : "pending";
    if (settings) {
      await admin
        .from("restaurant_payment_settings")
        .update({
          recipient_id: recipient.id,
          recipient_status: status,
          recipient_synced_at: nowIso,
          marketplace_mode: "split",
          onboarding_status: nextOnboarding,
        })
        .eq("restaurant_id", restaurant.id);
    } else {
      await admin.from("restaurant_payment_settings").insert({
        restaurant_id: restaurant.id,
        provider: "pagarme",
        marketplace_mode: "split",
        is_enabled: false,
        onboarding_status: nextOnboarding,
        recipient_id: recipient.id,
        recipient_status: status,
        recipient_synced_at: nowIso,
        enabled_methods: ["pix"],
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
    console.error("[pagarme-create-recipient]", message);
    await captureEdgeException(error, { functionName: "pagarme-create-recipient", req });
    return json({ error: message }, 400);
  }
});
