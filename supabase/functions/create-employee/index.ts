import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createLogger } from "../_shared/logger.ts";
import { captureEdgeException } from "../_shared/observability.ts";

const logger = createLogger("create-employee");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const VALID_PERMISSIONS = new Set([
  "dashboard_view",
  "subscription_view",
  "pdv_access",
  "orders_view",
  "orders_manage",
  "orders_metrics_view",
  "products_view",
  "products_manage",
  "reports_view",
  "settings_view",
  "settings_manage",
  "settings_establishment_manage",
  "settings_system_manage",
  "settings_integrations_manage",
  "settings_audit_view",
  "employees_manage",
  "whatsapp_manage",
  "whatsapp_manage_instances",
  "whatsapp_take_conversations",
  "whatsapp_reply_as_human",
  "whatsapp_view_all_conversations",
  "whatsapp_configure_automation",
]);

const MANAGER_GRANTABLE_PERMISSIONS = new Set([
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
]);

interface EmployeeRequest {
  employee_name?: string;
  employee_email?: string;
  password?: string;
  restaurant_id?: string;
  permissions?: string[];
  user_type?: "employee" | "manager";
}

interface CallerAccess {
  allowed: boolean;
  isOwnerOrAdmin: boolean;
  grantablePermissions: Set<string>;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizeEmail(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function normalizeName(value: unknown) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

function uniqueValidPermissions(permissions: unknown): string[] {
  if (!Array.isArray(permissions)) return [];
  return [...new Set(permissions.map((p) => String(p)).filter((p) => VALID_PERMISSIONS.has(p)))];
}

async function findAuthUserByEmail(
  supabaseAdmin: ReturnType<typeof createClient>,
  email: string,
) {
  let page = 1;
  const perPage = 1000;

  while (page <= 20) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const users = data?.users ?? [];
    const match = users.find((user) => user.email?.toLowerCase() === email);
    if (match) return match;
    if (users.length < perPage) break;
    page += 1;
  }

  return null;
}

async function getCaller(req: Request, supabaseAdmin: ReturnType<typeof createClient>) {
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return null;

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) return null;

  return data.user;
}

