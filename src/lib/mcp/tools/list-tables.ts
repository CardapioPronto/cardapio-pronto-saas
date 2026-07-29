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
  name: "list_tables",
  title: "Listar mesas",
  description: "Lista as mesas do restaurante do usuário logado, com nome, capacidade e status.",
  inputSchema: {
    limit: z.number().int().min(1).max(100).optional().describe("Quantidade máxima de mesas (padrão 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit = 50 }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado" }], isError: true };
    }

    const { data, error } = await supabaseForUser(ctx)
      .from("mesas")
      .select("id, name, capacity, status, qr_code_url, created_at")
      .order("name", { ascending: true })
      .limit(limit);

    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }

    return {
      content: [
        {
          type: "text",
          text: data && data.length > 0 ? JSON.stringify(data, null, 2) : "Nenhuma mesa encontrada.",
        },
      ],
      structuredContent: { tables: data ?? [] },
    };
  },
});
