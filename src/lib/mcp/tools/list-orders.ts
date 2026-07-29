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
  name: "list_orders",
  title: "Listar pedidos recentes",
  description: "Lista os pedidos mais recentes do restaurante do usuário logado, com status e valor total.",
  inputSchema: {
    limit: z.number().int().min(1).max(50).optional().describe("Quantidade máxima de pedidos (padrão 20)."),
    status: z.string().optional().describe("Filtrar por status (ex.: pending, preparing, ready, delivered, cancelled)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit = 20, status }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado" }], isError: true };
    }

    let query = supabaseForUser(ctx)
      .from("orders")
      .select("id, order_number, customer_name, status, payment_status, total, order_type, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }

    return {
      content: [
        {
          type: "text",
          text: data && data.length > 0 ? JSON.stringify(data, null, 2) : "Nenhum pedido encontrado.",
        },
      ],
      structuredContent: { orders: data ?? [] },
    };
  },
});
