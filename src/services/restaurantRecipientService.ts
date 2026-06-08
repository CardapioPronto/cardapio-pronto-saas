import { FunctionsHttpError } from "@supabase/supabase-js";
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

export type RecipientAddressInput = {
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zip_code: string;
  reference_point?: string;
};

export type ManagingPartnerInput = {
  name: string;
  document: string;
  email?: string;
  birthdate: string;
  mother_name: string;
  monthly_income: number;
  professional_occupation: string;
  phone?: string;
  address: RecipientAddressInput;
  self_declared_legal_representative: boolean;
};

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
  monthly_income?: number;
  professional_occupation?: string;
  company_name?: string;
  trading_name?: string;
  annual_revenue?: number;
  address: RecipientAddressInput;
  managing_partners?: ManagingPartnerInput[];
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

export interface RecipientAccountDetails extends RecipientAccountSummary {
  holder_document: string | null;
  email: string | null;
  phone: string | null;
  birthdate: string | null;
  mother_name: string | null;
  monthly_income: number | null;
  professional_occupation: string | null;
  annual_revenue: number | null;
  company_name: string | null;
  trading_name: string | null;
  address: RecipientAddressInput | null;
  managing_partners: ManagingPartnerInput[];
  bank_account: RecipientBankAccountInput | null;
}

export interface RecipientSubmitResponse {
  recipient_id: string;
  recipient_status: RecipientStatus;
  kyc_status: string | null;
  onboarding_status?: string;
}

export class RecipientSubmitError extends Error {
  fieldErrors: string[];

  constructor(message: string, fieldErrors: string[] = []) {
    super(message);
    this.name = "RecipientSubmitError";
    this.fieldErrors = fieldErrors;
  }
}

type ErrorBody = {
  error?: string;
  message?: string;
  field_errors?: string[];
};

async function extractRecipientInvokeError(
  data: unknown,
  error: { message?: string; context?: Response } | null,
): Promise<RecipientSubmitError> {
  const pickBody = (body: unknown): RecipientSubmitError | null => {
    if (!body || typeof body !== "object") return null;
    const record = body as ErrorBody;
    const message = record.error || record.message;
    const fieldErrors = Array.isArray(record.field_errors)
      ? record.field_errors.filter((item): item is string => typeof item === "string")
      : [];
    if (message?.trim()) return new RecipientSubmitError(message.trim(), fieldErrors);
    return null;
  };

  const fromData = pickBody(data);
  if (fromData) return fromData;

  if (error instanceof FunctionsHttpError) {
    const body = await error.context.clone().json().catch(() => null);
    const parsed = pickBody(body);
    if (parsed) return parsed;
  }

  if (error?.context) {
    const body = await error.context.clone().json().catch(() => null);
    const parsed = pickBody(body);
    if (parsed) return parsed;
  }

  return new RecipientSubmitError(error?.message || "Falha ao enviar dados do recebedor");
}

function maskAccount(account?: string | null): string | null {
  if (!account) return null;
  const digits = account.replace(/\D/g, "");
  if (!digits) return null;
  return digits.slice(-4).padStart(Math.min(digits.length, 4), "•");
}

function parseManagingPartners(raw: unknown): ManagingPartnerInput[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .map(item => ({
      name: String(item.name || ""),
      document: String(item.document || ""),
      email: item.email ? String(item.email) : undefined,
      birthdate: String(item.birthdate || ""),
      mother_name: String(item.mother_name || ""),
      monthly_income: Number(item.monthly_income || 0),
      professional_occupation: String(item.professional_occupation || ""),
      phone: item.phone ? String(item.phone) : undefined,
      address: {
        street: String((item.address as RecipientAddressInput | undefined)?.street || ""),
        number: String((item.address as RecipientAddressInput | undefined)?.number || ""),
        complement: (item.address as RecipientAddressInput | undefined)?.complement,
        neighborhood: String((item.address as RecipientAddressInput | undefined)?.neighborhood || ""),
        city: String((item.address as RecipientAddressInput | undefined)?.city || ""),
        state: String((item.address as RecipientAddressInput | undefined)?.state || ""),
        zip_code: String((item.address as RecipientAddressInput | undefined)?.zip_code || ""),
        reference_point: (item.address as RecipientAddressInput | undefined)?.reference_point,
      },
      self_declared_legal_representative: item.self_declared_legal_representative !== false,
    }));
}

