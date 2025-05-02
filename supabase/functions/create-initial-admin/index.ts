
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
  
  // Get the authorization header - this function should be authorized
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: "Não autorizado" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    // Check if we already have any super admins
    const { data: admins, error: adminCheckError } = await supabaseClient
      .from('system_admins')
      .select('user_id')
      .limit(1);

    if (adminCheckError) {
      throw new Error(`Erro ao verificar super admins: ${adminCheckError.message}`);
    }

    if (admins && admins.length > 0) {
      return new Response(
        JSON.stringify({ message: "Já existe pelo menos um super admin cadastrado" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create the initial admin user
    const email = 'juniorfalcao.jc@gmail.com';
    const password = 'jrfalcao@123456';
    
    const { data: userData, error: userError } = await supabaseClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        role: 'super_admin'
      }
    });
    
    if (userError) {
      throw new Error(`Erro ao criar usuário: ${userError.message}`);
    }
    
    if (!userData.user) {
      throw new Error("Dados do usuário não retornados após criação");
    }

    // Add to system_admins table
    const { error: adminError } = await supabaseClient
      .from('system_admins')
      .insert({
        user_id: userData.user.id,
        notes: 'Admin inicial do sistema'
      });
    
    if (adminError) {
      throw new Error(`Erro ao adicionar super admin: ${adminError.message}`);
    }

    // Log the action
    await supabaseClient.rpc('log_admin_activity', {
      admin_id: userData.user.id,
      action: 'create_initial_admin',
      entity_type: 'system_admins',
      entity_id: userData.user.id,
      details: { email }
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Super Admin inicial criado com sucesso",
        user: { id: userData.user.id, email: userData.user.email }
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
