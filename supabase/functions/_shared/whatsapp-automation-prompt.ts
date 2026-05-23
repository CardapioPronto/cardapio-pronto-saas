/**
 * Prompt de IA do Atendimento WhatsApp (automation_settings por instância).
 * whatsapp_integration.ai_system_prompt é fallback legado (Fase 2).
 */

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

export type ResolveSystemPromptOptions = {
  restaurantId: string;
  instanceId?: string | null;
};

export type ResolveSystemPromptResult = {
  systemPrompt: string;
  source: "automation_settings" | "whatsapp_integration_legacy" | "default";
  instanceId: string | null;
};

const trimOrNull = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const buildDefaultPrompt = (restaurantName: string, address: string | null) =>
  `Você é um assistente virtual do restaurante ${restaurantName}. ` +
  `Seja cordial, útil e responda perguntas sobre o cardápio, horários e pedidos. ` +
  `Endereço: ${address || "não informado"}`;

const composeAutomationPrompt = (
  settings: Record<string, unknown>,
  restaurantName: string,
  address: string | null,
): string | null => {
  const persona = trimOrNull(settings.ai_persona);
  const botName = trimOrNull(settings.bot_name);
  const extraRaw = trimOrNull(settings.additional_instructions);

  if (!persona && !extraRaw) return null;

  const parts: string[] = [];
  if (botName) {
    parts.push(`Você é ${botName}, assistente virtual do restaurante ${restaurantName}.`);
  } else {
    parts.push(`Você é um assistente virtual do restaurante ${restaurantName}.`);
  }

  if (persona) parts.push(persona);

  if (extraRaw) {
    try {
      const parsed = JSON.parse(extraRaw) as Record<string, unknown>;
      const systemExtra = trimOrNull(parsed.system_prompt_extra);
      if (systemExtra) parts.push(systemExtra);
    } catch {
      parts.push(extraRaw);
    }
  }

  parts.push(`Endereço do restaurante: ${address || "não informado"}.`);
  parts.push("Responda em português brasileiro.");

  return parts.join("\n\n");
};

async function resolveActiveInstanceId(
  supabase: SupabaseClient,
  restaurantId: string,
  instanceId?: string | null,
): Promise<string | null> {
  if (instanceId) return instanceId;

  const { data, error } = await supabase
    .from("whatsapp_instances")
    .select("id")
    .eq("restaurant_id", restaurantId)
    .eq("is_active", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return typeof data?.id === "string" ? data.id : null;
}

export async function resolveWhatsAppSystemPrompt(
  supabase: SupabaseClient,
  options: ResolveSystemPromptOptions,
): Promise<ResolveSystemPromptResult> {
  const { restaurantId, instanceId: preferredInstanceId } = options;

  const { data: restaurant, error: restaurantError } = await supabase
    .from("restaurants")
    .select("name, address")
    .eq("id", restaurantId)
    .maybeSingle();

  if (restaurantError) throw restaurantError;

  const restaurantName = trimOrNull(restaurant?.name) || "nosso restaurante";
  const address = trimOrNull(restaurant?.address);

  const instanceId = await resolveActiveInstanceId(
    supabase,
    restaurantId,
    preferredInstanceId,
  );

  if (instanceId) {
    const { data: settings, error: settingsError } = await supabase
      .from("automation_settings")
      .select("ai_persona, bot_name, additional_instructions")
      .eq("instance_id", instanceId)
      .maybeSingle();

    if (settingsError) throw settingsError;

    if (settings) {
      const composed = composeAutomationPrompt(
        settings as Record<string, unknown>,
        restaurantName,
        address,
      );
      if (composed) {
        return { systemPrompt: composed, source: "automation_settings", instanceId };
      }
    }
  }

  const { data: integration, error: integrationError } = await supabase
    .from("whatsapp_integration")
    .select("ai_system_prompt")
    .eq("restaurant_id", restaurantId)
    .maybeSingle();

  if (integrationError && integrationError.code !== "PGRST116") {
    throw integrationError;
  }

  const legacyPrompt = trimOrNull(integration?.ai_system_prompt);
  if (legacyPrompt) {
    return {
      systemPrompt: legacyPrompt,
      source: "whatsapp_integration_legacy",
      instanceId,
    };
  }

  return {
    systemPrompt: buildDefaultPrompt(restaurantName, address),
    source: "default",
    instanceId,
  };
}
