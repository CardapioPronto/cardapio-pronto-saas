const digits = (value: string) => value.replace(/\D/g, "");

function allSameDigits(value: string): boolean {
  return /^(\d)\1+$/.test(value);
}

export function isValidCpf(value: string): boolean {
  const cpf = digits(value);
  if (cpf.length !== 11 || allSameDigits(cpf)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) sum += Number(cpf[i]) * (10 - i);
  let mod = (sum * 10) % 11;
  if (mod === 10) mod = 0;
  if (mod !== Number(cpf[9])) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) sum += Number(cpf[i]) * (11 - i);
  mod = (sum * 10) % 11;
  if (mod === 10) mod = 0;
  return mod === Number(cpf[10]);
}

export function isValidCnpj(value: string): boolean {
  const cnpj = digits(value);
  if (cnpj.length !== 14 || allSameDigits(cnpj)) return false;

  const calcDigit = (base: string, weights: number[]) => {
    const sum = weights.reduce((acc, weight, index) => acc + Number(base[index]) * weight, 0);
    const mod = sum % 11;
    return mod < 2 ? 0 : 11 - mod;
  };

  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const d1 = calcDigit(cnpj, w1);
  const d2 = calcDigit(cnpj.slice(0, 12) + String(d1), w2);
  return cnpj.endsWith(`${d1}${d2}`);
}

export function getHolderDocumentError(value: string): string | null {
  const doc = digits(value);
  if (!doc) return null;
  if (doc.length === 11) return isValidCpf(doc) ? null : "CPF inválido (dígitos verificadores).";
  if (doc.length === 14) return isValidCnpj(doc) ? null : "CNPJ inválido (dígitos verificadores).";
  if (doc.length > 0) return "Informe 11 dígitos (CPF) ou 14 (CNPJ).";
  return null;
}

export function getCpfError(value: string, label = "CPF"): string | null {
  const doc = digits(value);
  if (!doc) return null;
  if (doc.length !== 11) return `${label}: informe 11 dígitos.`;
  return isValidCpf(doc) ? null : `${label}: dígitos verificadores inválidos.`;
}
