
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
      .single()

    if (integrationError || !integration?.is_enabled) {
      throw new Error('Integração WhatsApp não configurada ou desabilitada')
    }

    // Aqui você integraria com a API real do WhatsApp
    // Por exemplo: WhatsApp Business API, Twilio WhatsApp API, etc.
    
    // EXEMPLO DE INTEGRAÇÃO COM TWILIO (descomentear e configurar se necessário):
    /*
    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID')
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN')
    const twilioWhatsAppNumber = Deno.env.get('TWILIO_WHATSAPP_NUMBER')

    if (twilioAccountSid && twilioAuthToken && twilioWhatsAppNumber) {
      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`
      
      const twilioResponse = await fetch(twilioUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(`${twilioAccountSid}:${twilioAuthToken}`)}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          From: `whatsapp:${twilioWhatsAppNumber}`,
          To: `whatsapp:${phoneNumber}`,
          Body: message,
        }),
      })

      const twilioResult = await twilioResponse.json()
      
      if (!twilioResponse.ok) {
        throw new Error(`Erro Twilio: ${twilioResult.message}`)
      }
    }
    */

    // Atualizar status da mensagem para 'delivered' (simulação)
    const { error: updateError } = await supabaseClient
      .from('whatsapp_messages')
      .update({ status: 'delivered' })
      .eq('restaurant_id', restaurantId)
      .eq('phone_number', phoneNumber)
      .eq('content', message)
      .eq('message_type', 'outgoing')

    if (updateError) {
      console.error('Erro ao atualizar status da mensagem:', updateError)
    }

    // Simular envio bem-sucedido
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
