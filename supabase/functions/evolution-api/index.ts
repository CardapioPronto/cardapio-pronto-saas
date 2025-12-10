import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

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

    console.log(`Evolution API action: ${action} for instance: ${instanceName}`);

    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
      throw new Error('Evolution API não configurada. Verifique as variáveis de ambiente.');
    }

    const headers = {
      'Content-Type': 'application/json',
      'apikey': EVOLUTION_API_KEY,
    };

    let response;
    let result;

    switch (action) {
      case 'create_instance':
        // Cria uma nova instância
        response = await fetch(`${EVOLUTION_API_URL}/instance/create`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            instanceName,
            qrcode: true,
            integration: 'WHATSAPP-BAILEYS',
          }),
        });
        result = await response.json();
        console.log('Create instance result:', result);

        if (result.instance) {
          // Configura webhook automaticamente após criar a instância
          await fetch(`${EVOLUTION_API_URL}/webhook/set/${instanceName}`, {
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
          console.log('Webhook configured for instance:', instanceName);
        }
        break;

      case 'connect':
        // Conecta a instância (gera QR Code)
        response = await fetch(`${EVOLUTION_API_URL}/instance/connect/${instanceName}`, {
          method: 'GET',
          headers,
        });
        result = await response.json();
        console.log('Connect result:', result);
        break;

      case 'get_qrcode':
        // Obtém o QR Code atual
        response = await fetch(`${EVOLUTION_API_URL}/instance/connect/${instanceName}`, {
          method: 'GET',
          headers,
        });
        result = await response.json();
        console.log('Get QRCode result:', result);
        break;

      case 'get_status':
        // Verifica status da conexão
        response = await fetch(`${EVOLUTION_API_URL}/instance/connectionState/${instanceName}`, {
          method: 'GET',
          headers,
        });
        result = await response.json();
        console.log('Status result:', result);
        break;

      case 'disconnect':
        // Desconecta (logout) da instância
        response = await fetch(`${EVOLUTION_API_URL}/instance/logout/${instanceName}`, {
          method: 'DELETE',
          headers,
        });
        result = await response.json();
        console.log('Disconnect result:', result);
        break;

      case 'delete_instance':
        // Deleta a instância completamente
        response = await fetch(`${EVOLUTION_API_URL}/instance/delete/${instanceName}`, {
          method: 'DELETE',
          headers,
        });
        result = await response.json();
        console.log('Delete instance result:', result);
        break;

      case 'set_webhook':
        // Configura webhook
        if (!N8N_WEBHOOK_URL) {
          throw new Error('N8N Webhook URL não configurada');
        }
        response = await fetch(`${EVOLUTION_API_URL}/webhook/set/${instanceName}`, {
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
        console.log('Set webhook result:', result);
        break;

      default:
        throw new Error(`Ação desconhecida: ${action}`);
    }

    // Atualiza status no banco de dados
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (action === 'get_status' && result?.state) {
      const status = result.state === 'open' ? 'CONNECTED' : 'DISCONNECTED';
      await supabase
        .from('whatsapp_ai_config')
        .update({ 
          status,
          phone_connected: result.state === 'open' ? result.instance?.phoneConnected : null,
          updated_at: new Date().toISOString()
        })
        .eq('restaurant_id', restaurantId);
    }

    if (action === 'connect' && result?.base64) {
      await supabase
        .from('whatsapp_ai_config')
        .update({ 
          qrcode_base64: result.base64,
          status: 'QRCODE',
          updated_at: new Date().toISOString()
        })
        .eq('restaurant_id', restaurantId);
    }

    if (action === 'disconnect' || action === 'delete_instance') {
      await supabase
        .from('whatsapp_ai_config')
        .update({ 
          status: 'DISCONNECTED',
          qrcode_base64: null,
          phone_connected: null,
          updated_at: new Date().toISOString()
        })
        .eq('restaurant_id', restaurantId);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Evolution API error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});