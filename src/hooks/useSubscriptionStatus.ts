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
  plan_id?: string | null;
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
    const applySubscriptionStatus = async (subscription: SubscriptionStatusRow) => {
      const isInTrial =
        subscription.status === 'trialing' ||
        subscription.is_trial ||
        false;
      const trialEndsAt = subscription.trial_ends_at ? new Date(subscription.trial_ends_at) : null;
      const daysLeftInTrial = trialEndsAt
        ? Math.ceil((trialEndsAt.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      let planName = getPlanName(subscription.plans);

      if (!planName && subscription.plan_id) {
        const { data: plan } = await supabase
          .from('plans')
          .select('name')
          .eq('id', subscription.plan_id)
          .maybeSingle();

        planName = plan?.name ?? null;
      }

      setStatus({
        hasActiveSubscription: subscription.status === 'active' || subscription.status === 'trialing',
        isInTrial,
        trialEndsAt,
        daysLeftInTrial: Math.max(0, daysLeftInTrial),
        planName,
        subscriptionStatus: subscription.status,
        isLoading: false,
      });
    };

    const checkSubscription = async () => {
      if (!user?.restaurant_id) {
        setStatus(prev => ({ ...prev, isLoading: false }));
        return;
      }

      try {
        // Buscar assinatura ativa do restaurante. Ambientes antigos podem não ter
        // FK entre subscriptions.plan_id e plans.id, então há fallback sem join.
        const { data: subscription, error } = await supabase
          .from('subscriptions')
          .select(`
            plan_id,
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
          if (error.code !== 'PGRST200') {
            console.error('Erro ao buscar assinatura:', error);
            setStatus(prev => ({ ...prev, isLoading: false }));
            return;
          }

          const { data: fallbackSubscription, error: fallbackError } = await supabase
            .from('subscriptions')
            .select('plan_id, status, is_trial, trial_ends_at')
            .eq('restaurant_id', user.restaurant_id)
            .in('status', ['active', 'trialing', 'past_due'])
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (fallbackError && fallbackError.code !== 'PGRST116') {
            console.error('Erro ao buscar assinatura:', fallbackError);
            setStatus(prev => ({ ...prev, isLoading: false }));
            return;
          }

          if (!fallbackSubscription) {
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

          await applySubscriptionStatus(fallbackSubscription as unknown as SubscriptionStatusRow);
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

        await applySubscriptionStatus(subscription as unknown as SubscriptionStatusRow);
      } catch (error) {
        console.error('Erro ao verificar status da assinatura:', error);
        setStatus(prev => ({ ...prev, isLoading: false }));
      }
    };

    checkSubscription();
  }, [user?.restaurant_id]);

  return status;
};
