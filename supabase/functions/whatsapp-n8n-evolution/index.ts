import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL");
const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY");
const N8N_INTERNAL_API_KEY = Deno.env.get("N8N_INTERNAL_API_KEY");

type JsonRecord = Record<string, unknown>;

type EvolutionWorkflowBody = {
  instanceName?: unknown;
  action?: unknown;
  messageId?: unknown;
  remoteJid?: unknown;
  fromMe?: unknown;
  messageKey?: unknown;
  message?: unknown;
  number?: unknown;
  text?: unknown;
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function ensureN8nRequest(req: Request) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const n8nSecret = req.headers.get("x-n8n-secret");

  if (!N8N_INTERNAL_API_KEY || (token !== N8N_INTERNAL_API_KEY && n8nSecret !== N8N_INTERNAL_API_KEY)) {
    throw new Error("Unauthorized n8n request");
  }
}

function requireEvolutionConfig() {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    throw new Error("Evolution API secrets are not configured");
  }

  return {
    baseUrl: EVOLUTION_API_URL.replace(/\/$/, ""),
    apiKey: EVOLUTION_API_KEY,
  };
}

async function callEvolution(path: string, body: Record<string, unknown>) {
  const { baseUrl, apiKey } = requireEvolutionConfig();
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      apikey: apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  let result: unknown = null;
  try {
    result = text ? JSON.parse(text) : null;
  } catch {
    result = { raw: text };
  }

  if (!response.ok) {
    throw new Error(`Evolution API ${response.status}: ${text}`);
  }

  return result;
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null;
}

function firstPresent(...values: unknown[]) {
  return values.find((value) => value !== undefined && value !== null && value !== "") ?? "";
}

function readRecordPath(value: unknown, ...path: string[]) {
  let current: unknown = value;
  for (const key of path) {
    if (!isRecord(current)) return undefined;
    current = current[key];
  }
  return current;
}

function buildMediaMessage(body: EvolutionWorkflowBody) {
  const key = {
    id: body.messageId,
    remoteJid: body.remoteJid,
    fromMe: body.fromMe === true,
    ...(isRecord(body.messageKey) ? body.messageKey : {}),
  };

  return {
    key: Object.fromEntries(
      Object.entries(key).filter(([, value]) => value !== undefined && value !== null && value !== ""),
    ),
    ...(isRecord(body.message) ? body.message : {}),
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    ensureN8nRequest(req);
    const body = (await req.json()) as EvolutionWorkflowBody;
    const instanceName = String(body.instanceName || "").trim();

    if (!instanceName) throw new Error("instanceName ausente");

    if (body.action === "decode_media") {
      if (!body.messageId) throw new Error("messageId ausente");

      const result = await callEvolution(
        `/chat/getBase64FromMediaMessage/${encodeURIComponent(instanceName)}`,
        {
          message: buildMediaMessage(body),
          convertToMp4: false,
        },
      );

      return jsonResponse({
        ...((result && typeof result === "object") ? result as Record<string, unknown> : { result }),
        base64:
          firstPresent(
            readRecordPath(result, "base64"),
            readRecordPath(result, "data"),
            readRecordPath(result, "media"),
            readRecordPath(result, "file"),
            readRecordPath(result, "message", "base64"),
          ) ||
          "",
        mimeType:
          firstPresent(
            readRecordPath(result, "mimetype"),
            readRecordPath(result, "mimeType"),
            readRecordPath(result, "message", "mimetype"),
          ) ||
          "audio/ogg",
      });
    }

    if (body.action === "send_text") {
      if (!body.number) throw new Error("number ausente");
      if (!body.text) throw new Error("text ausente");
      const result = await callEvolution(`/message/sendText/${encodeURIComponent(instanceName)}`, {
        number: body.number,
        text: body.text,
      });
      return jsonResponse(result);
    }

    throw new Error(`Acao nao suportada: ${body.action || "vazia"}`);
  } catch (error) {
    console.error("whatsapp-n8n-evolution error", error);
    const message = error instanceof Error ? error.message : "Erro interno";
    const status = message === "Unauthorized n8n request" ? 401 : 500;
    return jsonResponse({ error: message }, status);
  }
});
