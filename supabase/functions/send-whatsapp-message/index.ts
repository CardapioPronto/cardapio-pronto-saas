
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface WhatsAppRequest {
  restaurantId: string;
  phoneNumber: string;
  message: string;
  orderId?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    )

    const { restaurantId, phoneNumber, message, orderId }: WhatsAppRequest = await req.json()

    console.log('Enviando mensagem WhatsApp:', {
      restaurantId,
      phoneNumber: phoneNumber.substring(0, 8) + '***', // Log parcial por segurança
      message,
      orderId
    })

    // Buscar configurações do WhatsApp do restaurante
    const { data: integration, error: integrationError } = await supabaseClient
      .from('whatsapp_integration')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .maybeSingle()

    console.log('Integração encontrada:', integration)
    console.log('Erro da integração:', integrationError)

    if (integrationError) {
      console.error('Erro ao buscar integração:', integrationError)
      throw new Error(`Erro ao buscar integração: ${integrationError.message}`)
    }

    if (!integration) {
      console.log('Criando configuração padrão do WhatsApp...')
      // Se não existe integração, criar uma básica
      const { data: newIntegration, error: createError } = await supabaseClient
        .from('whatsapp_integration')
        .insert({
          restaurant_id: restaurantId,
          phone_number: phoneNumber,
          is_enabled: true,
          auto_send_orders: true,
          welcome_message: 'Olá! Bem-vindo ao nosso restaurante.',
          order_confirmation_message: 'Seu pedido foi recebido e está sendo preparado!'
        })
        .select()
        .single()

      if (createError) {
        console.error('Erro ao criar integração:', createError)
        throw new Error(`Erro ao criar integração: ${createError.message}`)
      }

      console.log('Nova integração criada:', newIntegration)
    }

    // Registrar a mensagem no histórico
    const { error: logError } = await supabaseClient
      .from('whatsapp_messages')
      .insert({
        restaurant_id: restaurantId,
        order_id: orderId || null,
        phone_number: phoneNumber,
        message_type: 'outgoing',
        content: message,
        status: 'sent'
      })

    if (logError) {
      console.error('Erro ao registrar mensagem:', logError)
    }

    // Simular envio bem-sucedido (aqui você integraria com API real do WhatsApp)
    console.log('Mensagem WhatsApp enviada com sucesso!')

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Mensagem enviada com sucesso',
        messageId: `msg_${Date.now()}`
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      },
    )

  } catch (error) {
    console.error('Erro ao enviar mensagem WhatsApp:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      },
    )
  }
})
