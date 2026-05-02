
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.23.0";
import { createLogger } from "../_shared/logger.ts";

const logger = createLogger("create-initial-admin");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    logger.info("Starting initial admin setup");
    
    // Create Supabase client with service role key
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    
    if (!supabaseUrl || !supabaseKey) {
      logger.error("Missing required environment variables", new Error("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not configured"));
      throw new Error("Configuração incorreta: SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não estão definidos");
    }
    
    const supabaseClient = createClient(supabaseUrl, supabaseKey);

    // Check if we already have any super admins
    logger.debug("Checking existing super admins");
    const { data: admins, error: adminCheckError } = await supabaseClient
      .from('system_admins')
      .select('user_id')
      .limit(1);

    if (adminCheckError) {
      logger.error("Failed to check super admins", new Error(adminCheckError.message));
      throw new Error(`Erro ao verificar super admins: ${adminCheckError.message}`);
    }

    if (admins && admins.length > 0) {
      logger.info("Super admins already exist", { adminCount: admins.length });
    } else {
      logger.info("No super admins found, proceeding to create initial admin");
    }

    // Set up the admin credentials
    const email = 'juniorfalcao.jc@gmail.com';
    
    // Create user if one doesn't exist
    logger.debug("Checking if user exists", { email });
    const { data: existingUsers, error: findError } = await supabaseClient.auth.admin.listUsers();
    
    if (findError) {
      logger.error("Failed to list users", new Error(findError.message));
      throw new Error(`Erro ao verificar usuários existentes: ${findError.message}`);
    }
    
    // Check if user already exists
    const existingUser = existingUsers?.users?.find(
      (user: { email?: string | null }) => user?.email?.toLowerCase() === email.toLowerCase()
    );
    
    let userId = existingUser?.id;
    logger.debug("User check result", { userExists: !!existingUser, userId });
    
    // If user doesn't exist, create them
    if (!userId) {
      logger.info("Creating new admin user", { email });
      const { data: userData, error: userError } = await supabaseClient.auth.admin.createUser({
        email,
        password: 'jrfalcao@123456',
        email_confirm: true,
        user_metadata: {
          role: 'super_admin'
        }
      });
      
      if (userError) {
        logger.error("Failed to create user", new Error(userError.message), { email });
        throw new Error(`Erro ao criar usuário: ${userError.message}`);
      }
      
      userId = userData.user.id;
      logger.info("New admin user created successfully", { userId, email });
    } else {
      logger.info("Admin user already exists", { userId, email });
      
      // Update the user's metadata to ensure they have the super_admin role
      logger.debug("Updating user metadata with super_admin role", { userId });
      const { error: updateError } = await supabaseClient.auth.admin.updateUserById(
        userId,
        { user_metadata: { role: 'super_admin' } }
      );
      
      if (updateError) {
        logger.error("Failed to update user metadata", new Error(updateError.message), { userId });
        throw new Error(`Erro ao atualizar metadados do usuário: ${updateError.message}`);
      }
    }
    
    // Check if user is already a super admin
    logger.debug("Checking if user is system admin", { userId });
    const { data: existingAdmin, error: checkAdminError } = await supabaseClient
      .from('system_admins')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (checkAdminError) {
      logger.error("Failed to check admin status", new Error(checkAdminError.message), { userId });
      throw new Error(`Erro ao verificar status de admin: ${checkAdminError.message}`);
    }
    
    // If not already an admin, add to system_admins
    if (!existingAdmin) {
      logger.info("Adding user to system_admins", { userId });
      const { error: adminError } = await supabaseClient
        .from('system_admins')
        .insert({
          user_id: userId,
          notes: 'Admin inicial do sistema'
        });
      
      if (adminError) {
        logger.error("Failed to add super admin", new Error(adminError.message), { userId });
        throw new Error(`Erro ao adicionar super admin: ${adminError.message}`);
      }
      
      logger.info("User added as super admin successfully", { userId });
      
      // Log the action
      try {
        logger.debug("Logging admin activity");
        await supabaseClient.rpc('log_admin_activity', {
          admin_id: userId,
          action: 'create_initial_admin',
          entity_type: 'system_admins',
          entity_id: userId,
          details: { email }
        });
      } catch (logError) {
        logger.warn("Failed to log admin activity (non-critical)", { error: String(logError) });
      }
    } else {
      logger.info("User is already a super admin", { userId });
    }

    logger.info("Initial admin setup completed successfully", { userId });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Super Admin criado com sucesso",
        user: { id: userId, email: email }
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    logger.error("Initial admin setup failed", error as Error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
