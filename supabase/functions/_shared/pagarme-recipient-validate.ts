import { assertValidBankAccount } from "./br-bank-validate.ts";
import { assertValidHolderDocument, assertValidPartnerCpf } from "./br-document-validate.ts";
import type {
  ManagingPartnerInput,
  RecipientAddressInput,
  RecipientKycInput,
} from "./pagarme-recipient-register.ts";

const digits = (s?: string | null) => String(s || "").replace(/\D/g, "");

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseAddress(raw: unknown, prefix: string): RecipientAddressInput {
  if (!isRecord(raw)) throw new Error(`${prefix}: endereço é obrigatório.`);
  const street = String(raw.street || "").trim();
  const number = String(raw.number || "").trim();
  const neighborhood = String(raw.neighborhood || "").trim();
  const city = String(raw.city || "").trim();
  const state = String(raw.state || "").trim().toUpperCase().slice(0, 2);
  const zip = digits(raw.zip_code as string);

  if (!street) throw new Error(`${prefix}: rua é obrigatória.`);
  if (!number) throw new Error(`${prefix}: número é obrigatório.`);
  if (!neighborhood) throw new Error(`${prefix}: bairro é obrigatório.`);
  if (!city) throw new Error(`${prefix}: cidade é obrigatória.`);
  if (!/^[A-Z]{2}$/.test(state)) throw new Error(`${prefix}: UF inválida (ex.: SP).`);
  if (zip.length !== 8) throw new Error(`${prefix}: CEP deve ter 8 dígitos.`);

  return {
    street,
    number,
    complement: raw.complement ? String(raw.complement).trim() : undefined,
    neighborhood,
    city,
    state,
    zip_code: zip,
    reference_point: raw.reference_point ? String(raw.reference_point).trim() : undefined,
  };
}

function parsePartner(raw: unknown, index: number): ManagingPartnerInput {
  if (!isRecord(raw)) throw new Error(`Sócio ${index + 1}: dados inválidos.`);
  const prefix = `Sócio ${index + 1}`;
  return {
    name: String(raw.name || "").trim(),
    document: digits(raw.document as string),
    email: raw.email ? String(raw.email).trim() : undefined,
    birthdate: String(raw.birthdate || "").trim(),
    mother_name: String(raw.mother_name || "").trim(),
    monthly_income: Number(raw.monthly_income || 0),
    professional_occupation: String(raw.professional_occupation || "").trim(),
    phone: raw.phone ? digits(raw.phone as string) : undefined,
    address: parseAddress(raw.address, prefix),
    self_declared_legal_representative: raw.self_declared_legal_representative !== false,
  };
}

export function validateRecipientKyc(input: unknown): RecipientKycInput {
  if (!isRecord(input)) throw new Error("Dados do recebedor ausentes.");
  const bank = isRecord(input.bank_account) ? input.bank_account : null;
  if (!bank) throw new Error("Dados bancários são obrigatórios.");

  const docType = assertValidHolderDocument(String(input.holder_document || ""));
  const holderDoc = digits(input.holder_document as string);

  const holderName = String(input.holder_name || "").trim();
  const email = String(input.email || "").trim();
  if (!holderName) throw new Error("Nome do titular é obrigatório.");
  if (!email.includes("@")) throw new Error("E-mail válido é obrigatório.");

  const address = parseAddress(input.address, "Endereço");

  assertValidBankAccount({
    bank_code: String(bank.bank_code || ""),
    branch_number: String(bank.branch_number || ""),
    branch_check_digit: bank.branch_check_digit ? String(bank.branch_check_digit) : undefined,
    account_number: String(bank.account_number || ""),
    account_check_digit: String(bank.account_check_digit || ""),
  });

  const bankCode = digits(bank.bank_code as string);
  const branch = digits(bank.branch_number as string);
  const account = digits(bank.account_number as string);
  const accountDigit = String(bank.account_check_digit || "").trim();

  const base: RecipientKycInput = {
    holder_name: holderName,
    holder_document: holderDoc,
    holder_document_type: docType,
    email,
    phone: input.phone ? digits(input.phone as string) : undefined,
    address,
    bank_account: {
      bank_code: bankCode,
      branch_number: branch,
      branch_check_digit: bank.branch_check_digit ? digits(bank.branch_check_digit as string) : undefined,
      account_number: account,
      account_check_digit: accountDigit,
      account_type: bank.account_type === "savings" ? "savings" : "checking",
    },
  };

  if (docType === "cpf") {
    const birthdate = String(input.birthdate || "").trim();
    const motherName = String(input.mother_name || "").trim();
    const occupation = String(input.professional_occupation || "").trim();
    const income = Number(input.monthly_income || 0);
    if (!birthdate) throw new Error("Data de nascimento é obrigatória para CPF.");
    if (!motherName) throw new Error("Nome da mãe é obrigatório para CPF.");
    if (!occupation) throw new Error("Ocupação profissional é obrigatória para CPF.");
    if (!Number.isFinite(income) || income <= 0) throw new Error("Renda mensal deve ser maior que zero.");
    return {
      ...base,
      birthdate,
      mother_name: motherName,
      professional_occupation: occupation,
      monthly_income: income,
    };
  }

  const companyName = String(input.company_name || holderName).trim();
  const tradingName = String(input.trading_name || holderName).trim();
  const annualRevenue = Number(input.annual_revenue || 0);
  if (!companyName) throw new Error("Razão social é obrigatória para CNPJ.");
  if (!Number.isFinite(annualRevenue) || annualRevenue <= 0) {
    throw new Error("Faturamento anual estimado deve ser maior que zero.");
  }

  const partnersRaw = Array.isArray(input.managing_partners) ? input.managing_partners : [];
  if (!partnersRaw.length) throw new Error("Informe ao menos um sócio/representante legal.");

  const managing_partners = partnersRaw.map((p, i) => {
    const partner = parsePartner(p, i);
    if (!partner.name) throw new Error(`Sócio ${i + 1}: nome é obrigatório.`);
    assertValidPartnerCpf(partner.document, `Sócio ${i + 1}: CPF`);
    if (!partner.birthdate) throw new Error(`Sócio ${i + 1}: data de nascimento é obrigatória.`);
    if (!partner.mother_name) throw new Error(`Sócio ${i + 1}: nome da mãe é obrigatório.`);
    if (!partner.professional_occupation) throw new Error(`Sócio ${i + 1}: ocupação é obrigatória.`);
    if (!partner.monthly_income || partner.monthly_income <= 0) {
      throw new Error(`Sócio ${i + 1}: renda mensal deve ser maior que zero.`);
    }
    return partner;
  });

  return {
    ...base,
    company_name: companyName,
    trading_name: tradingName,
    annual_revenue: annualRevenue,
    managing_partners,
  };
}
