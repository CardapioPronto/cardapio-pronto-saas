/**
 * Builds Pagar.me Core v5 `register_information` for marketplace recipients.
 * @see https://docs.pagar.me/reference/criar-recebedor-1
 */

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
  self_declared_legal_representative?: boolean;
};

export type RecipientKycInput = {
  holder_name: string;
  holder_document: string;
  holder_document_type: "cpf" | "cnpj";
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
  bank_account: {
    bank_code: string;
    branch_number: string;
    branch_check_digit?: string;
    account_number: string;
    account_check_digit: string;
    account_type: "checking" | "savings";
  };
};

const digits = (s?: string | null) => String(s || "").replace(/\D/g, "");

export function incomeToCents(reais: number): number {
  const value = Number(reais || 0);
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.round(value * 100);
}

function normalizeState(state: string): string {
  return String(state || "").trim().toUpperCase().slice(0, 2);
}

function buildPagarmeAddress(addr: RecipientAddressInput) {
  return {
    street: addr.street.trim(),
    street_number: addr.number.trim(),
    complementary: addr.complement?.trim() || "SN",
    neighborhood: addr.neighborhood.trim(),
    city: addr.city.trim(),
    state: normalizeState(addr.state),
    zip_code: digits(addr.zip_code),
    reference_point: addr.reference_point?.trim() || "Nao informado",
  };
}

function buildPhoneNumbers(phone?: string) {
  const raw = digits(phone);
  if (raw.length < 10) return undefined;
  const withoutCountry = raw.startsWith("55") && raw.length > 11 ? raw.slice(2) : raw;
  const ddd = withoutCountry.slice(0, 2);
  const number = withoutCountry.slice(2);
  if (ddd.length !== 2 || number.length < 8) return undefined;
  return [{ ddd, number, type: "mobile" as const }];
}

function buildPartnerRegister(partner: ManagingPartnerInput) {
  const doc = digits(partner.document);
  return {
    name: partner.name.trim(),
    email: partner.email?.trim() || undefined,
    document: doc,
    type: "individual",
    mother_name: partner.mother_name.trim(),
    birthdate: partner.birthdate,
    monthly_income: incomeToCents(partner.monthly_income),
    professional_occupation: partner.professional_occupation.trim(),
    self_declared_legal_representative: partner.self_declared_legal_representative ?? true,
    address: buildPagarmeAddress(partner.address),
    phone_numbers: buildPhoneNumbers(partner.phone),
  };
}

export function buildBankAccountPayload(input: RecipientKycInput) {
  const holderType = input.holder_document_type === "cnpj" ? "company" : "individual";
  return {
    holder_name: input.holder_name.trim(),
    holder_type: holderType,
    holder_document: digits(input.holder_document),
    bank: digits(input.bank_account.bank_code),
    branch_number: digits(input.bank_account.branch_number),
    ...(input.bank_account.branch_check_digit
      ? { branch_check_digit: digits(input.bank_account.branch_check_digit) }
      : {}),
    account_number: digits(input.bank_account.account_number),
    account_check_digit: String(input.bank_account.account_check_digit).trim(),
    type: input.bank_account.account_type,
  };
}

export function buildRegisterInformation(input: RecipientKycInput): Record<string, unknown> {
  const document = digits(input.holder_document);
  const phones = buildPhoneNumbers(input.phone);
  const address = buildPagarmeAddress(input.address);

  if (input.holder_document_type === "cnpj") {
    const partners = (input.managing_partners || []).map(buildPartnerRegister);
    if (!partners.length) {
      throw new Error("Informe ao menos um sócio/representante legal para CNPJ.");
    }

    const register: Record<string, unknown> = {
      company_name: (input.company_name || input.holder_name).trim(),
      trading_name: (input.trading_name || input.holder_name).trim(),
      email: input.email.trim(),
      document,
      type: "corporation",
      annual_revenue: incomeToCents(Number(input.annual_revenue || 0)),
      main_address: address,
      managing_partners: partners,
    };
    if (phones) register.phone_numbers = phones;
    return register;
  }

  const register: Record<string, unknown> = {
    name: input.holder_name.trim(),
    email: input.email.trim(),
    document,
    type: "individual",
    mother_name: String(input.mother_name || "").trim(),
    birthdate: String(input.birthdate || "").trim(),
    monthly_income: incomeToCents(Number(input.monthly_income || 0)),
    professional_occupation: String(input.professional_occupation || "").trim(),
    address,
  };
  if (phones) register.phone_numbers = phones;
  return register;
}

export function buildCreateRecipientPayload(
  input: RecipientKycInput,
  code: string,
  description: string,
  metadata: Record<string, unknown>,
) {
  return {
    code: code.slice(0, 52),
    description,
    register_information: buildRegisterInformation(input),
    default_bank_account: buildBankAccountPayload(input),
    transfer_settings: {
      transfer_enabled: true,
      transfer_interval: "Daily",
      transfer_day: 0,
    },
    metadata,
  };
}

export function buildUpdateRecipientPayload(input: RecipientKycInput) {
  return {
    register_information: buildRegisterInformation(input),
  };
}
