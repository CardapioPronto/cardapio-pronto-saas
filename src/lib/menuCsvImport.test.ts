import { describe, expect, it } from "vitest";
import { MENU_CSV_TEMPLATE, parseBoolean, parseMenuCsv, parsePrice } from "./menuCsvImport";

describe("parsePrice", () => {
  it("aceita formato pt-BR", () => {
    expect(parsePrice("54,90")).toBe(54.9);
    expect(parsePrice("1.234,56")).toBe(1234.56);
    expect(parsePrice("R$ 12,00")).toBe(12);
  });

  it("aceita formato en-US", () => {
    expect(parsePrice("54.90")).toBe(54.9);
    expect(parsePrice("1,234.56")).toBe(1234.56);
  });

  it("retorna null quando invalido", () => {
    expect(parsePrice("")).toBeNull();
    expect(parsePrice("abc")).toBeNull();
  });
});

describe("parseBoolean", () => {
  it("interpreta valores comuns", () => {
    expect(parseBoolean("sim")).toBe(true);
    expect(parseBoolean("NÃO")).toBe(false);
    expect(parseBoolean("0")).toBe(false);
    expect(parseBoolean("")).toBe(true);
  });
});

describe("parseMenuCsv", () => {
  it("interpreta o template padrao", () => {
    const result = parseMenuCsv(MENU_CSV_TEMPLATE);
    expect(result.headerErrors).toHaveLength(0);
    expect(result.validRows).toHaveLength(2);
    expect(result.validRows[0].nome).toBe("Pizza Calabresa");
    expect(result.validRows[0].preco).toBe(54.9);
    expect(result.validRows[0].custo).toBe(22);
    expect(result.categoriasNovas).toEqual(["Pizzas", "Bebidas"]);
  });

  it("suporta virgula como delimitador e campos entre aspas", () => {
    const csv = 'nome,preco,categoria\n"Combo, familia",99.90,Combos';
    const result = parseMenuCsv(csv);
    expect(result.validRows).toHaveLength(1);
    expect(result.validRows[0].nome).toBe("Combo, familia");
    expect(result.validRows[0].preco).toBe(99.9);
  });

  it("reporta colunas obrigatorias ausentes", () => {
    const result = parseMenuCsv("titulo;valor\nX;1");
    expect(result.headerErrors.length).toBeGreaterThan(0);
    expect(result.rows).toHaveLength(0);
  });

  it("marca duplicados no arquivo e no cardapio existente", () => {
    const csv = "nome;preco\nAgua;5\nAGUA;5\nCafe;4";
    const result = parseMenuCsv(csv, { produtosExistentes: ["Café"] });
    expect(result.invalidRows.map((row) => row.linha)).toEqual([3, 4]);
    expect(result.invalidRows[0].erros).toContain("Produto duplicado dentro do arquivo.");
    expect(result.invalidRows[1].erros).toContain("Ja existe um produto com esse nome no cardapio.");
  });

  it("nao cria categoria ja existente e valida URL de imagem", () => {
    const csv = "nome;preco;categoria;imagem_url\nX;10;Bebidas;ftp://x\nY;10;Bebidas;https://ok/x.png";
    const result = parseMenuCsv(csv, { categoriasExistentes: ["bebidas"] });
    expect(result.categoriasNovas).toEqual([]);
    expect(result.invalidRows[0].erros).toContain("URL da imagem deve comecar com http:// ou https://.");
    expect(result.validRows).toHaveLength(1);
  });
});