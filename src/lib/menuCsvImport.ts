/**
 * Importacao assistida de cardapio por CSV (Bloco M8).
 * Funcoes puras: parse, normalizacao e validacao das linhas.
 */

export interface MenuCsvRow {
  linha: number;
  nome: string;
  descricao: string;
  preco: number;
  categoria: string;
  disponivel: boolean;
  imagem_url: string | null;
  custo: number | null;
  erros: string[];
}

export interface MenuCsvParseResult {
  rows: MenuCsvRow[];
  validRows: MenuCsvRow[];
  invalidRows: MenuCsvRow[];
  headerErrors: string[];
  categoriasNovas: string[];
}

export const MENU_CSV_TEMPLATE = [
  "nome;descricao;preco;categoria;disponivel;imagem_url;custo",
  "Pizza Calabresa;Molho, mussarela e calabresa;54,90;Pizzas;sim;;22,00",
  "Coca-Cola Lata;Refrigerante 350ml;7,50;Bebidas;sim;;3,20",
].join("\n");

const FIELD_ALIASES: Record<string, keyof Omit<MenuCsvRow, "linha" | "erros">> = {
  nome: "nome",
  produto: "nome",
  name: "nome",
  descricao: "descricao",
  descrição: "descricao",
  description: "descricao",
  preco: "preco",
  preço: "preco",
  valor: "preco",
  price: "preco",
  categoria: "categoria",
  category: "categoria",
  disponivel: "disponivel",
  disponível: "disponivel",
  available: "disponivel",
  imagem_url: "imagem_url",
  imagem: "imagem_url",
  image_url: "imagem_url",
  custo: "custo",
  custo_price: "custo",
  cost_price: "custo",
  preco_custo: "preco_custo" as never,
};

export function detectDelimiter(headerLine: string): string {
  const candidates = [";", ",", "\t", "|"];
  let best = ";";
  let bestCount = -1;
  for (const candidate of candidates) {
    const count = splitCsvLine(headerLine, candidate).length;
    if (count > bestCount) {
      bestCount = count;
      best = candidate;
    }
  }
  return best;
}

export function splitCsvLine(line: string, delimiter: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === delimiter && !inQuotes) {
      values.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  values.push(current);
  return values.map((value) => value.trim());
}

function normalizeHeader(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_");
}

export function parsePrice(raw: string): number | null {
  const cleaned = raw.replace(/[^\d,.-]/g, "").trim();
  if (!cleaned) return null;

  let normalized = cleaned;
  const hasComma = cleaned.includes(",");
  const hasDot = cleaned.includes(".");

  if (hasComma && hasDot) {
    // "1.234,56" (pt-BR) ou "1,234.56" (en-US)
    normalized =
      cleaned.lastIndexOf(",") > cleaned.lastIndexOf(".")
        ? cleaned.replace(/\./g, "").replace(",", ".")
        : cleaned.replace(/,/g, "");
  } else if (hasComma) {
    normalized = cleaned.replace(",", ".");
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseBoolean(raw: string, fallback = true): boolean {
  const value = normalizeHeader(raw);
  if (!value) return fallback;
  if (["sim", "s", "true", "1", "verdadeiro", "yes", "y", "disponivel"].includes(value)) return true;
  if (["nao", "n", "false", "0", "falso", "no", "indisponivel"].includes(value)) return false;
  return fallback;
}

export function normalizeCategoryName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export interface ParseMenuCsvOptions {
  /** Nomes de categorias ja existentes no restaurante. */
  categoriasExistentes?: string[];
  /** Nomes de produtos ja existentes, para sinalizar duplicidade. */
  produtosExistentes?: string[];
}

export function parseMenuCsv(content: string, options: ParseMenuCsvOptions = {}): MenuCsvParseResult {
  const headerErrors: string[] = [];
  const lines = content
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .filter((line) => line.trim().length > 0);

  if (lines.length === 0) {
    return { rows: [], validRows: [], invalidRows: [], headerErrors: ["Arquivo vazio."], categoriasNovas: [] };
  }

  const delimiter = detectDelimiter(lines[0]);
  const headers = splitCsvLine(lines[0], delimiter).map(normalizeHeader);
  const columnIndex = new Map<string, number>();

  headers.forEach((header, index) => {
    const key = FIELD_ALIASES[header as keyof typeof FIELD_ALIASES] ?? (header === "preco_custo" ? "custo" : undefined);
    if (key && !columnIndex.has(key)) columnIndex.set(key, index);
  });

  if (!columnIndex.has("nome")) headerErrors.push('Coluna obrigatoria "nome" nao encontrada.');
  if (!columnIndex.has("preco")) headerErrors.push('Coluna obrigatoria "preco" nao encontrada.');

  if (headerErrors.length > 0) {
    return { rows: [], validRows: [], invalidRows: [], headerErrors, categoriasNovas: [] };
  }

  const existingCategories = new Set((options.categoriasExistentes ?? []).map(normalizeCategoryName));
  const existingProducts = new Set((options.produtosExistentes ?? []).map(normalizeCategoryName));
  const seenProducts = new Set<string>();
  const novasCategorias = new Map<string, string>();

  const get = (values: string[], key: string) => {
    const index = columnIndex.get(key);
    return index == null ? "" : (values[index] ?? "");
  };

  const rows: MenuCsvRow[] = lines.slice(1).map((line, offset) => {
    const values = splitCsvLine(line, delimiter);
    const erros: string[] = [];

    const nome = get(values, "nome").trim();
    if (!nome) erros.push("Nome obrigatorio.");

    const precoRaw = get(values, "preco");
    const preco = parsePrice(precoRaw);
    if (preco == null) erros.push("Preco invalido.");
    else if (preco < 0) erros.push("Preco nao pode ser negativo.");

    const custoRaw = get(values, "custo");
    const custo = custoRaw ? parsePrice(custoRaw) : null;
    if (custoRaw && custo == null) erros.push("Custo invalido.");

    const imagemRaw = get(values, "imagem_url").trim();
    if (imagemRaw && !/^https?:\/\//i.test(imagemRaw)) erros.push("URL da imagem deve comecar com http:// ou https://.");

    const categoria = get(values, "categoria").trim();
    const chaveProduto = normalizeCategoryName(nome);

    if (nome && seenProducts.has(chaveProduto)) erros.push("Produto duplicado dentro do arquivo.");
    if (nome) seenProducts.add(chaveProduto);
    if (nome && existingProducts.has(chaveProduto)) erros.push("Ja existe um produto com esse nome no cardapio.");

    if (categoria && erros.length === 0) {
      const chaveCategoria = normalizeCategoryName(categoria);
      if (!existingCategories.has(chaveCategoria) && !novasCategorias.has(chaveCategoria)) {
        novasCategorias.set(chaveCategoria, categoria);
      }
    }

    return {
      linha: offset + 2,
      nome,
      descricao: get(values, "descricao").trim(),
      preco: preco ?? 0,
      categoria,
      disponivel: parseBoolean(get(values, "disponivel")),
      imagem_url: imagemRaw || null,
      custo: custo ?? null,
      erros,
    };
  });

  return {
    rows,
    validRows: rows.filter((row) => row.erros.length === 0),
    invalidRows: rows.filter((row) => row.erros.length > 0),
    headerErrors,
    categoriasNovas: Array.from(novasCategorias.values()),
  };
}