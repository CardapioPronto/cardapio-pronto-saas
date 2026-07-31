/**
 * Importacao assistida de clientes por CSV (Bloco M8).
 * Funcoes puras: parse, normalizacao e validacao das linhas.
 */

import { detectDelimiter, splitCsvLine } from "./menuCsvImport";

export interface CustomerCsvRow {
  linha: number;
  nome: string;
  telefone: string;
  /** Telefone somente digitos com DDI 55 quando aplicavel. */
  phone_normalized: string;
  email: string | null;
  data_nascimento: string | null;
  tags: string[];
  observacoes: string | null;
  aceita_marketing: boolean | null;
  origem: string;
  /** Ja existe na base do restaurante: sera atualizado. */
  atualizacao: boolean;
  erros: string[];
}

export interface CustomerCsvParseResult {
  rows: CustomerCsvRow[];
  validRows: CustomerCsvRow[];
  invalidRows: CustomerCsvRow[];
  headerErrors: string[];
  novos: number;
  atualizacoes: number;
}

export const CUSTOMER_CSV_TEMPLATE = [
  "nome;telefone;email;data_nascimento;tags;observacoes;aceita_marketing;origem",
  "Maria Silva;(11) 98888-7777;maria@email.com;12/03/1990;vip,delivery;Cliente antiga;sim;importacao",
  "Joao Souza;11 97777-6666;;1988-07-25;;;nao;importacao",
].join("\n");

const FIELD_ALIASES: Record<string, keyof CustomerCsvRow> = {
  nome: "nome",
  cliente: "nome",
  name: "nome",
  telefone: "telefone",
  celular: "telefone",
  whatsapp: "telefone",
  fone: "telefone",
  phone: "telefone",
  email: "email",
  "e-mail": "email",
  data_nascimento: "data_nascimento",
  nascimento: "data_nascimento",
  aniversario: "data_nascimento",
  birth_date: "data_nascimento",
  tags: "tags",
  etiquetas: "tags",
  observacoes: "observacoes",
  observacao: "observacoes",
  notas: "observacoes",
  notes: "observacoes",
  aceita_marketing: "aceita_marketing",
  marketing: "aceita_marketing",
  optin: "aceita_marketing",
  opt_in: "aceita_marketing",
  origem: "origem",
  source: "origem",
};

function normalizeHeader(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_");
}

export function normalizeCustomerPhone(raw: string): string | null {
  const digits = (raw || "").replace(/\D/g, "");
  if (!digits) return null;
  // Numeros brasileiros locais (10 ou 11 digitos) recebem o DDI 55.
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  if (digits.length < 8 || digits.length > 15) return null;
  return digits;
}

export function parseBirthDate(raw: string): string | null | "invalid" {
  const value = (raw || "").trim();
  if (!value) return null;

  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const br = value.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);

  let year: number, month: number, day: number;
  if (iso) {
    [, year, month, day] = [0, Number(iso[1]), Number(iso[2]), Number(iso[3])];
  } else if (br) {
    [, day, month, year] = [0, Number(br[1]), Number(br[2]), Number(br[3])];
  } else {
    return "invalid";
  }

  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return "invalid";
  }
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function parseOptIn(raw: string): boolean | null {
  const value = normalizeHeader(raw);
  if (!value) return null;
  if (["sim", "s", "true", "1", "verdadeiro", "yes", "y", "aceita"].includes(value)) return true;
  if (["nao", "n", "false", "0", "falso", "no", "recusa"].includes(value)) return false;
  return null;
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

export interface ParseCustomerCsvOptions {
  /** Telefones normalizados ja existentes na base do restaurante. */
  telefonesExistentes?: string[];
}

export function parseCustomerCsv(
  content: string,
  options: ParseCustomerCsvOptions = {},
): CustomerCsvParseResult {
  const headerErrors: string[] = [];
  const lines = content
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .filter((line) => line.trim().length > 0);

  const empty: CustomerCsvParseResult = {
    rows: [],
    validRows: [],
    invalidRows: [],
    headerErrors,
    novos: 0,
    atualizacoes: 0,
  };

  if (lines.length === 0) {
    return { ...empty, headerErrors: ["Arquivo vazio."] };
  }

  const delimiter = detectDelimiter(lines[0]);
  const headers = splitCsvLine(lines[0], delimiter).map(normalizeHeader);
  const columnIndex = new Map<string, number>();

  headers.forEach((header, index) => {
    const key = FIELD_ALIASES[header];
    if (key && !columnIndex.has(key)) columnIndex.set(key, index);
  });

  if (!columnIndex.has("telefone")) headerErrors.push('Coluna obrigatoria "telefone" nao encontrada.');
  if (headerErrors.length > 0) return { ...empty, headerErrors };

  const existentes = new Set(options.telefonesExistentes ?? []);
  const vistos = new Set<string>();

  const get = (values: string[], key: string) => {
    const index = columnIndex.get(key);
    return index == null ? "" : (values[index] ?? "").trim();
  };

  const rows: CustomerCsvRow[] = lines.slice(1).map((line, offset) => {
    const values = splitCsvLine(line, delimiter);
    const erros: string[] = [];

    const telefone = get(values, "telefone");
    const phone = normalizeCustomerPhone(telefone);
    if (!telefone) erros.push("Telefone obrigatorio.");
    else if (!phone) erros.push("Telefone invalido.");

    if (phone) {
      if (vistos.has(phone)) erros.push("Telefone duplicado dentro do arquivo.");
      vistos.add(phone);
    }

    const emailRaw = get(values, "email").toLowerCase();
    if (emailRaw && !isValidEmail(emailRaw)) erros.push("E-mail invalido.");

    const nascimento = parseBirthDate(get(values, "data_nascimento"));
    if (nascimento === "invalid") erros.push("Data de nascimento invalida (use dd/mm/aaaa).");

    const tags = get(values, "tags")
      .split(/[,|]/)
      .map((tag) => tag.trim())
      .filter(Boolean);

    const observacoes = get(values, "observacoes");
    const origem = get(values, "origem") || "importacao_csv";

    return {
      linha: offset + 2,
      nome: get(values, "nome"),
      telefone,
      phone_normalized: phone ?? "",
      email: emailRaw || null,
      data_nascimento: nascimento === "invalid" ? null : nascimento,
      tags,
      observacoes: observacoes || null,
      aceita_marketing: parseOptIn(get(values, "aceita_marketing")),
      origem,
      atualizacao: !!phone && existentes.has(phone),
      erros,
    };
  });

  const validRows = rows.filter((row) => row.erros.length === 0);

  return {
    rows,
    validRows,
    invalidRows: rows.filter((row) => row.erros.length > 0),
    headerErrors,
    novos: validRows.filter((row) => !row.atualizacao).length,
    atualizacoes: validRows.filter((row) => row.atualizacao).length,
  };
}
