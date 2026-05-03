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
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

interface EvolutionRequest {
  action: 'create_instance' | 'connect' | 'get_qrcode' | 'disconnect' | 'delete_instance' | 'get_status' | 'set_webhook' | 'send_text';
  instanceName: string;
  restaurantId: string;
  number?: string;
  text?: string;
}

type RequiredPermission = 'whatsapp_manage_instances' | 'whatsapp_reply_as_human';

function normalizeWhatsAppNumber(raw: string): string {
  const withoutDomain = raw.split('@')[0] || raw;
  return withoutDomain.replace(/\D/g, '');
}

function requiredPermissionForAction(action: EvolutionRequest['action']): RequiredPermission {
  return action === 'send_text' ? 'whatsapp_reply_as_human' : 'whatsapp_manage_instances';
}

async function authorizeRequest(req: Request, restaurantId: string, action: EvolutionRequest['action']) {
  const authHeader = req.headers.get('Authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) throw new Error('Usuário não autenticado.');

  const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: userData, error: userError } = await authClient.auth.getUser(token);
  if (userError || !userData.user) throw new Error('Sessão inválida.');

  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const userId = userData.user.id;

  const { data: appUser, error: appUserError } = await adminClient
    .from('users')
    .select('id, restaurant_id, user_type, role')
    .eq('id', userId)
    .maybeSingle();

  if (appUserError || !appUser) throw new Error('Perfil do usuário não encontrado.');

  if (appUser.role === 'super_admin') return adminClient;
  if (appUser.restaurant_id !== restaurantId) throw new Error('Usuário sem acesso a este estabelecimento.');
  if (appUser.user_type === 'owner' || appUser.user_type === 'manager') return adminClient;

  const { data: employee, error: employeeError } = await adminClient
    .from('employees')
    .select('id')
    .eq('user_id', userId)
    .eq('restaurant_id', restaurantId)
    .eq('is_active', true)
    .maybeSingle();

  if (employeeError || !employee?.id) throw new Error('Funcionário sem vínculo ativo com este estabelecimento.');

  const requiredPermission = requiredPermissionForAction(action);
  const { data: permission, error: permissionError } = await adminClient
    .from('employee_permissions')
    .select('permission')
    .eq('employee_id', employee.id)
    .in('permission', [requiredPermission, 'whatsapp_manage'])
    .limit(1)
    .maybeSingle();

  if (permissionError || !permission) throw new Error('Usuário sem permissão para executar esta ação.');
  return adminClient;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, instanceName, restaurantId, number, text }: EvolutionRequest = await req.json();

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

    const supabase = await authorizeRequest(req, restaurantId, action);

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

      case 'send_text': {
        if (!number || !text?.trim()) {
          throw new Error('Número e texto são obrigatórios para enviar mensagem.');
        }

        const normalizedNumber = normalizeWhatsAppNumber(number);
        if (!normalizedNumber) throw new Error('Número de WhatsApp inválido.');

        response = await fetch(`${baseUrl}/message/sendText/${instanceName}`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            number: normalizedNumber,
            text: text.trim(),
          }),
        });
        result = await response.json();

        if (!response.ok) {
          throw new Error(`Evolution API ${response.status}: ${JSON.stringify(result)}`);
        }
        break;
      }

      default:
        throw new Error(`Ação desconhecida: ${action}`);
    }

    // Update whatsapp_instances table (not whatsapp_ai_config)
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

    if (action === 'set_webhook') {
      await supabase
        .from('whatsapp_instances')
        .update({
          webhook_url: N8N_WEBHOOK_URL || null,
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
