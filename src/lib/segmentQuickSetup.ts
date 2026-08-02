/**
 * Setup rapido por segmento (Bloco M8).
 * Modelos de cardapio inicial por tipo de estabelecimento.
 */

export interface SegmentProductTemplate {
  nome: string;
  descricao: string;
  preco: number;
  categoria: string;
}

export interface SegmentTemplate {
  id: string;
  nome: string;
  descricao: string;
  emoji: string;
  categorias: string[];
  produtos: SegmentProductTemplate[];
}

export const SEGMENT_TEMPLATES: SegmentTemplate[] = [
  {
    id: "pizzaria",
    nome: "Pizzaria",
    descricao: "Pizzas salgadas e doces, bordas e bebidas.",
    emoji: "🍕",
    categorias: ["Pizzas Salgadas", "Pizzas Doces", "Bebidas"],
    produtos: [
      { nome: "Pizza Margherita", descricao: "Molho, mussarela, tomate e manjericão", preco: 49.9, categoria: "Pizzas Salgadas" },
      { nome: "Pizza Calabresa", descricao: "Molho, mussarela, calabresa e cebola", preco: 52.9, categoria: "Pizzas Salgadas" },
      { nome: "Pizza Portuguesa", descricao: "Presunto, ovo, cebola, ervilha e mussarela", preco: 56.9, categoria: "Pizzas Salgadas" },
      { nome: "Pizza Quatro Queijos", descricao: "Mussarela, provolone, parmesão e gorgonzola", preco: 58.9, categoria: "Pizzas Salgadas" },
      { nome: "Pizza Chocolate com Morango", descricao: "Chocolate ao leite e morangos frescos", preco: 54.9, categoria: "Pizzas Doces" },
      { nome: "Pizza Romeu e Julieta", descricao: "Goiabada e queijo", preco: 49.9, categoria: "Pizzas Doces" },
      { nome: "Refrigerante 2L", descricao: "Garrafa 2 litros", preco: 14.9, categoria: "Bebidas" },
      { nome: "Água Mineral 500ml", descricao: "Sem gás", preco: 4.5, categoria: "Bebidas" },
    ],
  },
  {
    id: "hamburgueria",
    nome: "Hamburgueria",
    descricao: "Burgers artesanais, acompanhamentos e bebidas.",
    emoji: "🍔",
    categorias: ["Burgers", "Acompanhamentos", "Bebidas"],
    produtos: [
      { nome: "Cheeseburger", descricao: "Pão brioche, blend 150g e cheddar", preco: 26.9, categoria: "Burgers" },
      { nome: "Burger Bacon", descricao: "Blend 150g, cheddar e bacon crocante", preco: 32.9, categoria: "Burgers" },
      { nome: "Burger Duplo", descricao: "Dois blends 150g, queijo e molho da casa", preco: 39.9, categoria: "Burgers" },
      { nome: "Burger Vegetariano", descricao: "Hambúrguer de grão-de-bico e salada", preco: 29.9, categoria: "Burgers" },
      { nome: "Batata Frita", descricao: "Porção 300g", preco: 19.9, categoria: "Acompanhamentos" },
      { nome: "Onion Rings", descricao: "Anéis de cebola empanados", preco: 22.9, categoria: "Acompanhamentos" },
      { nome: "Refrigerante Lata", descricao: "350ml", preco: 7.5, categoria: "Bebidas" },
      { nome: "Milk Shake 400ml", descricao: "Chocolate, morango ou baunilha", preco: 18.9, categoria: "Bebidas" },
    ],
  },
  {
    id: "cafeteria",
    nome: "Cafeteria",
    descricao: "Cafés, doces e salgados para o dia a dia.",
    emoji: "☕",
    categorias: ["Cafés", "Salgados", "Doces"],
    produtos: [
      { nome: "Espresso", descricao: "50ml extraído na hora", preco: 6.5, categoria: "Cafés" },
      { nome: "Cappuccino", descricao: "Espresso, leite vaporizado e espuma", preco: 12.9, categoria: "Cafés" },
      { nome: "Latte", descricao: "Espresso com leite cremoso", preco: 13.9, categoria: "Cafés" },
      { nome: "Coado Especial", descricao: "Grãos selecionados, 250ml", preco: 10.9, categoria: "Cafés" },
      { nome: "Pão de Queijo", descricao: "Unidade assada na hora", preco: 6.0, categoria: "Salgados" },
      { nome: "Croissant de Presunto e Queijo", descricao: "Massa folhada", preco: 15.9, categoria: "Salgados" },
      { nome: "Bolo de Cenoura com Chocolate", descricao: "Fatia caseira", preco: 12.9, categoria: "Doces" },
      { nome: "Cookie de Chocolate", descricao: "Unidade 80g", preco: 9.9, categoria: "Doces" },
    ],
  },
  {
    id: "sushi",
    nome: "Sushi / Japonês",
    descricao: "Combinados, temakis, entradas e bebidas.",
    emoji: "🍣",
    categorias: ["Combinados", "Temakis", "Entradas", "Bebidas"],
    produtos: [
      { nome: "Combinado 20 peças", descricao: "Sushi e sashimi variados", preco: 79.9, categoria: "Combinados" },
      { nome: "Combinado 40 peças", descricao: "Sushi, sashimi e hossomaki", preco: 139.9, categoria: "Combinados" },
      { nome: "Temaki Salmão", descricao: "Cone de alga com arroz e salmão", preco: 32.9, categoria: "Temakis" },
      { nome: "Temaki Califórnia", descricao: "Kani, pepino e manga", preco: 28.9, categoria: "Temakis" },
      { nome: "Guioza (5 un)", descricao: "Pastel japonês de carne suína", preco: 26.9, categoria: "Entradas" },
      { nome: "Sunomono", descricao: "Pepino agridoce com gergelim", preco: 18.9, categoria: "Entradas" },
      { nome: "Chá Gelado", descricao: "500ml", preco: 9.9, categoria: "Bebidas" },
      { nome: "Refrigerante Lata", descricao: "350ml", preco: 7.5, categoria: "Bebidas" },
    ],
  },
  {
    id: "bar",
    nome: "Bar",
    descricao: "Chopp, drinks, cervejas e porções.",
    emoji: "🍺",
    categorias: ["Cervejas", "Drinks", "Porções"],
    produtos: [
      { nome: "Chopp Pilsen 300ml", descricao: "Tirado na hora", preco: 12.9, categoria: "Cervejas" },
      { nome: "Cerveja Long Neck", descricao: "355ml gelada", preco: 12.0, categoria: "Cervejas" },
      { nome: "Cerveja 600ml", descricao: "Garrafa gelada", preco: 18.9, categoria: "Cervejas" },
      { nome: "Caipirinha", descricao: "Limão, açúcar e cachaça", preco: 22.9, categoria: "Drinks" },
      { nome: "Gin Tônica", descricao: "Gin, tônica e especiarias", preco: 29.9, categoria: "Drinks" },
      { nome: "Porção de Calabresa", descricao: "Acebolada com pão", preco: 42.9, categoria: "Porções" },
      { nome: "Porção de Frango a Passarinho", descricao: "500g com alho e limão", preco: 49.9, categoria: "Porções" },
      { nome: "Batata Frita com Cheddar", descricao: "Porção com bacon", preco: 39.9, categoria: "Porções" },
    ],
  },
  {
    id: "marmitaria",
    nome: "Marmitaria",
    descricao: "Marmitas por tamanho, saladas e bebidas.",
    emoji: "🍱",
    categorias: ["Marmitas", "Saladas", "Bebidas"],
    produtos: [
      { nome: "Marmita P", descricao: "Arroz, feijão, guarnição e proteína", preco: 18.9, categoria: "Marmitas" },
      { nome: "Marmita M", descricao: "Arroz, feijão, guarnição e proteína", preco: 22.9, categoria: "Marmitas" },
      { nome: "Marmita G", descricao: "Arroz, feijão, guarnição e proteína", preco: 27.9, categoria: "Marmitas" },
      { nome: "Marmita Fitness", descricao: "Arroz integral, legumes e frango grelhado", preco: 26.9, categoria: "Marmitas" },
      { nome: "Salada Simples", descricao: "Alface, tomate e cenoura", preco: 12.9, categoria: "Saladas" },
      { nome: "Salada Completa", descricao: "Folhas, grãos, ovo e frango", preco: 24.9, categoria: "Saladas" },
      { nome: "Suco Natural 500ml", descricao: "Laranja, maracujá ou limão", preco: 10.9, categoria: "Bebidas" },
      { nome: "Refrigerante Lata", descricao: "350ml", preco: 7.5, categoria: "Bebidas" },
    ],
  },
];

