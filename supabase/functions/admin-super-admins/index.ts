import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.105.4";
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
  const { error } = await admin.from("admin_activity_logs").insert({
    user_id: callerId,
    action,
    entity_type: "system_admins",
    entity_id: targetUserId,
    details,
  });

  if (error) console.warn("admin-super-admins audit log failed", error.message);
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

    await logAdminAction(callerId, "grant_super_admin", targetUser.id, {
      email,
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

  await logAdminAction(callerId, "revoke_super_admin", targetUserId, {
    previous_role: profile?.role || null,
    next_role: nextRole,
    restaurant_id: profile?.restaurant_id || null,
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