function mapRowToDetails(
  data: Record<string, unknown>,
  summary: RecipientAccountSummary,
): RecipientAccountDetails {
  const hasAddress = Boolean(data.addr_street);
  return {
    ...summary,
    holder_document: (data.holder_document as string) ?? null,
    email: (data.email as string) ?? null,
    phone: (data.phone as string) ?? null,
    birthdate: (data.birthdate as string) ?? null,
    mother_name: (data.mother_name as string) ?? null,
    monthly_income: data.monthly_income != null ? Number(data.monthly_income) : null,
    professional_occupation: (data.professional_occupation as string) ?? null,
    annual_revenue: data.annual_revenue != null ? Number(data.annual_revenue) : null,
    company_name: (data.company_name as string) ?? null,
    trading_name: (data.trading_name as string) ?? null,
    address: hasAddress
      ? {
          street: String(data.addr_street || ""),
          number: String(data.addr_number || ""),
          complement: data.addr_complement ? String(data.addr_complement) : undefined,
          neighborhood: String(data.addr_neighborhood || ""),
          city: String(data.addr_city || ""),
          state: String(data.addr_state || ""),
          zip_code: String(data.addr_zip_code || ""),
          reference_point: data.addr_reference_point ? String(data.addr_reference_point) : undefined,
        }
      : null,
    managing_partners: parseManagingPartners(data.managing_partners),
    bank_account: data.bank_code
      ? {
          bank_code: String(data.bank_code || ""),
          branch_number: String(data.branch_number || ""),
          branch_check_digit: data.branch_check_digit ? String(data.branch_check_digit) : undefined,
          account_number: String(data.account_number || ""),
          account_check_digit: String(data.account_check_digit || ""),
          account_type: (data.account_type as AccountType) || "checking",
        }
      : null,
  };
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

  async getAccountDetails(restaurantId: string): Promise<RecipientAccountDetails> {
    const summary = await this.getAccount(restaurantId);
    if (!summary.exists) {
      return {
        ...summary,
        holder_document: null,
        email: null,
        phone: null,
        birthdate: null,
        mother_name: null,
        monthly_income: null,
        professional_occupation: null,
        annual_revenue: null,
        company_name: null,
        trading_name: null,
        address: null,
        managing_partners: [],
        bank_account: null,
      };
    }

    const { data, error } = await supabase
      .from("restaurant_recipient_accounts")
      .select(
        [
          "holder_document",
          "email",
          "phone",
          "birthdate",
          "mother_name",
          "monthly_income",
          "professional_occupation",
          "annual_revenue",
          "company_name",
          "trading_name",
          "addr_street",
          "addr_number",
          "addr_complement",
          "addr_neighborhood",
          "addr_city",
          "addr_state",
          "addr_zip_code",
          "addr_reference_point",
          "managing_partners",
          "bank_code",
          "branch_number",
          "branch_check_digit",
          "account_number",
          "account_check_digit",
          "account_type",
        ].join(", "),
      )
      .eq("restaurant_id", restaurantId)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return {
        ...summary,
        holder_document: null,
        email: null,
        phone: null,
        birthdate: null,
        mother_name: null,
        monthly_income: null,
        professional_occupation: null,
        annual_revenue: null,
        company_name: null,
        trading_name: null,
        address: null,
        managing_partners: [],
        bank_account: null,
      };
    }

    return mapRowToDetails(data as Record<string, unknown>, summary);
  },

  async submit(input: RecipientSubmitInput, restaurantId?: string): Promise<RecipientSubmitResponse> {
    const { data, error } = await supabase.functions.invoke<RecipientSubmitResponse>(
      "pagarme-create-recipient",
      { body: { action: "submit", restaurant_id: restaurantId, recipient: input } },
    );
    if (error) throw await extractRecipientInvokeError(data, error);
    if (!data) throw new RecipientSubmitError("Resposta vazia do servidor");
    return data;
  },

  async syncStatus(restaurantId?: string): Promise<RecipientSubmitResponse> {
    const { data, error } = await supabase.functions.invoke<RecipientSubmitResponse>(
      "pagarme-create-recipient",
      { body: { action: "sync_status", restaurant_id: restaurantId } },
    );
    if (error) throw await extractRecipientInvokeError(data, error);
    if (!data) throw new RecipientSubmitError("Resposta vazia do servidor");
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
