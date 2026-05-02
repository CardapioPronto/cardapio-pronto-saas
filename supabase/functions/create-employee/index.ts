
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createLogger } from "../_shared/logger.ts";

const logger = createLogger("create-employee");

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmployeeRequest {
  employee_name: string;
  employee_email: string;
  password: string;
  restaurant_id: string;
  created_by: string;
  permissions: string[];
  user_type?: 'employee' | 'manager';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { employee_name, employee_email, password, restaurant_id, created_by, permissions, user_type: requestedType } = await req.json() as EmployeeRequest;
    const userType: 'employee' | 'manager' = requestedType === 'manager' ? 'manager' : 'employee';

    logger.info('Creating employee', { employee_email, restaurant_id, userType });

    // Verificar se o email já existe
    const { data: existingUser, error: checkError } = await supabaseClient.auth.admin.listUsers();
    
    if (checkError) {
      logger.error('Failed to list auth users', new Error(checkError.message), { restaurant_id });
      return new Response(
        JSON.stringify({ success: false, error: checkError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userExists = existingUser?.users?.find(user => user.email === employee_email);
    let authUserId: string;

    if (userExists) {
      logger.info('Auth user already exists', { authUserId: userExists.id, restaurant_id });
      authUserId = userExists.id;
      
      // Verificar se já existe um funcionário com este user_id
      const { data: existingEmployee, error: employeeCheckError } = await supabaseClient
        .from('employees')
        .select('id')
        .eq('user_id', authUserId)
        .eq('restaurant_id', restaurant_id)
        .maybeSingle();

      if (employeeCheckError) {
        logger.error('Failed to check existing employee', new Error(employeeCheckError.message), { authUserId, restaurant_id });
        return new Response(
          JSON.stringify({ success: false, error: employeeCheckError.message }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (existingEmployee) {
        return new Response(
          JSON.stringify({ success: false, error: 'Este usuário já é funcionário deste restaurante' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      // Criar usuário no auth usando service role
      const { data: authData, error: authError } = await supabaseClient.auth.admin.createUser({
        email: employee_email,
        password: password,
        email_confirm: true,
        user_metadata: {
          name: employee_name,
          user_type: userType
        }
      });

      if (authError) {
        logger.error('Failed to create auth user', new Error(authError.message), { employee_email, restaurant_id });
        return new Response(
          JSON.stringify({ success: false, error: authError.message }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!authData.user) {
        return new Response(
          JSON.stringify({ success: false, error: 'Falha ao criar usuário' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      authUserId = authData.user.id;
      logger.info('Created new auth user', { authUserId, restaurant_id });
    }

    // Verificar se já existe um registro na tabela users
    const { data: existingUserRecord, error: userCheckError } = await supabaseClient
      .from('users')
      .select('id')
      .eq('id', authUserId)
      .maybeSingle();

    if (userCheckError) {
      logger.error('Failed to check user profile', new Error(userCheckError.message), { authUserId, restaurant_id });
      return new Response(
        JSON.stringify({ success: false, error: userCheckError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Criar ou atualizar registro na tabela users
    if (!existingUserRecord) {
      const { error: userError } = await supabaseClient
        .from('users')
        .insert({
          id: authUserId,
          email: employee_email,
          name: employee_name,
          restaurant_id: restaurant_id,
          user_type: userType,
          role: userType
        });

      if (userError) {
        logger.error('Failed to create user profile', new Error(userError.message), { authUserId, restaurant_id });
        return new Response(
          JSON.stringify({ success: false, error: userError.message }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      // Atualizar registro existente para garantir dados corretos
      const { error: updateError } = await supabaseClient
        .from('users')
        .update({
          restaurant_id: restaurant_id,
          user_type: userType,
          role: userType
        })
        .eq('id', authUserId);

      if (updateError) {
        logger.error('Failed to update user profile', new Error(updateError.message), { authUserId, restaurant_id });
        return new Response(
          JSON.stringify({ success: false, error: updateError.message }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Criar registro do funcionário
    const { data: employeeRecord, error: employeeError } = await supabaseClient
      .from('employees')
      .insert({
        user_id: authUserId,
        restaurant_id: restaurant_id,
        employee_name: employee_name,
        employee_email: employee_email,
        created_by: created_by,
        user_type: userType
      })
      .select()
      .single();

    if (employeeError) {
      logger.error('Failed to create employee record', new Error(employeeError.message), { authUserId, restaurant_id });
      return new Response(
        JSON.stringify({ success: false, error: employeeError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Criar permissões
    if (permissions && permissions.length > 0) {
      const permissionsToInsert = permissions.map(permission => ({
        employee_id: employeeRecord.id,
        permission,
        granted_by: created_by
      }));

      const { error: permissionsError } = await supabaseClient
        .from('employee_permissions')
        .insert(permissionsToInsert);

      if (permissionsError) {
        logger.error('Failed to create employee permissions', new Error(permissionsError.message), { employeeId: employeeRecord.id, restaurant_id });
        return new Response(
          JSON.stringify({ success: false, error: permissionsError.message }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    logger.info('Employee created successfully', { employeeId: employeeRecord.id, restaurant_id });

    return new Response(
      JSON.stringify({ success: true, employee: employeeRecord }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    logger.error('Unhandled employee creation error', error as Error);
    return new Response(
      JSON.stringify({ success: false, error: 'Erro interno do servidor' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
