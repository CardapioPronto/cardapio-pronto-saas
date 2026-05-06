import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { sendManagedEmail } from "../_shared/email-delivery.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Scope = "system" | "restaurant";

interface EmailSettingsPayload {
  action?: "get" | "save" | "test";
  scope?: Scope;
  apiKey?: string;
  fromName?: string;
  fromEmail?: string;
  replyTo?: string;
  isEnabled?: boolean;
  testEmail?: string;
}

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const admin = createClient(supabaseUrl, serviceRoleKey);

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

const maskSecret = (value?: string | null) => {
  if (!value) return null;
  if (value.length <= 8) return "********";
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
};

const assertEmail = (email: string, field: string) => {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error(`${field} inválido`);
  }
};

const getAuthenticatedUser = async (req: Request) => {
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace("Bearer ", "");
  if (!token) throw new Error("Usuário não autenticado");

  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) throw new Error("Usuário não autenticado");
  return data.user;
};

const loadProfile = async (userId: string) => {
  const { data, error } = await admin
    .from("users")
    .select("id, restaurant_id, user_type, role")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) throw new Error("Perfil do usuário não encontrado");
  return data as {
    id: string;
    restaurant_id: string | null;
    user_type: string | null;
    role: string | null;
  };
};

const hasIntegrationPermission = async (userId: string) => {
  const { data: employee } = await admin
    .from("employees")
    .select("id")
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();

  if (!employee?.id) return false;

  const { data } = await admin
    .from("employee_permissions")
    .select("permission")
    .eq("employee_id", employee.id)
    .eq("permission", "settings_integrations_manage")
    .maybeSingle();

  return !!data;
};

const isSuperAdmin = async (userId: string) => {
  const { data, error } = await admin.rpc("is_super_admin", { user_id: userId });
  if (error) {
    console.error("Erro ao verificar super admin:", error);
    return false;
  }
  return !!data;
};

const resolveScope = async (scope: Scope, userId: string) => {
  const profile = await loadProfile(userId);
  const superAdmin = profile.role === "super_admin" || await isSuperAdmin(userId);

  if (scope === "system") {
    if (!superAdmin) {
      throw new Error("Apenas super admins podem gerenciar o e-mail global");
    }
    return { restaurantId: null as string | null };
  }

  if (!profile.restaurant_id) {
    throw new Error("Restaurante não encontrado para este usuário");
  }

  if (superAdmin || profile.user_type === "owner") {
    return { restaurantId: profile.restaurant_id };
  }

  if (await hasIntegrationPermission(userId)) {
    return { restaurantId: profile.restaurant_id };
  }

  throw new Error("Sem permissão para gerenciar integrações");
};

const serializeSettings = (settings: any) => ({
  provider: settings?.provider || "resend",
  fromName: settings?.from_name || "",
  fromEmail: settings?.from_email || "",
  replyTo: settings?.reply_to || "",
  isEnabled: !!settings?.is_enabled,
  hasApiKey: !!settings?.api_key && settings.api_key !== "configure-via-admin",
  apiKeyPreview: maskSecret(settings?.api_key),
  updatedAt: settings?.updated_at || null,
});

const getSettings = async (restaurantId: string | null) => {
  const query = admin.from("email_settings").select("*").eq("provider", "resend");
  const { data, error } = restaurantId
    ? await query.eq("restaurant_id", restaurantId).maybeSingle()
    : await query.is("restaurant_id", null).maybeSingle();

  if (error) throw error;
  return data;
};

const saveSettings = async (
  restaurantId: string | null,
  userId: string,
  payload: EmailSettingsPayload,
) => {
  const existing = await getSettings(restaurantId);
  const fromName = (payload.fromName || existing?.from_name || "Pubfy").trim();
  const fromEmail = (payload.fromEmail || existing?.from_email || "").trim();
  const replyTo = (payload.replyTo || "").trim() || null;
  const nextApiKey = payload.apiKey?.trim() || existing?.api_key;

  if (!nextApiKey || nextApiKey === "configure-via-admin") {
    throw new Error("Chave de API do Resend é obrigatória");
  }

  if (!fromName) throw new Error("Nome do remetente é obrigatório");
  assertEmail(fromEmail, "E-mail do remetente");
  if (replyTo) assertEmail(replyTo, "E-mail de resposta");

  const { data, error } = await admin
    .from("email_settings")
    .upsert(
      {
        restaurant_id: restaurantId,
        provider: "resend",
        api_key: nextApiKey,
        from_name: fromName,
        from_email: fromEmail,
        reply_to: replyTo,
        is_enabled: !!payload.isEnabled,
        updated_by: userId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "restaurant_id,provider" },
    )
    .select("*")
    .single();

  if (error) throw error;
  return data;
};

const sendLoggedTest = async (restaurantId: string | null, testEmail: string) => {
  assertEmail(testEmail, "E-mail de teste");
  return await sendManagedEmail({
    admin,
    restaurantId,
    preferRestaurantConfig: !!restaurantId,
    emailType: "test",
    to: testEmail,
    subject: "Teste de envio Pubfy",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto;">
        <h2>Integração Resend ativa</h2>
        <p>Este e-mail confirma que a configuração de envio do Pubfy está funcionando.</p>
      </div>
    `,
    text: "Integração Resend ativa. Este e-mail confirma que a configuração de envio do Pubfy está funcionando.",
    contextType: "email_settings",
    metadata: { source: "settings_test" },
  });
};

const inferAction = (payload: EmailSettingsPayload, req: Request) => {
  const queryAction = new URL(req.url).searchParams.get("action");
  if (payload.action || queryAction) return payload.action || queryAction;
  if (payload.testEmail) return "test";
  if (
    "apiKey" in payload ||
    "fromName" in payload ||
    "fromEmail" in payload ||
    "replyTo" in payload ||
    "isEnabled" in payload
  ) {
    return "save";
  }
  return "get";
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const user = await getAuthenticatedUser(req);
    const payload = (await req.json().catch(() => ({}))) as EmailSettingsPayload;
    const action = inferAction(payload, req);
    const scope = payload.scope || (new URL(req.url).searchParams.get("scope") as Scope) || "restaurant";
    const { restaurantId } = await resolveScope(scope, user.id);

    if (action === "get") {
      return jsonResponse({ settings: serializeSettings(await getSettings(restaurantId)) });
    }

    if (action === "save") {
      const settings = await saveSettings(restaurantId, user.id, payload);
      return jsonResponse({ settings: serializeSettings(settings) });
    }

    if (action === "test") {
      await sendLoggedTest(restaurantId, payload.testEmail || user.email || "");
      return jsonResponse({ success: true });
    }

    return jsonResponse({ error: "Ação inválida" }, 400);
  } catch (error) {
    console.error("email-settings error:", error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Erro desconhecido" },
      400,
    );
  }
});
