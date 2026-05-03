import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
const N8N_INTERNAL_API_KEY = Deno.env.get("N8N_INTERNAL_API_KEY");

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function ensureN8nRequest(req: Request) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!N8N_INTERNAL_API_KEY || token !== N8N_INTERNAL_API_KEY) {
    throw new Error("Unauthorized n8n request");
  }
}

function base64ToBytes(rawBase64: string) {
  const base64 = rawBase64.includes(",") ? rawBase64.split(",").pop() || "" : rawBase64;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    ensureN8nRequest(req);
    if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY is not configured");

    const body = await req.json();
    if (!body.base64) throw new Error("base64 ausente");

    const mimeType = String(body.mimeType || "audio/ogg");
    const fileName = String(body.fileName || "audio.ogg");
    const language = body.language ? String(body.language) : "pt";
    const bytes = base64ToBytes(String(body.base64));

    const form = new FormData();
    form.append("file", new Blob([bytes], { type: mimeType }), fileName);
    form.append("model", String(body.model || "whisper-large-v3-turbo"));
    form.append("language", language);
    form.append("response_format", "json");

    const groqResponse = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: form,
    });

    const text = await groqResponse.text();
    let result: any = null;
    try {
      result = text ? JSON.parse(text) : null;
    } catch {
      result = { raw: text };
    }

    if (!groqResponse.ok) {
      throw new Error(`Groq transcription ${groqResponse.status}: ${text}`);
    }

    return jsonResponse({
      text: result?.text || "",
      groq: result,
    });
  } catch (error: any) {
    console.error("whatsapp-n8n-groq-transcribe error", error);
    const status = error.message === "Unauthorized n8n request" ? 401 : 500;
    return jsonResponse({ error: error.message || "Erro interno" }, status);
  }
});
