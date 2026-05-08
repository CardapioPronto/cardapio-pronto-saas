import { supabase } from "@/integrations/supabase/client";

/**
 * Cria uma assinatura de trial para um novo restaurante via Edge Function.
 * A inserção direta foi removida para manter a tabela subscriptions protegida por RLS.
 */
export const createTrialSubscription = async (restaurantId: string) => {
  try {
    const { data, error } = await supabase.functions.invoke('create-trial-subscription', {
      body: { restaurant_id: restaurantId },
    });

    if (error) {
      console.error('Erro ao criar trial:', error);
      return { success: false, error: error.message };
    }

    if ((data as { success?: boolean; error?: string } | null)?.success === false) {
      return { success: false, error: (data as { error?: string }).error || 'Erro ao criar trial' };
    }

    return { success: true, subscription: (data as { subscription?: unknown })?.subscription };
  } catch (error) {
    console.error('Erro inesperado ao criar trial:', error);
    return { success: false, error: 'Erro inesperado' };
  }
};

/**
 * Verifica se o trial expirou e atualiza o status
 */
export const checkTrialExpiration = async (restaurantId: string) => {
  try {
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('is_trial', true)
      .single();

    if (error || !subscription || !subscription.trial_ends_at) {
      return { expired: false };
    }

    const trialEndsAt = new Date(subscription.trial_ends_at);
    const now = new Date();

    if (now > trialEndsAt) {
      // Trial expirado - atualizar status
      await supabase
        .from('subscriptions')
        .update({ status: 'inactive' })
        .eq('id', subscription.id);

      return { expired: true };
    }

    return { expired: false };
  } catch (error) {
    console.error('Erro ao verificar trial:', error);
    return { expired: false };
  }
};

/**
 * Converte trial em assinatura paga
 */
export const convertTrialToPaid = async (
  restaurantId: string,
  planId: string,
  paymentData: {
    pagarmeSubscriptionId?: string;
    pagarmeCustomerId?: string;
    nextBilling?: Date | string;
  } = {}
) => {
  try {
    // Cancelar trial atual
    await supabase
      .from('subscriptions')
      .update({ status: 'inactive' })
      .eq('restaurant_id', restaurantId)
      .eq('is_trial', true);

    // Criar nova assinatura paga
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .insert({
        restaurant_id: restaurantId,
        plan_id: planId,
        status: 'active',
        is_trial: false,
        start_date: new Date().toISOString(),
        pagarme_subscription_id: paymentData.pagarmeSubscriptionId ?? null,
        pagarme_customer_id: paymentData.pagarmeCustomerId ?? null,
        next_billing_at: paymentData.nextBilling
          ? new Date(paymentData.nextBilling).toISOString()
          : null,
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar assinatura:', error);
      return { success: false, error: error.message };
    }

    return { success: true, subscription };
  } catch (error) {
    console.error('Erro ao converter trial:', error);
    return { success: false, error: 'Erro inesperado' };
  }
};
