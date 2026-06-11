import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { computeSubscriptionAccess } from '@/lib/subscriptionAccess';
import { useCurrentUser } from './useCurrentUser';
import { fetchPublicPlanSummaryById } from '@/services/publicPlansService';

export interface SubscriptionStatus {
  hasActiveSubscription: boolean;
  isInTrial: boolean;
  trialEndsAt: Date | null;
  daysLeftInTrial: number;
  renewalEndsAt: Date | null;
  daysUntilRenewal: number;
  showRenewalAlert: boolean;
  graceEndsAt: Date | null;
  daysUntilBlock: number;
  showPastDueGraceAlert: boolean;
  planName: string | null;
  subscriptionStatus: string | null;
  isLoading: boolean;
}

type SupabaseRpcError = {
  code?: string;
  message?: string;
};

type SubscriptionEntitlement = {
  has_subscription?: boolean;
  plan_id?: string | null;
  plan_name?: string | null;
  status?: string | null;
  is_trial?: boolean | null;
  trial_ends_at?: string | null;
  current_period_end?: string | null;
  next_billing_at?: string | null;
};

type SubscriptionStatusRow = {
  plan_id?: string | null;
  plan_name?: string | null;
  status: string;
  is_trial: boolean | null;
  trial_ends_at: string | null;
  current_period_end?: string | null;
  next_billing_at?: string | null;
};

export const useSubscriptionStatus = () => {
  const { user, loading: userLoading } = useCurrentUser();
  const [status, setStatus] = useState<SubscriptionStatus>({
    hasActiveSubscription: false,
    isInTrial: false,
    trialEndsAt: null,
    daysLeftInTrial: 0,
    renewalEndsAt: null,
    daysUntilRenewal: 0,
    showRenewalAlert: false,
    graceEndsAt: null,
    daysUntilBlock: 0,
    showPastDueGraceAlert: false,
    planName: null,
    subscriptionStatus: null,
    isLoading: true,
  });

  useEffect(() => {
    const applySubscriptionStatus = async (subscription: SubscriptionStatusRow) => {
      const now = new Date();
      const access = computeSubscriptionAccess(
        {
          status: subscription.status,
          is_trial: subscription.is_trial,
          trial_ends_at: subscription.trial_ends_at,
          current_period_end: subscription.current_period_end ?? null,
          next_billing_at: subscription.next_billing_at ?? null,
        },
        now,
      );

      let planName: string | null = subscription.plan_name ?? null;

      if (!planName && subscription.plan_id) {
        const plan = await fetchPublicPlanSummaryById(subscription.plan_id);
        planName = plan?.name ?? null;
      }

      setStatus({
        hasActiveSubscription: access.hasActiveSubscription,
        isInTrial: access.isInTrial,
        trialEndsAt: access.trialEndsAt,
        daysLeftInTrial: access.daysLeftInTrial,
        renewalEndsAt: access.renewalEndsAt,
        daysUntilRenewal: access.daysUntilRenewal,
        showRenewalAlert: access.showRenewalAlert,
        graceEndsAt: access.graceEndsAt,
        daysUntilBlock: access.daysUntilBlock,
        showPastDueGraceAlert: access.showPastDueGraceAlert,
        planName,
        subscriptionStatus: subscription.status,
        isLoading: false,
      });
    };

    const checkSubscription = async () => {
      if (userLoading) {
        setStatus(prev => ({ ...prev, isLoading: true }));
        return;
      }

      if (!user?.restaurant_id) {
        setStatus(prev => ({ ...prev, isLoading: false }));
        return;
      }

      try {
        // Entitlement via RPC (SECURITY DEFINER): join planos no servidor sem
        // depender de FK exposta ao PostgREST para employees/dono.
        const getEntitlement = supabase.rpc.bind(supabase) as unknown as (
          fn: 'get_restaurant_subscription_entitlement',
          args: { p_restaurant_id: string },
        ) => Promise<{ data: unknown; error: SupabaseRpcError | null }>;

        const { data: entitlement, error: entitlementError } = await getEntitlement(
          'get_restaurant_subscription_entitlement',
          { p_restaurant_id: user.restaurant_id },
        );

        if (!entitlementError && entitlement) {
          const entitlementData = entitlement as SubscriptionEntitlement;

          if (!entitlementData.has_subscription || !entitlementData.status) {
            setStatus({
              hasActiveSubscription: false,
              isInTrial: false,
              trialEndsAt: null,
              daysLeftInTrial: 0,
              renewalEndsAt: null,
              daysUntilRenewal: 0,
              showRenewalAlert: false,
              graceEndsAt: null,
              daysUntilBlock: 0,
              showPastDueGraceAlert: false,
              planName: null,
              subscriptionStatus: null,
              isLoading: false,
            });
            return;
          }

          await applySubscriptionStatus({
            plan_id: entitlementData.plan_id,
            plan_name: entitlementData.plan_name,
            status: entitlementData.status,
            is_trial: entitlementData.is_trial ?? false,
            trial_ends_at: entitlementData.trial_ends_at ?? null,
            current_period_end: entitlementData.current_period_end ?? null,
            next_billing_at: entitlementData.next_billing_at ?? null,
          });
          return;
        }

        const { data: subscription, error } = await supabase
          .from('subscriptions')
          .select('plan_id, status, is_trial, trial_ends_at, current_period_end, next_billing_at')
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
            renewalEndsAt: null,
            daysUntilRenewal: 0,
            showRenewalAlert: false,
            graceEndsAt: null,
            daysUntilBlock: 0,
            showPastDueGraceAlert: false,
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
  }, [user?.restaurant_id, userLoading]);

  return status;
};
