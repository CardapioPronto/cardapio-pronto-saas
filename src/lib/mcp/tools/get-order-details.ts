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
  name: "get_order_details",
  title: "Detalhes do pedido",
  description: "Retorna os detalhes completos de um pedido, incluindo itens, observações e dados do cliente.",
  inputSchema: {
    order_id: z.string().uuid().describe("ID do pedido (UUID)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ order_id }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado" }], isError: true };
    }

    const { data, error } = await supabaseForUser(ctx)
      .from("orders")
      .select(
        "id, order_number, customer_name, customer_email, customer_phone, status, payment_status, total, order_type, source, created_at, updated_at, order_items(id, product_name, quantity, price, observations, addons)"
      )
      .eq("id", order_id)
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
      structuredContent: { order: data },
    };
  },
});
