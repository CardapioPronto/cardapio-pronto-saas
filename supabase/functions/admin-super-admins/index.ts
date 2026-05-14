import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.105.4";
import { sendManagedEmail } from "../_shared/email-delivery.ts";
import { captureEdgeException } from "../_shared/observability.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, accept, x-supabase-api-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

type Action = "list" | "add" | "remove";

type Payload = {
  action?: Action;
  email?: string;
  name?: string;
  userId?: string;
  notes?: string;
};

type SystemAdminRow = {
  user_id: string;
  notes: string | null;
  created_at: string;
  created_by: string | null;
};

type UserProfile = {
  id: string;
  email: string;
  name: string | null;
  role: string | null;
  user_type: string | null;
  restaurant_id: string | null;
};

type AuthUserSummary = {
  id: string;
  email: string | null;
  created_at: string | null;
  last_sign_in_at: string | null;
  user_metadata?: Record<string, unknown>;
};

type RestaurantSummary = {
  id: string;
  name: string | null;
};

type EmployeeRow = {
  id: string;
  restaurant_id: string;
  is_active: boolean;
  user_type: string | null;
};

const MANAGER_PERMISSIONS = [
  "dashboard_view",
  "pdv_access",
  "orders_view",
  "orders_manage",
  "orders_metrics_view",
  "products_view",
  "products_manage",
  "reports_view",
  "settings_view",
  "whatsapp_manage",
  "whatsapp_manage_instances",
  "whatsapp_take_conversations",
  "whatsapp_reply_as_human",
  "whatsapp_view_all_conversations",
  "whatsapp_configure_automation",
];

const DEFAULT_SECURITY_ALERT_EMAILS = ["juniorfalcao.jc@gmail.com"];

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const normalizeName = (name?: string | null) =>
  String(name || "").trim().replace(/\s+/g, " ").slice(0, 120);

const assertEmail = (email: string) => {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Informe um e-mail válido.");
  }
};

const nameFromEmail = (email: string) => {
  const localPart = email.split("@")[0]?.replace(/[._-]+/g, " ").trim();
  return localPart || email;
};

const escapeHtml = (value: unknown) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const getSecurityAlertRecipients = () => {
  const configured = Deno.env.get("ADMIN_SECURITY_ALERT_EMAILS")
    || Deno.env.get("ADMIN_SECURITY_ALERT_EMAIL")
    || Deno.env.get("SECURITY_ALERT_EMAILS")
    || "";

  const recipients = configured
    .split(/[,\s;]+/)
    .map((email) => normalizeEmail(email))
    .filter((email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));

  return recipients.length > 0 ? Array.from(new Set(recipients)) : DEFAULT_SECURITY_ALERT_EMAILS;
};

const extractEmails = (value: unknown) => {
  if (!value || typeof value !== "object") return [];
  const record = value as Record<string, unknown>;
  const rawEmails = Array.isArray(record.emails)
    ? record.emails
    : typeof record.email === "string"
      ? [record.email]
      : [];

  return rawEmails
    .map((email) => normalizeEmail(String(email)))
    .filter((email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
};

const getConfiguredSecurityAlerts = async () => {
  const { data, error } = await admin
    .from("system_settings")
    .select("value")
    .eq("key", "admin.security_alerts")
    .maybeSingle();

  if (error) {
    console.warn("admin-super-admins security alert config lookup failed", error.message);
    return {
      enabled: true,
      recipients: getSecurityAlertRecipients(),
      source: "fallback",
    };
  }

  if (!data?.value || typeof data.value !== "object") {
    return {
      enabled: true,
      recipients: getSecurityAlertRecipients(),
      source: "fallback",
    };
  }

  const value = data.value as Record<string, unknown>;
  const enabled = value.enabled !== false;
  const dbRecipients = extractEmails(value);

  return {
    enabled,
    recipients: dbRecipients.length > 0 ? Array.from(new Set(dbRecipients)) : getSecurityAlertRecipients(),
    source: dbRecipients.length > 0 ? "system_settings" : "fallback",
  };
};

const getAuthenticatedUser = async (req: Request) => {
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) throw new Error("Usuário não autenticado");

  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) throw new Error("Usuário não autenticado");
  return data.user;
};

const assertCallerIsSuperAdmin = async (userId: string) => {
  const { data, error } = await admin.rpc("is_super_admin", { user_id: userId });
  if (error) throw error;
  if (!data) throw new Error("Apenas super administradores podem gerenciar administradores.");
};

