import { supabase } from "@/integrations/supabase/client";
import { WhatsAppInstance, CreateInstanceInput } from "@/types/atendimento";

// Helper for new tables not yet in generated Supabase types
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
    const { data, error } = await db
      .from('whatsapp_instances')
      .insert({
        instance_name: input.instance_name,
        restaurant_id: input.restaurant_id,
        created_by: input.created_by,
      })
      .select()
      .single();

    if (error) throw error;

    await db.from('whatsapp_instance_events').insert({
      instance_id: data.id,
      event_type: 'created',
      created_by: input.created_by,
      event_data: { instance_name: input.instance_name },
    });

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
      await this.update(instanceId, { status: 'QRCODE', qrcode_base64: data.base64 });
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

    await this.update(instanceId, { status: 'DISCONNECTED', qrcode_base64: null });
  },

  async getInstanceStatus(instanceId: string, restaurantId: string): Promise<string> {
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
    
    const newStatus = data?.state === 'open' ? 'CONNECTED' : 'DISCONNECTED';
    await this.update(instanceId, { status: newStatus });
    
    return newStatus;
  },
};
