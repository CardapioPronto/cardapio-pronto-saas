import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ALLOWED_PROVIDERS = new Set(['gemini', 'chatgpt']);

async function getUser(req: Request, supabase: ReturnType<typeof createClient>) {
  const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) return null;

  const { data } = await supabase.auth.getUser(token);
  return data.user ?? null;
}

async function canUseRestaurantAi(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  restaurantId: string,
) {
  const { data: isSuperAdmin } = await supabase.rpc('is_super_admin', { user_id: userId });
  if (isSuperAdmin) return true;

  const { data: profile } = await supabase
    .from('users')
    .select('restaurant_id, user_type')
    .eq('id', userId)
    .maybeSingle();

  if (profile?.restaurant_id !== restaurantId) return false;
  if (profile?.user_type === 'owner') return true;

  const { data: employee } = await supabase
    .from('employees')
    .select('id, user_type')
    .eq('user_id', userId)
    .eq('restaurant_id', restaurantId)
    .eq('is_active', true)
    .maybeSingle();

  if (!employee?.id) return false;
  if (employee.user_type === 'manager') return true;

  const { data: permission } = await supabase
    .from('employee_permissions')
    .select('permission')
    .eq('employee_id', employee.id)
    .in('permission', ['whatsapp_configure_automation', 'whatsapp_manage'])
    .limit(1)
    .maybeSingle();

  return !!permission;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, provider, restaurantId } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const user = await getUser(req, supabase);
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Usuário não autenticado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (!restaurantId || !(await canUseRestaurantAi(supabase, user.id, restaurantId))) {
      return new Response(
        JSON.stringify({ error: 'Sem permissão para gerar respostas deste restaurante' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (!ALLOWED_PROVIDERS.has(provider)) {
      return new Response(
        JSON.stringify({ error: 'Provedor de IA inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (!String(message || '').trim() || String(message).length > 4000) {
      return new Response(
        JSON.stringify({ error: 'Mensagem inválida' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Get restaurant info and AI settings
    const { data: integration } = await supabase
      .from('whatsapp_integration')
      .select('ai_system_prompt')
      .eq('restaurant_id', restaurantId)
      .single();

    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('name, address')
      .eq('id', restaurantId)
      .single();

    const systemPrompt = integration?.ai_system_prompt || 
      `Você é um assistente virtual do restaurante ${restaurant?.name || 'nosso restaurante'}. 
      Seja cordial, útil e responda perguntas sobre o cardápio, horários e pedidos.
      Endereço: ${restaurant?.address || 'não informado'}`;

    let response = '';

    if (provider === 'gemini') {
      // Use Lovable AI Gateway com Gemini
      const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
      
      if (!LOVABLE_API_KEY) {
        throw new Error('LOVABLE_API_KEY not configured');
      }

      const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: message }
          ],
          temperature: 0.7,
          max_tokens: 500
        }),
      });

      if (!aiResponse.ok) {
        throw new Error(`AI Gateway error: ${aiResponse.status}`);
      }

      const data = await aiResponse.json();
      response = data.choices[0].message.content;

    } else if (provider === 'chatgpt') {
      // Use OpenAI directly
      const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
      
      if (!OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY not configured');
      }

      const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: message }
          ],
          temperature: 0.7,
          max_tokens: 500
        }),
      });

      if (!aiResponse.ok) {
        throw new Error(`OpenAI error: ${aiResponse.status}`);
      }

      const data = await aiResponse.json();
      response = data.choices[0].message.content;
    }

    return new Response(
      JSON.stringify({ response }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating AI response:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
