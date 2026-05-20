/** Mantém apenas dígitos. */
export function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

/** Máscara MM/AA (máx. 4 dígitos → MM/AA). */
export function formatCardExpiryInput(value: string): string {
  const digits = digitsOnly(value).slice(0, 4);
  if (digits.length === 0) return "";
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

/** Converte MM/AA (ou 4 dígitos) para mês e ano com 2 dígitos enviados ao backend/Pagar.me. */
export function parseCardExpiry(value: string): { expMonth: string; expYear: string } | null {
  const digits = digitsOnly(value).slice(0, 4);
  if (digits.length !== 4) return null;
  const month = Number(digits.slice(0, 2));
  if (month < 1 || month > 12) return null;
  return {
    expMonth: digits.slice(0, 2),
    expYear: digits.slice(2, 4),
  };
}

/** Agrupa número do cartão em blocos de 4. */
export function formatCardNumberInput(value: string): string {
  const digits = digitsOnly(value).slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}

/** Telefone BR: (DD) 9XXXX-XXXX ou fixo. */
export function formatPhoneInput(value: string): string {
  const digits = digitsOnly(value).slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : "";
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}
