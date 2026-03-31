import { supabase } from "@/integrations/supabase/client";
import { AutomationSettings, AIHandoffRule, UpdateAutomationInput, HandoffRuleType } from "@/types/atendimento";

// Helper for new tables not yet in generated Supabase types
const db = supabase as any;

export const AutomationService = {
  async getSettings(instanceId: string): Promise<AutomationSettings | null> {
    const { data, error } = await db
      .from('automation_settings')
      .select('*')
      .eq('instance_id', instanceId)
      .single();

    if (error) return null;
    return data as AutomationSettings;
  },

  async upsertSettings(instanceId: string, restaurantId: string, updates: UpdateAutomationInput): Promise<AutomationSettings> {
    const { data, error } = await db
      .from('automation_settings')
      .upsert({
        instance_id: instanceId,
        restaurant_id: restaurantId,
        ...updates,
      }, { onConflict: 'instance_id' })
      .select()
      .single();

    if (error) throw error;
    return data as AutomationSettings;
  },

  async getHandoffRules(instanceId: string): Promise<AIHandoffRule[]> {
    const { data, error } = await db
      .from('ai_handoff_rules')
      .select('*')
      .eq('instance_id', instanceId)
      .order('priority', { ascending: true });

    if (error) throw error;
    return (data || []) as AIHandoffRule[];
  },

  async addHandoffRule(params: {
    instanceId: string;
    restaurantId: string;
    ruleType: HandoffRuleType;
    ruleValue: string;
    priority?: number;
  }): Promise<AIHandoffRule> {
    const { data, error } = await db
      .from('ai_handoff_rules')
      .insert({
        instance_id: params.instanceId,
        restaurant_id: params.restaurantId,
        rule_type: params.ruleType,
        rule_value: params.ruleValue,
        priority: params.priority || 0,
      })
      .select()
      .single();

    if (error) throw error;
    return data as AIHandoffRule;
  },

  async updateHandoffRule(id: string, updates: Partial<AIHandoffRule>): Promise<void> {
    const { error } = await db
      .from('ai_handoff_rules')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
  },

  async deleteHandoffRule(id: string): Promise<void> {
    const { error } = await db
      .from('ai_handoff_rules')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};
