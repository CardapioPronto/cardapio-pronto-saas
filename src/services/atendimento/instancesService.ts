import { supabase } from "@/integrations/supabase/client";
import { WhatsAppInstance, CreateInstanceInput } from "@/types/atendimento";

// Cast to any until Supabase types are regenerated with new columns
const db = supabase as any;

export const InstancesService = {
  async list(restaurantId: string): Promise<WhatsAppInstance[]> {
    const { data, error } = await db
      .from('whatsapp_instances')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as WhatsAppInstance[];
  },

  async getById(id: string): Promise<WhatsAppInstance | null> {
    const { data, error } = await db
      .from('whatsapp_instances')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return null;
    return data as WhatsAppInstance;
  },

  async create(input: CreateInstanceInput): Promise<WhatsAppInstance> {
    // 1. Insert into database first
    const { data, error } = await db
      .from('whatsapp_instances')
      .insert({
        instance_name: input.instance_name,
        restaurant_id: input.restaurant_id,
        created_by: input.created_by,
        status: 'CREATED',
      })
      .select()
      .single();

    if (error) throw error;

    // 2. Log creation event
    await db.from('whatsapp_instance_events').insert({
      instance_id: data.id,
      event_type: 'created',
      created_by: input.created_by,
      event_data: { instance_name: input.instance_name },
    });

    // 3. Call Evolution API to create instance on the server
    try {
      const { data: evoResult, error: evoError } = await supabase.functions.invoke('evolution-api', {
        body: {
          action: 'create_instance',
          instanceName: input.instance_name,
          restaurantId: input.restaurant_id,
        },
      });

      if (evoError) {
        console.error('Evolution API create error:', evoError);
      } else if (evoResult?.instance) {
        // Update DB with Evolution instance ID
        await db
          .from('whatsapp_instances')
          .update({
            evolution_instance_id: evoResult.instance?.instanceName || null,
            status: 'CREATED',
          })
          .eq('id', data.id);
      }
    } catch (evoErr) {
      console.error('Failed to create instance on Evolution API:', evoErr);
      // Don't throw - instance is saved in DB, Evolution can be retried
    }

    return data as WhatsAppInstance;
  },

  async update(id: string, updates: Partial<WhatsAppInstance>): Promise<WhatsAppInstance> {
    const { data, error } = await db
      .from('whatsapp_instances')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as WhatsAppInstance;
  },

  async remove(id: string, userId: string): Promise<void> {
    const instance = await this.getById(id);

    // Call Evolution API to delete instance
    if (instance) {
      try {
        await supabase.functions.invoke('evolution-api', {
          body: {
            action: 'delete_instance',
            instanceName: instance.instance_name,
            restaurantId: instance.restaurant_id,
          },
        });
      } catch (evoErr) {
        console.error('Failed to delete instance on Evolution API:', evoErr);
      }
    }

    // Log deletion event before removing
    await db.from('whatsapp_instance_events').insert({
      instance_id: id,
      event_type: 'deleted',
      created_by: userId,
    });

    const { error } = await db
      .from('whatsapp_instances')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async toggleAutomation(id: string, enabled: boolean): Promise<WhatsAppInstance> {
    return this.update(id, { automation_enabled: enabled } as any);
  },

  async connectInstance(instanceId: string, restaurantId: string): Promise<{ qrcode?: string }> {
    const instance = await this.getById(instanceId);
    if (!instance) throw new Error('Instância não encontrada');

    const { data, error } = await supabase.functions.invoke('evolution-api', {
      body: {
        action: 'connect',
        instanceName: instance.instance_name,
        restaurantId,
      },
    });

    if (error) throw error;

    if (data?.base64) {
      await this.update(instanceId, {
        status: 'CONNECTING',
        qrcode_base64: data.base64,
      } as any);
    }

    return { qrcode: data?.base64 };
  },

  async disconnectInstance(instanceId: string, restaurantId: string): Promise<void> {
    const instance = await this.getById(instanceId);
    if (!instance) throw new Error('Instância não encontrada');

    await supabase.functions.invoke('evolution-api', {
      body: {
        action: 'disconnect',
        instanceName: instance.instance_name,
        restaurantId,
      },
    });

    await this.update(instanceId, {
      status: 'DISCONNECTED',
      qrcode_base64: null,
    } as any);
  },

  async refreshStatus(instanceId: string, restaurantId: string): Promise<InstanceStatus> {
    const instance = await this.getById(instanceId);
    if (!instance) throw new Error('Instância não encontrada');

    const { data, error } = await supabase.functions.invoke('evolution-api', {
      body: {
        action: 'get_status',
        instanceName: instance.instance_name,
        restaurantId,
      },
    });

    if (error) throw error;

    const newStatus: InstanceStatus = data?.state === 'open' ? 'CONNECTED' : 'DISCONNECTED';
    await this.update(instanceId, {
      status: newStatus,
      ...(newStatus === 'CONNECTED' && data?.phoneNumber ? { phone_number: data.phoneNumber } : {}),
    } as any);

    return newStatus;
  },

  async configureWebhook(instanceId: string, restaurantId: string): Promise<void> {
    const instance = await this.getById(instanceId);
    if (!instance) throw new Error('Instância não encontrada');

    const { error } = await supabase.functions.invoke('evolution-api', {
      body: {
        action: 'set_webhook',
        instanceName: instance.instance_name,
        restaurantId,
      },
    });

    if (error) throw error;
  },
};

type InstanceStatus = WhatsAppInstance['status'];