const logAdminAction = async (
  callerId: string,
  action: string,
  targetUserId: string,
  details: Record<string, unknown>,
) => {
  const { data, error } = await admin
    .from("admin_activity_logs")
    .insert({
      user_id: callerId,
      action,
      entity_type: "system_admins",
      entity_id: targetUserId,
      details,
    })
    .select("id")
    .single();

  if (error) console.warn("admin-super-admins audit log failed", error.message);
  return data?.id as string | undefined;
};

const updateAdminActionDetails = async (logId: string | undefined, details: Record<string, unknown>) => {
  if (!logId) return;
  const { error } = await admin
    .from("admin_activity_logs")
    .update({ details })
    .eq("id", logId);

  if (error) console.warn("admin-super-admins audit log update failed", error.message);
};

const loadProfiles = async (userIds: string[]) => {
  if (userIds.length === 0) return new Map<string, UserProfile>();

  const { data, error } = await admin
    .from("users")
    .select("id, email, name, role, user_type, restaurant_id")
    .in("id", userIds);

  if (error) throw error;

  return new Map((data || []).map((profile) => [profile.id, profile as UserProfile]));
};

const loadRestaurants = async (restaurantIds: string[]) => {
  if (restaurantIds.length === 0) return new Map<string, RestaurantSummary>();

  const { data, error } = await admin
    .from("restaurants")
    .select("id, name")
    .in("id", restaurantIds);

  if (error) throw error;

  return new Map((data || []).map((restaurant) => [restaurant.id, restaurant as RestaurantSummary]));
};

const getAuthUserById = async (userId: string): Promise<AuthUserSummary | null> => {
  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error || !data.user) return null;

  return {
    id: data.user.id,
    email: data.user.email || null,
    created_at: data.user.created_at || null,
    last_sign_in_at: data.user.last_sign_in_at || null,
    user_metadata: data.user.user_metadata as Record<string, unknown> | undefined,
  };
};

const getUserIdentity = async (userId: string) => {
  const [profiles, authUser] = await Promise.all([
    loadProfiles([userId]),
    getAuthUserById(userId),
  ]);
  const profile = profiles.get(userId) || null;

  return {
    id: userId,
    email: authUser?.email || profile?.email || null,
    name: profile?.name || null,
    role: profile?.role || null,
    user_type: profile?.user_type || null,
    restaurant_id: profile?.restaurant_id || null,
  };
};

const formatIdentity = (identity: Awaited<ReturnType<typeof getUserIdentity>>) =>
  identity.name || identity.email || identity.id;

const adminActionLabel = (action: string) => {
  if (action === "grant_super_admin") return "Super admin criado";
  if (action === "revoke_super_admin") return "Super admin removido";
  return action;
};

