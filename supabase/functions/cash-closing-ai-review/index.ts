// Edge Function: cash-closing-ai-review
// Gerente informa totais do fechamento + foto do relatorio da maquininha.
// Lovable AI le a foto, compara com as vendas do turno e sugere causas de divergencia.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { INSTRUCTIONS, REVIEW_SCHEMA } from "./review-schema.ts";
import { createLovableAiGatewayRunIdFetch, getLovableAiGatewayRunId } from "../_shared/run-id.ts";
import { summarizeCashActivity, type CashActivityOrder } from "../_shared/cash-shift-activity.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-lovable-aig-run-id",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Expose-Headers": "X-Lovable-AIG-Run-ID",
};

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/responses";
const MODEL = "openai/gpt-6-astra";
const MAX_IMAGE_CHARS = 8_000_000; // ~6MB base64

const json = (body: unknown, status = 200, extra?: HeadersInit) => {
  const headers = new Headers({ ...corsHeaders, "Content-Type": "application/json" });
  new Headers(extra).forEach((v, k) => headers.set(k, v));
  return new Response(JSON.stringify(body), { status, headers });
};

const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : 0;
};

async function readResponsesStream(response: Response): Promise<string> {
  if (!response.body) throw new Error("Resposta da análise sem conteúdo");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";
  let streamError: string | null = null;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";
    for (const event of events) {
      for (const line of event.split("\n")) {
        if (!line.startsWith("data:")) continue;
        const data = line.slice(5).trim();
        if (!data || data === "[DONE]") continue;
        try {
          const parsed = JSON.parse(data);
          if (parsed.type === "response.output_text.delta") text += parsed.delta ?? "";
          if (parsed.type === "response.refusal.delta") streamError = "O modelo recusou analisar esta imagem.";
          if (parsed.type === "error" || parsed.type === "response.failed") {
            streamError = parsed.error?.message ?? parsed.response?.error?.message ?? "Falha na análise.";
          }
        } catch {
          // ignora fragmentos nao JSON
        }
      }
    }
  }
  if (streamError) throw new Error(streamError);
  if (!text.trim()) throw new Error("A análise voltou vazia. Tente novamente com outra foto.");
  return text;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método não permitido" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Não autenticado" }, 401);

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) return json({ error: "Sessão inválida" }, 401);

    const { data: isManager } = await supabase.rpc("is_owner_or_manager", { _user_id: user.id });
    if (!isManager) return json({ error: "Apenas donos e gerentes podem usar a análise do fechamento." }, 403);

    const body = await req.json().catch(() => null);
    const sessionId = String(body?.sessionId ?? "");
    const image = String(body?.image ?? "");
    if (!sessionId) return json({ error: "Caixa não informado" }, 400);
    if (!/^data:image\/(png|jpe?g|webp);base64,/.test(image)) {
      return json({ error: "Envie uma foto em JPG, PNG ou WEBP." }, 400);
    }
    if (image.length > MAX_IMAGE_CHARS) return json({ error: "Foto muito grande (máx. ~6 MB)." }, 400);

    // RLS garante que o caixa pertence ao restaurante do usuario
    const { data: session, error: sessionError } = await supabase
      .from("cash_register_sessions")
      .select("*")
      .eq("id", sessionId)
      .maybeSingle();
    if (sessionError) throw sessionError;
    if (!session) return json({ error: "Caixa não encontrado" }, 404);
    if (session.status !== "open") return json({ error: "Este caixa já foi fechado." }, 409);

    const { data: activityData, error: ordersError } = await supabase.rpc("get_cash_shift_activity", {
      p_restaurant_id: session.restaurant_id, p_since: session.opened_at,
    });
    if (ordersError) throw ordersError;
    const activityInput = activityData as { orders: CashActivityOrder[]; since: string; until: string };
    if (!activityInput || !Array.isArray(activityInput.orders)) throw new Error("Conferência indisponível");
    const activity = summarizeCashActivity(activityInput.orders, activityInput.since, activityInput.until);

    const declared = {
      troco_inicial: num(session.opening_amount),
      dinheiro_contado: num(body?.declared?.cash),
      sangrias: num(body?.declared?.withdrawals),
      pix: num(body?.declared?.pix),
      credito: num(body?.declared?.credit),
      debito: num(body?.declared?.debit),
      voucher: num(body?.declared?.voucher),
      maquininha: String(body?.declared?.provider ?? "").slice(0, 60) || null,
      lote: String(body?.declared?.batch ?? "").slice(0, 60) || null,
    };

    const shift = {
      aberto_em: session.opened_at,
      apurado_ate: activity.until,
      pedidos_validos: activity.count,
      total_vendas_sistema: activity.total,
      total_recebido_local: activity.receivedTotal,
      dinheiro_esperado_gaveta: num(session.opening_amount) + activity.cashReceived - declared.sangrias,
      pagamentos_pendentes: { pedidos: activity.pending.length, total: activity.pendingTotal },
      canais_externos: { pedidos: activity.external.length, total_bruto: activity.externalTotal, repasse_confirmado: false },
      revisar: { pedidos: activity.review.length, total: activity.reviewTotal },
      por_forma_pagamento: activity.byMethod,
      observacao: "Compare declaração somente com recebimentos locais confirmados por paid_at. Vendas não são recebimentos. Pendentes e externos não entram na gaveta. Misto, estornos, datas ausentes e coleta iFood desconhecida exigem revisão; não invente parcelas ou repasses.",
    };

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return json({ error: "Lovable AI não está configurado." }, 500);

    const gateway = createLovableAiGatewayRunIdFetch(getLovableAiGatewayRunId(req));
    const aiResponse = await gateway.fetch(GATEWAY_URL, {
      method: "POST",
      signal: req.signal,
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: MODEL,
        stream: true,
        store: false,
        reasoning: { effort: "medium", summary: "auto" },
        include: ["reasoning.encrypted_content"],
        text: { format: { type: "json_schema", name: "cash_closing_review", strict: true, schema: REVIEW_SCHEMA } },
        input: [
          { role: "system", content: INSTRUCTIONS },
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: `Totais declarados pelo gerente:\n${JSON.stringify(declared, null, 2)}\n\nVendas do turno no sistema:\n${JSON.stringify(shift, null, 2)}\n\nA foto do relatorio da maquininha segue abaixo.`,
              },
              { type: "input_image", image_url: image },
            ],
          },
        ],
      }),
    });

    const runId = gateway.getRunId();
    const runHeaders: HeadersInit = runId ? { "X-Lovable-AIG-Run-ID": runId } : {};

    if (!aiResponse.ok) {
      const detail = await aiResponse.text().catch(() => "");
      console.error("AI gateway error", aiResponse.status, detail.slice(0, 500));
      let message = "Não foi possível analisar agora. Tente novamente em instantes.";
      if (aiResponse.status === 402) message = "Créditos de IA esgotados. Adicione créditos em Configurações → Planos e créditos.";
      else if (aiResponse.status === 429) message = "Muitas análises seguidas. Aguarde um minuto e tente de novo.";
      else if (aiResponse.status === 403) message = "A análise por IA está bloqueada para esta conta.";
      else if (aiResponse.status === 400) message = "A foto não pôde ser processada. Tente outra imagem mais nítida.";
      return json({ error: message }, aiResponse.status, runHeaders);
    }

    const text = await readResponsesStream(aiResponse);
    const review = JSON.parse(text);
    const result = { ...review, shift, declared, model: MODEL };

    const { error: saveError } = await supabase
      .from("cash_register_sessions")
      .update({ ai_review: result, ai_reviewed_at: new Date().toISOString() })
      .eq("id", sessionId)
      .eq("status", "open");
    if (saveError) console.error("save ai_review failed", saveError.message);

    return json({ review: result }, 200, runHeaders);
  } catch (error) {
    if (req.signal.aborted) return new Response(null, { status: 499, headers: corsHeaders });
    console.error("cash-closing-ai-review", error);
    return json({ error: error instanceof Error ? error.message : "Erro inesperado" }, 500);
  }
});
