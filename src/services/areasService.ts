import { supabase } from '@/integrations/supabase/client';
import { Area, CreateAreaData, UpdateAreaData } from '@/types/area';

export const areasService = {
  async getAreas(restaurantId: string): Promise<Area[]> {
    const { data, error } = await supabase
      .from('areas')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('Erro ao buscar áreas:', error);
      throw error;
    }

    return data || [];
  },

  async createArea(areaData: CreateAreaData): Promise<Area> {
    const { data, error } = await supabase
      .from('areas')
      .insert(areaData)
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar área:', error);
      throw error;
    }

    return data;
  },

  async updateArea(id: string, updateData: UpdateAreaData): Promise<Area> {
    const { data, error } = await supabase
      .from('areas')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar área:', error);
      throw error;
    }

    return data;
  },

  async deleteArea(id: string): Promise<void> {
    const { error } = await supabase
      .from('areas')
      .update({ is_active: false })
      .eq('id', id);

    if (error) {
      console.error('Erro ao deletar área:', error);
      throw error;
    }
  },

  async getAreaById(id: string): Promise<Area | null> {
    const { data, error } = await supabase
      .from('areas')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Erro ao buscar área:', error);
      return null;
    }

    return data;
  }
};