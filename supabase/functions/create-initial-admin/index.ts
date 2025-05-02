
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.23.0";

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
    console.log("Creating initial admin");
    
    // Create Supabase client with service role key
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    
    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing Supabase URL or service role key");
      throw new Error("Configuração incorreta: SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não estão definidos");
    }
    
    const supabaseClient = createClient(supabaseUrl, supabaseKey);

    // Check if we already have any super admins
    console.log("Checking if super admins already exist");
    const { data: admins, error: adminCheckError } = await supabaseClient
      .from('system_admins')
      .select('user_id')
      .limit(1);

    if (adminCheckError) {
      console.error("Error checking super admins:", adminCheckError);
      throw new Error(`Erro ao verificar super admins: ${adminCheckError.message}`);
    }

    if (admins && admins.length > 0) {
      console.log("Super admins already exist:", admins.length);
    } else {
      console.log("No super admins found, proceeding to create one");
    }

    // Set up the admin credentials
    const email = 'juniorfalcao.jc@gmail.com';
    const password = 'jrfalcao@123456';
    
    // Create user if one doesn't exist
    console.log("Checking if user already exists:", email);
    const { data: existingUsers, error: findError } = await supabaseClient.auth.admin.listUsers();
    
    if (findError) {
      console.error("Error listing users:", findError);
      throw new Error(`Erro ao verificar usuários existentes: ${findError.message}`);
    }
    
    // Check if user already exists
    const existingUser = existingUsers?.users?.find(
      (user: any) => user?.email?.toLowerCase() === email.toLowerCase()
    );
    
    let userId = existingUser?.id;
    console.log("Existing user check:", existingUser ? "Found" : "Not found", userId);
    
    // If user doesn't exist, create them
    if (!userId) {
      console.log("Creating new user:", email);
      const { data: userData, error: userError } = await supabaseClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          role: 'super_admin'
        }
      });
      
      if (userError) {
        console.error("Error creating user:", userError);
        throw new Error(`Erro ao criar usuário: ${userError.message}`);
      }
      
      userId = userData.user.id;
      console.log(`Usuário criado com sucesso. ID: ${userId}`);
    } else {
      console.log(`Usuário já existe. ID: ${userId}`);
      
      // Update the user's metadata to ensure they have the super_admin role
      console.log("Updating user metadata with super_admin role");
      const { error: updateError } = await supabaseClient.auth.admin.updateUserById(
        userId,
        { user_metadata: { role: 'super_admin' } }
      );
      
      if (updateError) {
        console.error("Error updating user metadata:", updateError);
        throw new Error(`Erro ao atualizar metadados do usuário: ${updateError.message}`);
      }
    }
    
    // Check if user is already a super admin
    console.log("Checking if user is already a super admin");
    const { data: existingAdmin, error: checkAdminError } = await supabaseClient
      .from('system_admins')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (checkAdminError) {
      console.error("Error checking admin status:", checkAdminError);
      throw new Error(`Erro ao verificar status de admin: ${checkAdminError.message}`);
    }
    
    // If not already an admin, add to system_admins
    if (!existingAdmin) {
      console.log("Adding user to system_admins table");
      const { error: adminError } = await supabaseClient
        .from('system_admins')
        .insert({
          user_id: userId,
          notes: 'Admin inicial do sistema'
        });
      
      if (adminError) {
        console.error("Error adding super admin:", adminError);
        throw new Error(`Erro ao adicionar super admin: ${adminError.message}`);
      }
      
      console.log(`Usuário adicionado como super admin com sucesso!`);
      
      // Log the action
      try {
        console.log("Logging admin activity");
        await supabaseClient.rpc('log_admin_activity', {
          admin_id: userId,
          action: 'create_initial_admin',
          entity_type: 'system_admins',
          entity_id: userId,
          details: { email }
        });
      } catch (logError) {
        console.error("Error logging admin activity (non-critical):", logError);
      }
    } else {
      console.log(`Usuário já é um super admin.`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Super Admin criado com sucesso",
        user: { id: userId, email: email }
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error creating initial admin:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
