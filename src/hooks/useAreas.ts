import { useState, useEffect } from 'react';
import { Area, CreateAreaData, UpdateAreaData } from '@/types/area';
import { areasService } from '@/services/areasService';
import { toast } from 'sonner';

export const useAreas = (restaurantId: string) => {
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAreas = async () => {
    if (!restaurantId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await areasService.getAreas(restaurantId);
      setAreas(data);
    } catch (err) {
      const errorMessage = 'Erro ao carregar áreas';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const createArea = async (areaData: Omit<CreateAreaData, 'restaurant_id'>) => {
    try {
      const newArea = await areasService.createArea({
        ...areaData,
        restaurant_id: restaurantId
      });
      setAreas(prev => [...prev, newArea]);
      toast.success('Área criada com sucesso!');
      return newArea;
    } catch (err) {
      toast.error('Erro ao criar área');
      throw err;
    }
  };

  const updateArea = async (id: string, updateData: UpdateAreaData) => {
    try {
      const updatedArea = await areasService.updateArea(id, updateData);
      setAreas(prev => prev.map(area => area.id === id ? updatedArea : area));
      toast.success('Área atualizada com sucesso!');
      return updatedArea;
    } catch (err) {
      toast.error('Erro ao atualizar área');
      throw err;
    }
  };

  const deleteArea = async (id: string) => {
    try {
      await areasService.deleteArea(id);
      setAreas(prev => prev.filter(area => area.id !== id));
      toast.success('Área removida com sucesso!');
    } catch (err) {
      toast.error('Erro ao remover área');
      throw err;
    }
  };

  useEffect(() => {
    loadAreas();
  }, [restaurantId]);

  return {
    areas,
    loading,
    error,
    loadAreas,
    createArea,
    updateArea,
    deleteArea
  };
};