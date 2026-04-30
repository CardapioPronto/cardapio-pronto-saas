import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUser } from './useCurrentUser';

export interface SubscriptionStatus {
  hasActiveSubscription: boolean;
  isInTrial: boolean;
  trialEndsAt: Date | null;
  daysLeftInTrial: number;
  planName: string | null;
  subscriptionStatus: string | null;
  isLoading: boolean;
}

type SubscriptionStatusRow = {
  status: string;
  is_trial: boolean | null;
  trial_ends_at: string | null;
  plans?: { name: string } | { name: string }[] | null;
};

const getPlanName = (plans: SubscriptionStatusRow["plans"]) => {
  if (Array.isArray(plans)) return plans[0]?.name ?? null;
  return plans?.name ?? null;
};

export const useSubscriptionStatus = () => {
  const { user } = useCurrentUser();
  const [status, setStatus] = useState<SubscriptionStatus>({
    hasActiveSubscription: false,
    isInTrial: false,
    trialEndsAt: null,
    daysLeftInTrial: 0,
    planName: null,
    subscriptionStatus: null,
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
            status,
            is_trial,
            trial_ends_at,
            plans:plan_id (name)
          `)
          .eq('restaurant_id', user.restaurant_id)
          .in('status', ['active', 'trialing', 'past_due'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

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
            subscriptionStatus: null,
            isLoading: false,
          });
          return;
        }

        const normalizedSubscription = subscription as SubscriptionStatusRow;
        const isInTrial =
          normalizedSubscription.status === 'trialing' ||
          normalizedSubscription.is_trial ||
          false;
        const trialEndsAt = normalizedSubscription.trial_ends_at ? new Date(normalizedSubscription.trial_ends_at) : null;
        const daysLeftInTrial = trialEndsAt 
          ? Math.ceil((trialEndsAt.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
          : 0;

        setStatus({
          hasActiveSubscription: normalizedSubscription.status === 'active' || normalizedSubscription.status === 'trialing',
          isInTrial,
          trialEndsAt,
          daysLeftInTrial: Math.max(0, daysLeftInTrial),
          planName: getPlanName(normalizedSubscription.plans),
          subscriptionStatus: normalizedSubscription.status,
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