export function getSegmentTemplate(id: string): SegmentTemplate | undefined {
  return SEGMENT_TEMPLATES.find((segment) => segment.id === id);
}

export function normalizeName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

export interface SegmentSetupPlan {
  categoriasNovas: string[];
  categoriasExistentes: string[];
  produtosNovos: SegmentProductTemplate[];
  produtosIgnorados: SegmentProductTemplate[];
}

/**
 * Calcula o que sera criado, ignorando categorias e produtos ja existentes.
 */
export function planSegmentSetup(
  template: SegmentTemplate,
  existing: { categorias: string[]; produtos: string[] },
): SegmentSetupPlan {
  const categoriasExistentesSet = new Set(existing.categorias.map(normalizeName));
  const produtosExistentesSet = new Set(existing.produtos.map(normalizeName));

  const categoriasNovas = template.categorias.filter(
    (categoria) => !categoriasExistentesSet.has(normalizeName(categoria)),
  );
  const categoriasExistentes = template.categorias.filter((categoria) =>
    categoriasExistentesSet.has(normalizeName(categoria)),
  );

  const produtosNovos = template.produtos.filter(
    (produto) => !produtosExistentesSet.has(normalizeName(produto.nome)),
  );
  const produtosIgnorados = template.produtos.filter((produto) =>
    produtosExistentesSet.has(normalizeName(produto.nome)),
  );

  return { categoriasNovas, categoriasExistentes, produtosNovos, produtosIgnorados };
}
