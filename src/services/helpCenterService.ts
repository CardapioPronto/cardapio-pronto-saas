import { supabase } from "@/integrations/supabase/client";

export interface HelpArticle {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  content: string;
  category: string;
  keywords: string[];
  order_position: number;
  is_featured: boolean;
  published: boolean;
  created_at: string;
  updated_at: string;
}

export type HelpArticleInput = Pick<
  HelpArticle,
  "slug" | "title" | "summary" | "content" | "category" | "keywords" | "order_position" | "is_featured" | "published"
>;

const TABLE = "help_articles";

export function slugifyHelpTitle(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function filterHelpArticles(articles: HelpArticle[], term: string): HelpArticle[] {
  const query = term.trim().toLowerCase();
  if (!query) return articles;
  return articles.filter((article) =>
    [article.title, article.summary ?? "", article.content, article.category, article.keywords.join(" ")]
      .join(" ")
      .toLowerCase()
      .includes(query),
  );
}

export async function listHelpArticles(includeDrafts = false): Promise<HelpArticle[]> {
  let query = supabase
    .from(TABLE as never)
    .select("*")
    .order("category", { ascending: true })
    .order("order_position", { ascending: true });

  if (!includeDrafts) {
    query = (query as unknown as { eq: (c: string, v: boolean) => typeof query }).eq("published", true);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as HelpArticle[];
}

export async function saveHelpArticle(
  input: HelpArticleInput,
  id?: string | null,
): Promise<HelpArticle> {
  const payload = { ...input, slug: input.slug || slugifyHelpTitle(input.title) };

  if (id) {
    const { data, error } = await supabase
      .from(TABLE as never)
      .update(payload as never)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return data as unknown as HelpArticle;
  }

  const { data, error } = await supabase
    .from(TABLE as never)
    .insert(payload as never)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as unknown as HelpArticle;
}

export async function deleteHelpArticle(id: string): Promise<void> {
  const { error } = await supabase.from(TABLE as never).delete().eq("id", id);
  if (error) throw new Error(error.message);
}
