import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { createLogger } from "../_shared/logger.ts";

const logger = createLogger("evolution-api");

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const EVOLUTION_API_URL = Deno.env.get('EVOLUTION_API_URL');
const EVOLUTION_API_KEY = Deno.env.get('EVOLUTION_API_KEY');
const N8N_WEBHOOK_URL = Deno.env.get('N8N_WEBHOOK_URL');

interface EvolutionRequest {
  action: 'create_instance' | 'connect' | 'get_qrcode' | 'disconnect' | 'delete_instance' | 'get_status' | 'set_webhook';
  instanceName: string;
  restaurantId: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, instanceName, restaurantId }: EvolutionRequest = await req.json();

    logger.info("Evolution API action", { action, instanceName, restaurantId });

    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
      logger.error('Missing Evolution API environment variables', new Error('EVOLUTION_API_URL or EVOLUTION_API_KEY missing'), { 
        hasUrl: !!EVOLUTION_API_URL, 
        hasKey: !!EVOLUTION_API_KEY,
      });
      throw new Error('Evolution API não configurada. Verifique EVOLUTION_API_URL e EVOLUTION_API_KEY.');
    }

    // Validate that EVOLUTION_API_URL looks like a URL
    const baseUrl = EVOLUTION_API_URL.replace(/\/+$/, '');
    if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
      throw new Error(`EVOLUTION_API_URL inválida: deve começar com http:// ou https://. Valor atual: ${baseUrl.substring(0, 30)}`);
    }

    const headers = {
      'Content-Type': 'application/json',
      'apikey': EVOLUTION_API_KEY,
    };

    let response;
    let result;

    switch (action) {
      case 'create_instance': {
        const createUrl = `${baseUrl}/instance/create`;
        logger.debug('Creating Evolution instance', { instanceName });
        response = await fetch(createUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            instanceName,
            qrcode: true,
            integration: 'WHATSAPP-BAILEYS',
          }),
        });
        result = await response.json();
        logger.debug('Evolution instance create result', { hasInstance: !!result?.instance });

        // Configure webhook automatically after creation
        if (result.instance && N8N_WEBHOOK_URL) {
          try {
            const webhookUrl = `${baseUrl}/webhook/set/${instanceName}`;
            logger.debug('Setting Evolution webhook', { instanceName });
            await fetch(webhookUrl, {
              method: 'POST',
              headers,
              body: JSON.stringify({
                url: N8N_WEBHOOK_URL,
                webhookByEvents: false,
                webhookBase64: false,
                events: [
                  'MESSAGES_UPSERT',
                  'MESSAGES_UPDATE',
                  'CONNECTION_UPDATE',
                  'QRCODE_UPDATED',
                ],
              }),
            });
            logger.info('Webhook configured for instance', { instanceName });
          } catch (whErr) {
            logger.error('Failed to set webhook', whErr as Error, { instanceName });
          }
        }
        break;
      }

      case 'connect': {
        const connectUrl = `${baseUrl}/instance/connect/${instanceName}`;
        logger.debug('Connecting Evolution instance', { instanceName });
        response = await fetch(connectUrl, {
          method: 'GET',
          headers,
        });
        result = await response.json();
        logger.debug('Evolution connect result', { hasQrCode: !!result?.base64 });
        break;
      }

      case 'get_qrcode': {
        response = await fetch(`${baseUrl}/instance/connect/${instanceName}`, {
          method: 'GET',
          headers,
        });
        result = await response.json();
        break;
      }

      case 'get_status': {
        response = await fetch(`${baseUrl}/instance/connectionState/${instanceName}`, {
          method: 'GET',
          headers,
        });
        result = await response.json();
        logger.debug('Evolution status result', { state: result?.instance?.state || result?.state });
        break;
      }

      case 'disconnect': {
        response = await fetch(`${baseUrl}/instance/logout/${instanceName}`, {
          method: 'DELETE',
          headers,
        });
        result = await response.json();
        break;
      }

      case 'delete_instance': {
        response = await fetch(`${baseUrl}/instance/delete/${instanceName}`, {
          method: 'DELETE',
          headers,
        });
        result = await response.json();
        logger.info('Evolution instance deleted', { instanceName });
        break;
      }

      case 'set_webhook': {
        if (!N8N_WEBHOOK_URL) {
          throw new Error('N8N Webhook URL não configurada');
        }
        response = await fetch(`${baseUrl}/webhook/set/${instanceName}`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            url: N8N_WEBHOOK_URL,
            webhookByEvents: false,
            webhookBase64: false,
            events: [
              'MESSAGES_UPSERT',
              'MESSAGES_UPDATE',
              'CONNECTION_UPDATE',
              'QRCODE_UPDATED',
            ],
          }),
        });
        result = await response.json();
        break;
      }

      default:
        throw new Error(`Ação desconhecida: ${action}`);
    }

    // Update whatsapp_instances table (not whatsapp_ai_config)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (action === 'create_instance' && result?.instance) {
      await supabase
        .from('whatsapp_instances')
        .update({
          evolution_instance_id: result.instance.instanceName || instanceName,
          webhook_url: N8N_WEBHOOK_URL || null,
          status: 'CREATED',
          last_connection_update_at: new Date().toISOString(),
        })
        .eq('instance_name', instanceName)
        .eq('restaurant_id', restaurantId);
    }

    if (action === 'get_status' && result?.instance) {
      const state = result.instance?.state || result.state;
      const status = state === 'open' ? 'CONNECTED' : 'DISCONNECTED';
      await supabase
        .from('whatsapp_instances')
        .update({
          status,
          phone_number: state === 'open' ? (result.instance?.phoneNumber || null) : null,
          last_connection_update_at: new Date().toISOString(),
        })
        .eq('instance_name', instanceName)
        .eq('restaurant_id', restaurantId);
    }

    if (action === 'connect' && result?.base64) {
      await supabase
        .from('whatsapp_instances')
        .update({
          qrcode_base64: result.base64,
          status: 'CONNECTING',
          last_connection_update_at: new Date().toISOString(),
        })
        .eq('instance_name', instanceName)
        .eq('restaurant_id', restaurantId);
    }

    if (action === 'disconnect' || action === 'delete_instance') {
      await supabase
        .from('whatsapp_instances')
        .update({
          status: 'DISCONNECTED',
          qrcode_base64: null,
          phone_number: null,
          last_connection_update_at: new Date().toISOString(),
        })
        .eq('instance_name', instanceName)
        .eq('restaurant_id', restaurantId);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    logger.error('Evolution API error', error as Error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
