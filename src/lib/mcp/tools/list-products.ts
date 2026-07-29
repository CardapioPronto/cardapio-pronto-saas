import { defineTool } from "@lovable.dev/mcp-js";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { ToolContext } from "@lovable.dev/mcp-js";

function supabaseForUser(ctx: ToolContext) {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    }
  );
}

export default defineTool({
  name: "list_products",
  title: "Listar produtos",
  description: "Lista os produtos ativos do restaurante do usuário logado, com nome, preço e categoria.",
  inputSchema: {
    limit: z.number().int().min(1).max(50).optional().describe("Quantidade máxima de produtos (padrão 20)."),
    search: z.string().optional().describe("Termo para filtrar por nome do produto."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit = 20, search }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado" }], isError: true };
    }

    let query = supabaseForUser(ctx)
      .from("products")
      .select("id, name, description, price, is_active, category:categories(id, name)")
      .eq("is_active", true)
      .order("name", { ascending: true })
      .limit(limit);

    if (search) {
      query = query.ilike("name", `%${search}%`);
    }

    const { data, error } = await query;

    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }

    return {
      content: [
        {
          type: "text",
          text: data && data.length > 0 ? JSON.stringify(data, null, 2) : "Nenhum produto encontrado.",
        },
      ],
      structuredContent: { products: data ?? [] },
    };
  },
});
