import { useState, useEffect, useCallback } from 'react';
import { Mesa, CreateMesaData, UpdateMesaData } from '@/types/mesa';
import { mesasService } from '@/services/mesasService';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export const useMesas = (restaurantId: string) => {
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMesas = useCallback(async () => {
    if (!restaurantId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await mesasService.getMesas(restaurantId);
      setMesas(data);
    } catch (err) {
      const errorMessage = 'Erro ao carregar mesas';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  const createMesa = async (mesaData: Omit<CreateMesaData, 'restaurant_id'>) => {
    try {
      const newMesa = await mesasService.createMesa({
        ...mesaData,
        restaurant_id: restaurantId
      });
      setMesas(prev => [...prev, newMesa]);
      toast.success('Mesa criada com sucesso!');
      return newMesa;
    } catch (err) {
      toast.error('Erro ao criar mesa');
      throw err;
    }
  };

  const updateMesa = async (id: string, updateData: UpdateMesaData) => {
    try {
      const updatedMesa = await mesasService.updateMesa(id, updateData);
      setMesas(prev => prev.map(mesa => mesa.id === id ? updatedMesa : mesa));
      toast.success('Mesa atualizada com sucesso!');
      return updatedMesa;
    } catch (err) {
      toast.error('Erro ao atualizar mesa');
      throw err;
    }
  };

  const updateMesaStatus = async (id: string, status: Mesa['status']) => {
    try {
      const updatedMesa = await mesasService.updateMesaStatus(id, status);
      setMesas(prev => prev.map(mesa => mesa.id === id ? updatedMesa : mesa));
      return updatedMesa;
    } catch (err) {
      toast.error('Erro ao atualizar status da mesa');
      throw err;
    }
  };

  const deleteMesa = async (id: string) => {
    try {
      await mesasService.deleteMesa(id);
      setMesas(prev => prev.filter(mesa => mesa.id !== id));
      toast.success('Mesa removida com sucesso!');
    } catch (err) {
      toast.error('Erro ao remover mesa');
      throw err;
    }
  };

  const getMesasByArea = (areaId: string) => {
    return mesas.filter(mesa => mesa.area_id === areaId);
  };

  const getMesasWithoutArea = () => {
    return mesas.filter(mesa => !mesa.area_id);
  };

  useEffect(() => {
    loadMesas();
  }, [loadMesas]);

  useEffect(() => {
    if (!restaurantId) return;

    const handleMesasChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ restaurantId?: string }>).detail;
      if (!detail?.restaurantId || detail.restaurantId === restaurantId) {
        loadMesas();
      }
    };

    window.addEventListener('mesas:changed', handleMesasChanged);

    const channel = supabase
      .channel(`mesas-status-${restaurantId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mesas',
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        () => loadMesas()
      )
      .subscribe();

    return () => {
      window.removeEventListener('mesas:changed', handleMesasChanged);
      supabase.removeChannel(channel);
    };
  }, [restaurantId, loadMesas]);

  return {
    mesas,
    loading,
    error,
    loadMesas,
    createMesa,
    updateMesa,
    updateMesaStatus,
    deleteMesa,
    getMesasByArea,
    getMesasWithoutArea
  };
};
