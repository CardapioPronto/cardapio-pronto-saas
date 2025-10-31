import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUser } from './useCurrentUser';

export interface SubscriptionStatus {
  hasActiveSubscription: boolean;
  isInTrial: boolean;
  trialEndsAt: Date | null;
  daysLeftInTrial: number;
  planName: string | null;
  isLoading: boolean;
}

export const useSubscriptionStatus = () => {
  const { user } = useCurrentUser();
  const [status, setStatus] = useState<SubscriptionStatus>({
    hasActiveSubscription: false,
    isInTrial: false,
    trialEndsAt: null,
    daysLeftInTrial: 0,
    planName: null,
    isLoading: true,
  });

  useEffect(() => {
    const checkSubscription = async () => {
      if (!user?.restaurant_id) {
        setStatus(prev => ({ ...prev, isLoading: false }));
        return;
      }

      try {
        // Buscar assinatura ativa do restaurante
        const { data: subscription, error } = await supabase
          .from('subscriptions')
          .select(`
            *,
            plans:plan_id (name)
          `)
          .eq('restaurant_id', user.restaurant_id)
          .eq('status', 'active')
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Erro ao buscar assinatura:', error);
          setStatus(prev => ({ ...prev, isLoading: false }));
          return;
        }

        if (!subscription) {
          setStatus({
            hasActiveSubscription: false,
            isInTrial: false,
            trialEndsAt: null,
            daysLeftInTrial: 0,
            planName: null,
            isLoading: false,
          });
          return;
        }

        const isInTrial = subscription.is_trial || false;
        const trialEndsAt = subscription.trial_ends_at ? new Date(subscription.trial_ends_at) : null;
        const daysLeftInTrial = trialEndsAt 
          ? Math.ceil((trialEndsAt.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
          : 0;

        setStatus({
          hasActiveSubscription: true,
          isInTrial,
          trialEndsAt,
          daysLeftInTrial: Math.max(0, daysLeftInTrial),
          planName: (subscription as any).plans?.name || null,
          isLoading: false,
        });
      } catch (error) {
        console.error('Erro ao verificar status da assinatura:', error);
        setStatus(prev => ({ ...prev, isLoading: false }));
      }
    };

    checkSubscription();
  }, [user?.restaurant_id]);

  return status;
};
