
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface WhatsAppWebhookPayload {
  from: string;
  body: string;
  timestamp: string;
  profileName?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const payload: WhatsAppWebhookPayload = await req.json()
    
    console.log('Webhook WhatsApp recebido:', payload)

    const { from, body, timestamp } = payload
    
    // Encontrar o restaurante pelo número do WhatsApp
    const { data: integration, error: integrationError } = await supabaseClient
      .from('whatsapp_integration')
      .select('restaurant_id, welcome_message, is_enabled')
      .eq('phone_number', from)
      .eq('is_enabled', true)
      .single()

    if (integrationError || !integration) {
      console.log('Número não encontrado ou integração desabilitada:', from)
      return new Response(JSON.stringify({ status: 'ignored' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      })
    }

    // Registrar mensagem recebida
    const { error: messageError } = await supabaseClient
      .from('whatsapp_messages')
      .insert({
        restaurant_id: integration.restaurant_id,
        phone_number: from,
        message_type: 'incoming',
        content: body,
        status: 'read'
      })

    if (messageError) {
      console.error('Erro ao registrar mensagem:', messageError)
    }

    // Bot básico de resposta
    let autoResponse = ''
    const lowerBody = body.toLowerCase()

    if (lowerBody.includes('oi') || lowerBody.includes('olá') || lowerBody.includes('boa')) {
      autoResponse = integration.welcome_message
    } else if (lowerBody.includes('cardápio') || lowerBody.includes('menu')) {
      autoResponse = 'Você pode ver nosso cardápio completo em nosso site ou aplicativo. Como posso ajudá-lo com seu pedido?'
    } else if (lowerBody.includes('pedido') || lowerBody.includes('pedir')) {
      autoResponse = 'Para fazer um pedido, acesse nosso sistema online ou me informe os itens que deseja. Estou aqui para ajudar!'
    } else if (lowerBody.includes('horário') || lowerBody.includes('funcionamento')) {
      autoResponse = 'Nosso horário de funcionamento é de segunda a domingo. Para informações específicas, consulte nosso site.'
    } else if (lowerBody.includes('endereço') || lowerBody.includes('local')) {
      autoResponse = 'Você pode encontrar nosso endereço e formas de contato em nosso site. Fazemos delivery na região!'
    } else {
      // Resposta padrão para outras mensagens
      autoResponse = 'Obrigado pelo contato! Em breve um de nossos atendentes irá responder. Como posso ajudá-lo hoje?'
    }

    // Enviar resposta automática se configurada
    if (autoResponse) {
      // Registrar resposta automática
      const { error: responseError } = await supabaseClient
        .from('whatsapp_messages')
        .insert({
          restaurant_id: integration.restaurant_id,
          phone_number: from,
          message_type: 'auto',
          content: autoResponse,
          status: 'sent'
        })

      if (responseError) {
        console.error('Erro ao registrar resposta automática:', responseError)
      }

      // Aqui você enviaria a resposta via API do WhatsApp
      console.log('Resposta automática enviada:', autoResponse)
    }

    return new Response(
      JSON.stringify({ 
        status: 'processed',
        autoResponse: autoResponse || null
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      },
    )

  } catch (error) {
    console.error('Erro no webhook WhatsApp:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        status: 'error'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      },
    )
  }
})
