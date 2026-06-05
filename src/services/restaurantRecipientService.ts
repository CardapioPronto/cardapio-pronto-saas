import { supabase } from "@/integrations/supabase/client";

export type RecipientStatus =
  | "not_created"
  | "registration"
  | "affiliation"
  | "active"
  | "refused"
  | "suspended"
  | "blocked"
  | "inactive"
  | "unknown";

export type AccountType = "checking" | "savings";

export interface RecipientBankAccountInput {
  bank_code: string;
  branch_number: string;
  branch_check_digit?: string;
  account_number: string;
  account_check_digit: string;
  account_type: AccountType;
}

export interface RecipientSubmitInput {
  holder_name: string;
  holder_document: string;
  email: string;
  phone?: string;
  birthdate?: string;
  mother_name?: string;
  bank_account: RecipientBankAccountInput;
}

export interface RecipientAccountSummary {
  exists: boolean;
  recipient_id: string | null;
  recipient_status: RecipientStatus;
  kyc_status: string | null;
  holder_name: string | null;
  holder_document_type: string | null;
  bank_code: string | null;
  account_last_digits: string | null;
  account_type: AccountType | null;
  synced_at: string | null;
}

export interface RecipientSubmitResponse {
  recipient_id: string;
  recipient_status: RecipientStatus;
  kyc_status: string | null;
  onboarding_status?: string;
}

function maskAccount(account?: string | null): string | null {
  if (!account) return null;
  const digits = account.replace(/\D/g, "");
  if (!digits) return null;
  return digits.slice(-4).padStart(Math.min(digits.length, 4), "•");
}

export const restaurantRecipientService = {
  async getAccount(restaurantId: string): Promise<RecipientAccountSummary> {
    const { data, error } = await supabase
      .from("restaurant_recipient_accounts")
      .select(
        "recipient_id, recipient_status, kyc_status, holder_name, holder_document_type, bank_code, account_number, account_type, synced_at",
      )
      .eq("restaurant_id", restaurantId)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return {
        exists: false,
        recipient_id: null,
        recipient_status: "not_created",
        kyc_status: null,
        holder_name: null,
        holder_document_type: null,
        bank_code: null,
        account_last_digits: null,
        account_type: null,
        synced_at: null,
      };
    }

    return {
      exists: true,
      recipient_id: data.recipient_id ?? null,
      recipient_status: (data.recipient_status as RecipientStatus) ?? "unknown",
      kyc_status: data.kyc_status ?? null,
      holder_name: data.holder_name ?? null,
      holder_document_type: data.holder_document_type ?? null,
      bank_code: data.bank_code ?? null,
      account_last_digits: maskAccount(data.account_number),
      account_type: (data.account_type as AccountType) ?? null,
      synced_at: data.synced_at ?? null,
    };
  },

  async submit(input: RecipientSubmitInput, restaurantId?: string): Promise<RecipientSubmitResponse> {
    const { data, error } = await supabase.functions.invoke<RecipientSubmitResponse>(
      "pagarme-create-recipient",
      { body: { action: "submit", restaurant_id: restaurantId, recipient: input } },
    );
    if (error) throw new Error(error.message || "Falha ao enviar dados do recebedor");
    if (!data) throw new Error("Resposta vazia do servidor");
    return data;
  },

  async syncStatus(restaurantId?: string): Promise<RecipientSubmitResponse> {
    const { data, error } = await supabase.functions.invoke<RecipientSubmitResponse>(
      "pagarme-create-recipient",
      { body: { action: "sync_status", restaurant_id: restaurantId } },
    );
    if (error) throw new Error(error.message || "Falha ao sincronizar status do recebedor");
    if (!data) throw new Error("Resposta vazia do servidor");
    return data;
  },
};

export const RECIPIENT_STATUS_LABEL: Record<RecipientStatus, string> = {
  not_created: "Não criado",
  registration: "Em cadastro",
  affiliation: "Em afiliação",
  active: "Ativo",
  refused: "Recusado",
  suspended: "Suspenso",
  blocked: "Bloqueado",
  inactive: "Inativo",
  unknown: "Desconhecido",
};
