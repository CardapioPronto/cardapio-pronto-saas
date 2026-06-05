import { BRAZILIAN_BANK_CODE_SET } from "./br-bank-codes.ts";

const digits = (value: string) => value.replace(/\D/g, "");

export function normalizeBankCode(value: string): string {
  return digits(value).padStart(3, "0").slice(-3);
}

export function isValidBankCode(value: string): boolean {
  return BRAZILIAN_BANK_CODE_SET.has(normalizeBankCode(value));
}

export function assertValidBankAccount(bank: {
  bank_code: string;
  branch_number: string;
  branch_check_digit?: string;
  account_number: string;
  account_check_digit: string;
}): void {
  const bankCode = normalizeBankCode(bank.bank_code);
  if (!isValidBankCode(bankCode)) {
    throw new Error(`Código do banco inválido (${bankCode}). Selecione um banco da lista.`);
  }

  const branch = digits(bank.branch_number);
  if (!/^\d{1,5}$/.test(branch)) {
    throw new Error("Agência deve ter entre 1 e 5 dígitos.");
  }

  if (bank.branch_check_digit) {
    const branchDigit = digits(bank.branch_check_digit);
    if (!/^\d{0,2}$/.test(branchDigit)) {
      throw new Error("Dígito da agência inválido.");
    }
  }

  const account = digits(bank.account_number);
  if (!/^\d{1,13}$/.test(account)) {
    throw new Error("Número da conta deve ter entre 1 e 13 dígitos.");
  }

  const accountDigit = String(bank.account_check_digit || "").trim().toUpperCase();
  if (!/^[0-9X]{1,2}$/.test(accountDigit)) {
    throw new Error("Dígito da conta inválido (use número ou X).");
  }
}
