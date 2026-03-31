import { useState, useEffect, useCallback } from 'react';
import { WhatsAppInstance } from '@/types/atendimento';
import { InstancesService } from '@/services/atendimento/instancesService';
import { getCurrentRestaurantId } from '@/lib/supabase';
import { useCurrentUser } from './useCurrentUser';
import { toast } from 'sonner';

export const useWhatsAppInstances = () => {
  const { user } = useCurrentUser();
  const [instances, setInstances] = useState<WhatsAppInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [restaurantId, setRestaurantId] = useState<string>('');

  useEffect(() => {
    const load = async () => {
      const id = await getCurrentRestaurantId();
      if (id) setRestaurantId(id);
    };
    load();
  }, [user]);

  const loadInstances = useCallback(async () => {
    if (!restaurantId) return;
    setLoading(true);
    try {
      const data = await InstancesService.list(restaurantId);
      setInstances(data);
    } catch (error) {
      console.error('Erro ao carregar instâncias:', error);
      toast.error('Erro ao carregar instâncias WhatsApp');
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    if (restaurantId) loadInstances();
  }, [restaurantId, loadInstances]);

  const createInstance = async (name: string) => {
    if (!restaurantId || !user?.id) return null;
    try {
      const instance = await InstancesService.create({
        instance_name: name,
        restaurant_id: restaurantId,
        created_by: user.id,
      });
      setInstances(prev => [instance, ...prev]);
      toast.success('Instância criada com sucesso');
      return instance;
    } catch (error) {
      console.error('Erro ao criar instância:', error);
      toast.error('Erro ao criar instância');
      return null;
    }
  };

  const deleteInstance = async (id: string) => {
    if (!user?.id) return;
    try {
      await InstancesService.remove(id, user.id);
      setInstances(prev => prev.filter(i => i.id !== id));
      toast.success('Instância removida');
    } catch (error) {
      console.error('Erro ao remover instância:', error);
      toast.error('Erro ao remover instância');
    }
  };

  const connectInstance = async (id: string) => {
    if (!restaurantId) return null;
    try {
      const result = await InstancesService.connectInstance(id, restaurantId);
      await loadInstances();
      return result;
    } catch (error) {
      console.error('Erro ao conectar instância:', error);
      toast.error('Erro ao conectar instância');
      return null;
    }
  };

  const disconnectInstance = async (id: string) => {
    if (!restaurantId) return;
    try {
      await InstancesService.disconnectInstance(id, restaurantId);
      await loadInstances();
      toast.success('Instância desconectada');
    } catch (error) {
      console.error('Erro ao desconectar instância:', error);
      toast.error('Erro ao desconectar instância');
    }
  };

  return {
    instances,
    loading,
    restaurantId,
    createInstance,
    deleteInstance,
    connectInstance,
    disconnectInstance,
    refetch: loadInstances,
  };
};