async function getCallerAccess(
  supabaseAdmin: ReturnType<typeof createClient>,
  userId: string,
  restaurantId: string,
): Promise<CallerAccess> {
  const { data: isSuperAdmin } = await supabaseAdmin.rpc("is_super_admin", { user_id: userId });

  if (isSuperAdmin) {
    return {
      allowed: true,
      isOwnerOrAdmin: true,
      grantablePermissions: new Set(VALID_PERMISSIONS),
    };
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("users")
    .select("id, restaurant_id, user_type")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) throw profileError;

  if (profile?.restaurant_id !== restaurantId) {
    return { allowed: false, isOwnerOrAdmin: false, grantablePermissions: new Set() };
  }

  if (profile?.user_type === "owner") {
    return {
      allowed: true,
      isOwnerOrAdmin: true,
      grantablePermissions: new Set(VALID_PERMISSIONS),
    };
  }

  const { data: employee, error: employeeError } = await supabaseAdmin
    .from("employees")
    .select("id, user_type")
    .eq("user_id", userId)
    .eq("restaurant_id", restaurantId)
    .eq("is_active", true)
    .maybeSingle();

  if (employeeError) throw employeeError;
  if (!employee?.id) {
    return { allowed: false, isOwnerOrAdmin: false, grantablePermissions: new Set() };
  }

  const { data: permissionRows, error: permissionsError } = await supabaseAdmin
    .from("employee_permissions")
    .select("permission")
    .eq("employee_id", employee.id);

  if (permissionsError) throw permissionsError;

  const callerPermissions: Set<string> = new Set(
    (permissionRows ?? []).map((row) => String(row.permission)),
  );
  const canManageEmployees = employee.user_type === "manager" || callerPermissions.has("employees_manage");

  if (!canManageEmployees) {
    return { allowed: false, isOwnerOrAdmin: false, grantablePermissions: new Set() };
  }

  const grantablePermissions: Set<string> = employee.user_type === "manager"
    ? new Set([...MANAGER_GRANTABLE_PERMISSIONS].filter((p) => VALID_PERMISSIONS.has(p)))
    : new Set([...callerPermissions].filter((p) => MANAGER_GRANTABLE_PERMISSIONS.has(p)));

  return {
    allowed: true,
    isOwnerOrAdmin: false,
    grantablePermissions,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ success: false, error: "Method not allowed" }, 405);

  let createdAuthUserId: string | null = null;

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const caller = await getCaller(req, supabaseAdmin);
    if (!caller) return json({ success: false, error: "Usuário não autenticado" }, 401);

    const body = (await req.json()) as EmployeeRequest;
    const employeeName = normalizeName(body.employee_name);
    const employeeEmail = normalizeEmail(body.employee_email);
    const password = String(body.password ?? "");
    const requestedRestaurantId = String(body.restaurant_id ?? "").trim();
    const requestedPermissions = uniqueValidPermissions(body.permissions);

    if (!employeeName) return json({ success: false, error: "Nome do funcionário é obrigatório" }, 400);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(employeeEmail)) {
      return json({ success: false, error: "E-mail do funcionário inválido" }, 400);
    }
    if (!requestedRestaurantId) {
      return json({ success: false, error: "Restaurante não informado" }, 400);
    }

    const access = await getCallerAccess(supabaseAdmin, caller.id, requestedRestaurantId);
    if (!access.allowed) {
      logger.warn("Unauthorized employee creation attempt", {
        callerId: caller.id,
        restaurant_id: requestedRestaurantId,
      });
      return json({ success: false, error: "Sem permissão para criar funcionários neste restaurante" }, 403);
    }

    const ungrantable = requestedPermissions.filter((permission) => !access.grantablePermissions.has(permission));
    if (ungrantable.length > 0) {
      return json({
        success: false,
        error: "Você não pode conceder uma ou mais permissões solicitadas",
        denied_permissions: ungrantable,
      }, 403);
    }

    const userType: "employee" | "manager" =
      access.isOwnerOrAdmin && body.user_type === "manager" ? "manager" : "employee";

    logger.info("Creating employee", {
      employee_email: employeeEmail,
      restaurant_id: requestedRestaurantId,
      userType,
      callerId: caller.id,
    });

    const { data: existingUserByEmail, error: userByEmailError } = await supabaseAdmin
      .from("users")
      .select("id")
      .ilike("email", employeeEmail)
      .limit(1)
      .maybeSingle();

    if (userByEmailError) throw userByEmailError;

    const existingAuthUser = existingUserByEmail?.id
      ? { id: existingUserByEmail.id }
      : await findAuthUserByEmail(supabaseAdmin, employeeEmail);

    let authUserId: string;

    if (existingAuthUser) {
      authUserId = existingAuthUser.id;

      const { data: existingEmployee, error: employeeCheckError } = await supabaseAdmin
        .from("employees")
        .select("id")
        .eq("user_id", authUserId)
        .eq("restaurant_id", requestedRestaurantId)
        .maybeSingle();

      if (employeeCheckError) throw employeeCheckError;
      if (existingEmployee) {
        return json({ success: false, error: "Este usuário já é funcionário deste restaurante" }, 409);
      }
    } else {
      if (password.length < 8) {
        return json({ success: false, error: "A senha deve ter pelo menos 8 caracteres" }, 400);
      }

      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: employeeEmail,
        password,
        email_confirm: true,
        user_metadata: {
          name: employeeName,
          user_type: userType,
        },
      });

      if (authError) {
        logger.error("Failed to create auth user", new Error(authError.message), { employee_email: employeeEmail });
        return json({ success: false, error: authError.message }, 400);
      }
      if (!authData.user) return json({ success: false, error: "Falha ao criar usuário" }, 400);

      authUserId = authData.user.id;
      createdAuthUserId = authUserId;
    }

    const { data: existingUserRecord, error: userCheckError } = await supabaseAdmin
      .from("users")
      .select("id, restaurant_id")
      .eq("id", authUserId)
      .maybeSingle();

    if (userCheckError) throw userCheckError;

    if (
      existingUserRecord?.restaurant_id &&
      existingUserRecord.restaurant_id !== requestedRestaurantId
    ) {
      return json({
        success: false,
        error: "Este usuário já está vinculado a outro restaurante",
      }, 409);
    }

    if (!existingUserRecord) {
      const { error: userError } = await supabaseAdmin
        .from("users")
        .insert({
          id: authUserId,
          email: employeeEmail,
          name: employeeName,
          restaurant_id: requestedRestaurantId,
          user_type: userType,
          role: userType,
        });

      if (userError) throw userError;
    } else {
      const { error: updateError } = await supabaseAdmin
        .from("users")
        .update({
          name: employeeName,
          restaurant_id: requestedRestaurantId,
          user_type: userType,
          role: userType,
        })
        .eq("id", authUserId);

      if (updateError) throw updateError;
    }

    const { data: employeeRecord, error: employeeError } = await supabaseAdmin
      .from("employees")
      .insert({
        user_id: authUserId,
        restaurant_id: requestedRestaurantId,
        employee_name: employeeName,
        employee_email: employeeEmail,
        created_by: caller.id,
        user_type: userType,
      })
      .select()
      .single();

    if (employeeError) throw employeeError;

    if (requestedPermissions.length > 0) {
      const permissionsToInsert = requestedPermissions.map((permission) => ({
        employee_id: employeeRecord.id,
        permission,
        granted_by: caller.id,
      }));

      const { error: permissionsError } = await supabaseAdmin
        .from("employee_permissions")
        .insert(permissionsToInsert);

      if (permissionsError) throw permissionsError;
    }

    logger.info("Employee created successfully", {
      employeeId: employeeRecord.id,
      restaurant_id: requestedRestaurantId,
      callerId: caller.id,
    });

    return json({ success: true, employee: employeeRecord });
  } catch (error) {
    if (createdAuthUserId) {
      try {
        const supabaseAdmin = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
          { auth: { autoRefreshToken: false, persistSession: false } },
        );
        await supabaseAdmin.auth.admin.deleteUser(createdAuthUserId);
      } catch (cleanupError) {
        logger.warn("Failed to cleanup auth user after employee creation error", {
          authUserId: createdAuthUserId,
          error: cleanupError instanceof Error ? cleanupError.message : String(cleanupError),
        });
      }
    }

    logger.error("Unhandled employee creation error", error as Error);
    await captureEdgeException(error, {
      functionName: "create-employee",
      req,
      extra: { createdAuthUserId },
    });
    return json({ success: false, error: "Erro interno do servidor" }, 500);
  }
});
