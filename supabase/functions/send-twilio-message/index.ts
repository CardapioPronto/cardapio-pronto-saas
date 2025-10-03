import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TwilioRequest {
  accountSid: string;
  authToken: string;
  from: string;
  to: string;
  body: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { accountSid, authToken, from, to, body }: TwilioRequest = await req.json();

    console.log('Sending Twilio message:', { from, to, bodyLength: body.length });

    // Twilio API endpoint
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

    // Prepare credentials for Basic Auth
    const credentials = btoa(`${accountSid}:${authToken}`);

    // Send message via Twilio
    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        From: from,
        To: to,
        Body: body,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Twilio API error:', errorData);
      
      return new Response(
        JSON.stringify({ 
          error: errorData.message || 'Erro ao enviar mensagem via Twilio',
          details: errorData 
        }),
        { 
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const data = await response.json();
    console.log('Message sent successfully:', data.sid);

    return new Response(
      JSON.stringify({ 
        success: true,
        messageSid: data.sid,
        status: data.status 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error in send-twilio-message function:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
