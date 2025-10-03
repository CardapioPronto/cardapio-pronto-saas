import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse form data from Twilio webhook
    const formData = await req.formData();
    const from = formData.get('From') as string;
    const body = formData.get('Body') as string;
    const messageSid = formData.get('MessageSid') as string;

    console.log('Received Twilio webhook:', { from, body, messageSid });

    // Find restaurant by phone number
    const { data: integration } = await supabase
      .from('whatsapp_integration')
      .select('restaurant_id, ai_enabled, ai_provider, n8n_webhook_url, n8n_enabled')
      .eq('twilio_phone_number', formData.get('To'))
      .single();

    if (!integration) {
      console.log('No integration found for this number');
      return new Response('OK', { headers: corsHeaders });
    }

    // Log incoming message
    await supabase.from('whatsapp_messages').insert({
      restaurant_id: integration.restaurant_id,
      phone_number: from,
      message_type: 'incoming',
      content: body,
      status: 'delivered'
    });

    // Forward to n8n if enabled
    if (integration.n8n_enabled && integration.n8n_webhook_url) {
      console.log('Forwarding to n8n:', integration.n8n_webhook_url);
      
      try {
        await fetch(integration.n8n_webhook_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from,
            body,
            messageSid,
            restaurantId: integration.restaurant_id,
            timestamp: new Date().toISOString()
          })
        });
      } catch (n8nError) {
        console.error('Error forwarding to n8n:', n8nError);
      }
    }

    // Generate AI response if enabled
    if (integration.ai_enabled && integration.ai_provider) {
      console.log('Generating AI response with:', integration.ai_provider);
      
      try {
        const aiResponse = await supabase.functions.invoke('generate-ai-response', {
          body: {
            message: body,
            provider: integration.ai_provider,
            restaurantId: integration.restaurant_id
          }
        });

        if (aiResponse.data?.response) {
          // Log AI response
          await supabase.from('whatsapp_messages').insert({
            restaurant_id: integration.restaurant_id,
            phone_number: from,
            message_type: 'auto',
            content: aiResponse.data.response,
            status: 'sent'
          });

          // Return TwiML response
          const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${aiResponse.data.response}</Message>
</Response>`;

          return new Response(twiml, {
            headers: { ...corsHeaders, 'Content-Type': 'application/xml' }
          });
        }
      } catch (aiError) {
        console.error('Error generating AI response:', aiError);
      }
    }

    return new Response('OK', { headers: corsHeaders });
  } catch (error) {
    console.error('Error in twilio-webhook:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
