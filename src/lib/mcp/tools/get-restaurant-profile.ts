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
  name: "get_restaurant_profile",
  title: "Perfil do restaurante",
  description: "Retorna os dados básicos do restaurante vinculado ao usuário logado, como nome, slug, telefone e endereço.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado" }], isError: true };
    }

    const { data, error } = await supabaseForUser(ctx)
      .from("restaurants")
      .select(
        "id, name, slug, phone, address, city, state, logo_url, primary_color, is_active, created_at"
      )
      .single();

    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(data, null, 2),
        },
      ],
      structuredContent: { restaurant: data },
    };
  },
});
