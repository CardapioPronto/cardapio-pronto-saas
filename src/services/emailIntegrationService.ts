import { supabase } from "@/integrations/supabase/client";

export type EmailIntegrationScope = "system" | "restaurant";

export interface EmailIntegrationSettings {
  provider: "resend";
  fromName: string;
  fromEmail: string;
  replyTo: string;
  isEnabled: boolean;
  hasApiKey: boolean;
  apiKeyPreview: string | null;
  updatedAt: string | null;
}

export interface EmailIntegrationSavePayload {
  scope: EmailIntegrationScope;
  apiKey?: string;
  fromName: string;
  fromEmail: string;
  replyTo?: string;
  isEnabled: boolean;
}

async function invokeEmailSettings<T>(action: string, body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke<T>("email-settings", {
    body: { ...body, action },
  });

  if (error) throw error;
  if (data && typeof data === "object" && "error" in data) {
    throw new Error(String((data as { error: unknown }).error));
  }

  return data;
}

export async function getEmailIntegrationSettings(scope: EmailIntegrationScope) {
  const data = await invokeEmailSettings<{ settings: EmailIntegrationSettings }>("get", { scope });
  return data?.settings;
}

export async function saveEmailIntegrationSettings(payload: EmailIntegrationSavePayload) {
  const data = await invokeEmailSettings<{ settings: EmailIntegrationSettings }>("save", payload);
  return data?.settings;
}

export async function sendEmailIntegrationTest(scope: EmailIntegrationScope, testEmail: string) {
  return invokeEmailSettings<{ success: boolean }>("test", { scope, testEmail });
}
