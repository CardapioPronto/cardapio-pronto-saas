import { describe, expect, it } from "vitest";
import {
  SEGMENT_TEMPLATES,
  getSegmentTemplate,
  planSegmentSetup,
} from "./segmentQuickSetup";

describe("SEGMENT_TEMPLATES", () => {
  it("cobre os 6 segmentos previstos no M8", () => {
    expect(SEGMENT_TEMPLATES.map((s) => s.id).sort()).toEqual(
      ["bar", "cafeteria", "hamburgueria", "marmitaria", "pizzaria", "sushi"].sort(),
    );
  });

  it("todo produto aponta para uma categoria declarada e tem preco positivo", () => {
    for (const segment of SEGMENT_TEMPLATES) {
      for (const produto of segment.produtos) {
        expect(segment.categorias).toContain(produto.categoria);
        expect(produto.preco).toBeGreaterThan(0);
      }
    }
  });
});

describe("planSegmentSetup", () => {
  const template = getSegmentTemplate("pizzaria")!;

  it("cria tudo quando o cardapio esta vazio", () => {
    const plan = planSegmentSetup(template, { categorias: [], produtos: [] });
    expect(plan.categoriasNovas).toHaveLength(template.categorias.length);
    expect(plan.produtosNovos).toHaveLength(template.produtos.length);
    expect(plan.produtosIgnorados).toHaveLength(0);
  });

  it("ignora itens ja existentes comparando sem acento e sem caixa", () => {
    const plan = planSegmentSetup(template, {
      categorias: ["bebidas"],
      produtos: ["PIZZA CALABRESA"],
    });
    expect(plan.categoriasNovas).not.toContain("Bebidas");
    expect(plan.categoriasExistentes).toContain("Bebidas");
    expect(plan.produtosNovos.some((p) => p.nome === "Pizza Calabresa")).toBe(false);
    expect(plan.produtosIgnorados.map((p) => p.nome)).toEqual(["Pizza Calabresa"]);
  });
});
