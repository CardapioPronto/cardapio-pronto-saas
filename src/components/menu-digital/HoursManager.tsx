import React, { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { saveRestaurantHours } from '@/hooks/useIsRestaurantOpen';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Clock } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { RestaurantHours } from '@/types/features';

interface HoursManagerProps {
  restaurantId: string;
  onSave?: (hours: RestaurantHours) => void;
}

export const HoursManager: React.FC<HoursManagerProps> = ({ restaurantId, onSave }) => {
  const [hours, setHours] = useState<RestaurantHours>({
    opening_time: '10:00',
    closing_time: '23:00',
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadHours();
  }, [restaurantId]);

  const loadHours = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('restaurant_settings')
        .select('setting_value')
        .eq('restaurant_id', restaurantId)
        .eq('setting_key', 'hours')
        .maybeSingle();

      if (error) {
        console.error('Error loading hours:', error);
        return;
      }

      if (data?.setting_value) {
        const hoursData = data.setting_value as any;
        setHours({
          opening_time: hoursData.opening_time || '10:00',
          closing_time: hoursData.closing_time || '23:00',
        });
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveHoursMutation = useMutation({
    mutationFn: async () => {
      if (!hours.opening_time || !hours.closing_time) {
        throw new Error('Preencha os horários');
      }

      // Validate time format
      const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(hours.opening_time) || !timeRegex.test(hours.closing_time)) {
        throw new Error('Formato de hora inválido (use HH:mm)');
      }

      await saveRestaurantHours(restaurantId, hours.opening_time, hours.closing_time);
      return hours;
    },
    onSuccess: (savedHours) => {
      toast.success('Horários atualizados com sucesso!');
      onSave?.(savedHours);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao salvar horários');
    },
  });

  const handleSave = async () => {
    await saveHoursMutation.mutateAsync();
  };

  const isOpen = !hours.opening_time || !hours.closing_time
    ? null
    : (() => {
        const now = new Date();
        const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        return currentTimeStr >= hours.opening_time && currentTimeStr < hours.closing_time;
      })();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Horário de Funcionamento
            </CardTitle>
            <CardDescription>Configure quando seu restaurante está aberto para pedidos</CardDescription>
          </div>
          {isOpen !== null && (
            <div className={`text-sm font-semibold px-3 py-1 rounded ${
              isOpen
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}>
              {isOpen ? 'Aberto agora' : 'Fechado'}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="bg-blue-50 border-blue-200">
          <AlertDescription className="text-sm text-blue-900">
            Quando o restaurante está fechado, o cardápio digital exibirá uma mensagem informando a próxima abertura.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="opening-time">Abre às</Label>
            <Input
              id="opening-time"
              type="time"
              value={hours.opening_time || ''}
              onChange={(e) => setHours({ ...hours, opening_time: e.target.value })}
              disabled={saveHoursMutation.isPending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="closing-time">Fecha às</Label>
            <Input
              id="closing-time"
              type="time"
              value={hours.closing_time || ''}
              onChange={(e) => setHours({ ...hours, closing_time: e.target.value })}
              disabled={saveHoursMutation.isPending}
            />
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Exemplo: Abre às 10:00, Fecha às 23:00
        </p>

        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={saveHoursMutation.isPending}
          >
            {saveHoursMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              'Salvar Horários'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
