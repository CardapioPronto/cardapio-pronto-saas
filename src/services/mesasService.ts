import { supabase } from '@/integrations/supabase/client';
import { Mesa, CreateMesaData, UpdateMesaData } from '@/types/mesa';

export const mesasService = {
  async getMesas(restaurantId: string): Promise<Mesa[]> {
    const { data, error } = await supabase
      .from('mesas')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true)
      .order('number');

    if (error) {
      console.error('Erro ao buscar mesas:', error);
      throw error;
    }

    return data || [];
  },

  async getMesasByArea(areaId: string): Promise<Mesa[]> {
    const { data, error } = await supabase
      .from('mesas')
      .select('*')
      .eq('area_id', areaId)
      .eq('is_active', true)
      .order('number');

    if (error) {
      console.error('Erro ao buscar mesas da área:', error);
      throw error;
    }

    return data || [];
  },

  async createMesa(mesaData: CreateMesaData): Promise<Mesa> {
    const { data, error } = await supabase
      .from('mesas')
      .insert(mesaData)
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar mesa:', error);
      throw error;
    }

    return data;
  },

  async updateMesa(id: string, updateData: UpdateMesaData): Promise<Mesa> {
    const { data, error } = await supabase
      .from('mesas')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar mesa:', error);
      throw error;
    }

    return data;
  },

  async updateMesaStatus(id: string, status: Mesa['status']): Promise<Mesa> {
    return this.updateMesa(id, { status });
  },

  async deleteMesa(id: string): Promise<void> {
    const { error } = await supabase
      .from('mesas')
      .update({ is_active: false })
      .eq('id', id);

    if (error) {
      console.error('Erro ao deletar mesa:', error);
      throw error;
    }
  },

  async getMesaById(id: string): Promise<Mesa | null> {
    const { data, error } = await supabase
      .from('mesas')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Erro ao buscar mesa:', error);
      return null;
    }

    return data;
  }
};