const sendAdminSecurityAlert = async (input: {
  action: string;
  actor: Awaited<ReturnType<typeof getUserIdentity>>;
  target: Awaited<ReturnType<typeof getUserIdentity>>;
  details: Record<string, unknown>;
  logId?: string;
  recipients: string[];
}) => {
  const recipients = input.recipients;
  if (recipients.length === 0) {
    return {
      recipients,
      sent_count: 0,
      failed_count: 0,
      failures: [],
    };
  }

  const occurredAt = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
  const actionLabel = adminActionLabel(input.action);
  const subject = `[Pubfy Admin] ${actionLabel}: ${formatIdentity(input.target)}`;

  const rows = [
    ["Ação", actionLabel],
    ["Data/hora", occurredAt],
    ["Executado por", `${formatIdentity(input.actor)} (${input.actor.email || "sem e-mail"})`],
    ["ID do executor", input.actor.id],
    ["Usuário afetado", `${formatIdentity(input.target)} (${input.target.email || "sem e-mail"})`],
    ["ID afetado", input.target.id],
    ["Restaurante", input.details.restaurant_name || input.details.restaurant_id || "-"],
    ["Log ID", input.logId || "-"],
  ];

  const htmlRows = rows.map(([label, value]) => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#475569;font-weight:600">${escapeHtml(label)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#0f172a">${escapeHtml(value)}</td>
    </tr>
  `).join("");

  const html = `
    <div style="font-family:Inter,Arial,sans-serif;line-height:1.5;color:#0f172a">
      <h2 style="margin:0 0 12px">Alerta de segurança - Administração Pubfy</h2>
      <p style="margin:0 0 16px">Uma ação sensível foi executada no módulo de super administradores.</p>
      <table style="border-collapse:collapse;width:100%;max-width:760px;border:1px solid #e5e7eb">
        <tbody>${htmlRows}</tbody>
      </table>
      <p style="margin:16px 0 0;color:#64748b;font-size:13px">
        Este aviso é automático. Revise o log administrativo caso esta ação não tenha sido autorizada.
      </p>
    </div>
  `;

  const text = rows.map(([label, value]) => `${label}: ${value}`).join("\n");

  const results = await Promise.allSettled(recipients.map((recipient) =>
    sendManagedEmail({
      admin,
      emailType: "operational",
      to: recipient,
      recipientName: "Admin Pubfy",
      subject,
      html,
      text,
      contextType: "system_admins",
      contextId: input.target.id,
      metadata: {
        source: "admin_super_admins_security_alert",
        action: input.action,
        log_id: input.logId || null,
        target_user_id: input.target.id,
        actor_user_id: input.actor.id,
      },
    })
  ));

  const failed = results
    .map((result, index) => ({ result, recipient: recipients[index] }))
    .filter((item) => item.result.status === "rejected")
    .map((item) => ({
      recipient: item.recipient,
      error: item.result.status === "rejected"
        ? item.result.reason instanceof Error
          ? item.result.reason.message
          : String(item.result.reason)
        : null,
    }));

  if (failed.length > 0) {
    console.warn("admin-super-admins security alert email failed", failed);
  }

  return {
    recipients,
    sent_count: results.length - failed.length,
    failed_count: failed.length,
    failures: failed,
  };
};

const recordAdminSecurityEvent = async (
  callerId: string,
  action: "grant_super_admin" | "revoke_super_admin",
  targetUserId: string,
  details: Record<string, unknown>,
) => {
  const [actor, target] = await Promise.all([
    getUserIdentity(callerId),
    getUserIdentity(targetUserId),
  ]);
  const alertConfig = await getConfiguredSecurityAlerts();

  const enrichedDetails = {
    ...details,
    action_label: adminActionLabel(action),
    occurred_at: new Date().toISOString(),
    actor,
    target,
    email_alert: {
      status: alertConfig.enabled ? "pending" : "disabled",
      recipients: alertConfig.recipients,
      config_source: alertConfig.source,
    },
  };

  const logId = await logAdminAction(callerId, action, targetUserId, enrichedDetails);
  if (!alertConfig.enabled) return;

  try {
    const emailAlert = await sendAdminSecurityAlert({
      action,
      actor,
      target,
      details: enrichedDetails,
      logId,
      recipients: alertConfig.recipients,
    });
    await updateAdminActionDetails(logId, {
      ...enrichedDetails,
      email_alert: {
        status: emailAlert.failed_count > 0 ? "partial_failure" : "sent",
        config_source: alertConfig.source,
        ...emailAlert,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn("admin-super-admins security alert failed", message);
    await updateAdminActionDetails(logId, {
      ...enrichedDetails,
      email_alert: {
        status: "failed",
        recipients: alertConfig.recipients,
        config_source: alertConfig.source,
        error: message,
      },
    });
  }
};

const toAuthSummary = (user: {
  id: string;
  email?: string | null;
  created_at?: string | null;
  last_sign_in_at?: string | null;
  user_metadata?: Record<string, unknown>;
}): AuthUserSummary => ({
  id: user.id,
  email: user.email || null,
  created_at: user.created_at || null,
  last_sign_in_at: user.last_sign_in_at || null,
  user_metadata: user.user_metadata,
});

const findAuthUserByEmail = async (email: string): Promise<AuthUserSummary | null> => {
  const normalized = normalizeEmail(email);
  const perPage = 1000;

  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const found = data.users.find((user) => normalizeEmail(user.email || "") === normalized);
    if (found) return toAuthSummary(found);

    if (data.users.length < perPage) break;
  }

  return null;
};

const authRedirectTo = (req: Request) => {
  const configuredUrl = Deno.env.get("PUBLIC_SITE_URL") || Deno.env.get("SITE_URL");
  const origin = req.headers.get("Origin");
  const baseUrl = String(configuredUrl || origin || "").replace(/\/+$/, "");
  return baseUrl ? `${baseUrl}/reset-password` : undefined;
};

const inviteAuthUser = async (
  req: Request,
  email: string,
  name: string,
  callerId: string,
): Promise<AuthUserSummary> => {
  const redirectTo = authRedirectTo(req);
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: {
      name,
      role: "manager",
      user_type: "manager",
      invited_by: callerId,
      signup_intent: "super_admin_invite",
    },
    ...(redirectTo ? { redirectTo } : {}),
  });

  if (error) throw new Error(`Não foi possível criar o usuário no Auth: ${error.message}`);
  if (!data.user) throw new Error("Não foi possível criar o usuário no Auth.");

  return toAuthSummary(data.user);
};

const metadataName = (authUser: AuthUserSummary, fallbackEmail: string) => {
  const rawName = authUser.user_metadata?.name;
  return normalizeName(typeof rawName === "string" ? rawName : "") || nameFromEmail(fallbackEmail);
};

const getRestaurant = async (restaurantId: string): Promise<RestaurantSummary> => {
  const { data, error } = await admin
    .from("restaurants")
    .select("id, name")
    .eq("id", restaurantId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("Restaurante não encontrado para vínculo do administrador.");

  return data as RestaurantSummary;
};

const resolveCallerRestaurant = async (callerId: string): Promise<RestaurantSummary> => {
  const { data: profile, error: profileError } = await admin
    .from("users")
    .select("restaurant_id")
    .eq("id", callerId)
    .maybeSingle();

  if (profileError) throw profileError;
  if (profile?.restaurant_id) return await getRestaurant(profile.restaurant_id as string);

  const { data: ownedRestaurant, error: ownedError } = await admin
    .from("restaurants")
    .select("id, name")
    .eq("owner_id", callerId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (ownedError) throw ownedError;
  if (ownedRestaurant) return ownedRestaurant as RestaurantSummary;

  const { data: employee, error: employeeError } = await admin
    .from("employees")
    .select("restaurant_id")
    .eq("user_id", callerId)
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (employeeError) throw employeeError;
  if (employee?.restaurant_id) return await getRestaurant(employee.restaurant_id as string);

  throw new Error("Seu usuário não está vinculado a um restaurante para associar este administrador.");
};

const ensureAuthMetadata = async (
  authUser: AuthUserSummary,
  name: string,
  restaurantId: string,
  userType: string,
  role: string,
) => {
  const nextMetadata = {
    ...(authUser.user_metadata || {}),
    name,
    role,
    user_type: userType,
    restaurant_id: restaurantId,
  };

  const { error } = await admin.auth.admin.updateUserById(authUser.id, {
    user_metadata: nextMetadata,
  });

  if (error) throw error;
};

const ensureManagerPermissions = async (employeeId: string, callerId: string) => {
  const permissions = MANAGER_PERMISSIONS.map((permission) => ({
    employee_id: employeeId,
    permission,
    granted_by: callerId,
  }));

  const { error } = await admin
    .from("employee_permissions")
    .upsert(permissions, { onConflict: "employee_id,permission" });

  if (error) throw error;
};

const ensureManagerEmployee = async (
  authUser: AuthUserSummary,
  restaurant: RestaurantSummary,
  name: string,
  email: string,
  callerId: string,
) => {
  const { data: employeeRows, error: employeeRowsError } = await admin
    .from("employees")
    .select("id, restaurant_id, is_active, user_type")
    .eq("user_id", authUser.id);

  if (employeeRowsError) throw employeeRowsError;

  const employees = (employeeRows || []) as EmployeeRow[];
  const conflictingEmployee = employees.find((employee) => employee.restaurant_id !== restaurant.id);
  if (conflictingEmployee) {
    throw new Error("Este usuário já está vinculado como colaborador em outro restaurante.");
  }

  const currentEmployee = employees.find((employee) => employee.restaurant_id === restaurant.id);
  if (currentEmployee) {
    const { error } = await admin
      .from("employees")
      .update({
        employee_name: name,
        employee_email: email,
        user_type: "manager",
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", currentEmployee.id);

    if (error) throw error;
    await ensureManagerPermissions(currentEmployee.id, callerId);
    return currentEmployee.id;
  }

  const { data: employee, error } = await admin
    .from("employees")
    .insert({
      user_id: authUser.id,
      restaurant_id: restaurant.id,
      employee_name: name,
      employee_email: email,
      created_by: callerId,
      user_type: "manager",
      is_active: true,
    })
    .select("id")
    .single();

  if (error) throw error;

  await ensureManagerPermissions(employee.id as string, callerId);
  return employee.id as string;
};

const ensureRestaurantMembership = async (
  authUser: AuthUserSummary,
  restaurant: RestaurantSummary,
  callerId: string,
  requestedName?: string,
) => {
  const email = normalizeEmail(authUser.email || "");
  if (!email) throw new Error("Usuário do Auth não possui e-mail.");

  const { data: existingProfile, error: existingError } = await admin
    .from("users")
    .select("id, email, name, role, user_type, restaurant_id")
    .eq("id", authUser.id)
    .maybeSingle();

  if (existingError) throw existingError;

  const profile = existingProfile as UserProfile | null;
  if (profile?.restaurant_id && profile.restaurant_id !== restaurant.id) {
    throw new Error("Este usuário já está vinculado a outro restaurante.");
  }

  const name = normalizeName(requestedName)
    || normalizeName(profile?.name)
    || metadataName(authUser, email);

  const shouldPreserveOwner = profile?.user_type === "owner" && profile.restaurant_id === restaurant.id;
  const nextUserType = shouldPreserveOwner ? "owner" : "manager";
  const baseRole = nextUserType === "owner" ? "restaurant_owner" : "manager";

  if (profile) {
    const { error } = await admin
      .from("users")
      .update({
        email,
        name,
        restaurant_id: restaurant.id,
        user_type: nextUserType,
        role: profile.role === "super_admin" ? "super_admin" : baseRole,
        updated_at: new Date().toISOString(),
      })
      .eq("id", authUser.id);

    if (error) throw error;
  } else {
    const { error } = await admin.from("users").insert({
      id: authUser.id,
      email,
      name,
      restaurant_id: restaurant.id,
      user_type: nextUserType,
      role: baseRole,
    });

    if (error) throw error;
  }

  const employeeId = nextUserType === "manager"
    ? await ensureManagerEmployee(authUser, restaurant, name, email, callerId)
    : null;

  return {
    email,
    name,
    restaurant_id: restaurant.id,
    restaurant_name: restaurant.name,
    user_type: nextUserType,
    employee_id: employeeId,
  };
};

const setProfileSuperAdmin = async (userId: string) => {
  const { error } = await admin
    .from("users")
    .update({
      role: "super_admin",
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) throw error;
};

const roleAfterRemoval = (profile?: UserProfile | null) => {
  if (profile?.user_type === "employee") return "employee";
  if (profile?.user_type === "manager") return "manager";
  return "restaurant_owner";
};

const listAdmins = async (callerId: string) => {
  const { data, error } = await admin
    .from("system_admins")
    .select("user_id, notes, created_at, created_by")
    .order("created_at", { ascending: false });

  if (error) throw error;

  const rows = (data || []) as SystemAdminRow[];
  const userIds = Array.from(new Set(rows.flatMap((row) => [row.user_id, row.created_by]).filter(Boolean))) as string[];
  const profiles = await loadProfiles(userIds);
  const restaurantIds = Array.from(new Set(
    Array.from(profiles.values()).map((profile) => profile.restaurant_id).filter(Boolean),
  )) as string[];
  const restaurants = await loadRestaurants(restaurantIds);
  const authUsers = new Map<string, AuthUserSummary | null>();

  await Promise.all(rows.map(async (row) => {
    authUsers.set(row.user_id, await getAuthUserById(row.user_id));
  }));

  return {
    currentUserId: callerId,
    admins: rows.map((row) => {
      const profile = profiles.get(row.user_id);
      const createdByProfile = row.created_by ? profiles.get(row.created_by) : null;
      const authUser = authUsers.get(row.user_id);
      const restaurant = profile?.restaurant_id ? restaurants.get(profile.restaurant_id) : null;

      return {
        user_id: row.user_id,
        email: authUser?.email || profile?.email || null,
        name: profile?.name || null,
        role: profile?.role || null,
        user_type: profile?.user_type || null,
        restaurant_id: profile?.restaurant_id || null,
        restaurant_name: restaurant?.name || null,
        notes: row.notes,
        created_at: row.created_at,
        created_by: row.created_by,
        created_by_email: createdByProfile?.email || null,
        created_by_name: createdByProfile?.name || null,
        auth_created_at: authUser?.created_at || null,
        last_sign_in_at: authUser?.last_sign_in_at || null,
        is_current_user: row.user_id === callerId,
      };
    }),
  };
};

const addAdmin = async (req: Request, callerId: string, payload: Payload) => {
  const email = normalizeEmail(payload.email || "");
  assertEmail(email);

  const requestedName = normalizeName(payload.name);
  const restaurant = await resolveCallerRestaurant(callerId);
  let createdAuthUserId: string | null = null;
  let invited = false;

  try {
    let targetUser = await findAuthUserByEmail(email);
    if (!targetUser) {
      targetUser = await inviteAuthUser(req, email, requestedName || nameFromEmail(email), callerId);
      createdAuthUserId = targetUser.id;
      invited = true;
    }

    const { data: existing, error: existingError } = await admin
      .from("system_admins")
      .select("user_id")
      .eq("user_id", targetUser.id)
      .maybeSingle();

    if (existingError) throw existingError;
    if (existing) throw new Error("Este usuário já é super administrador.");

    const membership = await ensureRestaurantMembership(
      targetUser,
      restaurant,
      callerId,
      requestedName,
    );

    const notes = payload.notes?.trim() || null;
    const { error } = await admin.from("system_admins").insert({
      user_id: targetUser.id,
      notes,
      created_by: callerId,
    });

    if (error) throw error;

    try {
      await setProfileSuperAdmin(targetUser.id);
    } catch (profileError) {
      await admin.from("system_admins").delete().eq("user_id", targetUser.id);
      throw profileError;
    }

    try {
      await ensureAuthMetadata(
        targetUser,
        membership.name,
        membership.restaurant_id,
        membership.user_type,
        "super_admin",
      );
    } catch (metadataError) {
      console.warn("admin-super-admins auth metadata update failed", metadataError);
    }

    await recordAdminSecurityEvent(callerId, "grant_super_admin", targetUser.id, {
      email,
      name: membership.name,
      notes,
      invited,
      restaurant_id: membership.restaurant_id,
      restaurant_name: membership.restaurant_name,
      employee_id: membership.employee_id,
      user_type: membership.user_type,
    });

    return await listAdmins(callerId);
  } catch (error) {
    if (createdAuthUserId) {
      try {
        await admin.auth.admin.deleteUser(createdAuthUserId);
      } catch (cleanupError) {
        console.warn("admin-super-admins auth cleanup failed", cleanupError);
      }
    }
    throw error;
  }
};

const removeAdmin = async (callerId: string, payload: Payload) => {
  const targetUserId = payload.userId?.trim();
  if (!targetUserId) throw new Error("Administrador não informado.");
  if (targetUserId === callerId) throw new Error("Você não pode remover o próprio acesso administrativo.");

  const { count, error: countError } = await admin
    .from("system_admins")
    .select("user_id", { count: "exact", head: true });

  if (countError) throw countError;
  if ((count || 0) <= 1) throw new Error("Não é possível remover o último super administrador.");

  const profiles = await loadProfiles([targetUserId]);
  const profile = profiles.get(targetUserId);
  const nextRole = roleAfterRemoval(profile);

  const { data: removed, error } = await admin
    .from("system_admins")
    .delete()
    .eq("user_id", targetUserId)
    .select("user_id")
    .maybeSingle();

  if (error) throw error;
  if (!removed) throw new Error("Administrador não encontrado.");

  const { error: profileUpdateError } = await admin
    .from("users")
    .update({
      role: nextRole,
      updated_at: new Date().toISOString(),
    })
    .eq("id", targetUserId);

  if (profileUpdateError) throw profileUpdateError;

  const restaurant = profile?.restaurant_id ? await getRestaurant(profile.restaurant_id).catch(() => null) : null;

  await recordAdminSecurityEvent(callerId, "revoke_super_admin", targetUserId, {
    email: profile?.email || null,
    name: profile?.name || null,
    previous_role: profile?.role || null,
    next_role: nextRole,
    restaurant_id: profile?.restaurant_id || null,
    restaurant_name: restaurant?.name || null,
  });

  return await listAdmins(callerId);
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  let detectedAction: Action | undefined;
  let callerId: string | undefined;

  try {
    if (req.method !== "POST") return jsonResponse({ error: "Método não permitido" }, 405);

    const user = await getAuthenticatedUser(req);
    callerId = user.id;
    await assertCallerIsSuperAdmin(user.id);

    const payload = (await req.json().catch(() => ({}))) as Payload;
    const action = payload.action || "list";
    detectedAction = action;

    if (action === "list") return jsonResponse(await listAdmins(user.id));
    if (action === "add") return jsonResponse(await addAdmin(req, user.id, payload));
    if (action === "remove") return jsonResponse(await removeAdmin(user.id, payload));

    return jsonResponse({ error: "Ação inválida" }, 400);
  } catch (error) {
    console.error("admin-super-admins error:", error);
    await captureEdgeException(error, {
      functionName: "admin-super-admins",
      req,
      tags: { action: detectedAction || "unknown" },
      extra: { caller_id: callerId },
    });
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Erro desconhecido" },
      400,
    );
  }
});
