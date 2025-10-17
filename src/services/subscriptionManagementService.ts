import { supabase } from "@/integrations/supabase/client";

/**
 * Cria uma assinatura de trial de 7 dias para um novo restaurante
 */
export const createTrialSubscription = async (restaurantId: string) => {
  try {
    // Buscar o plano Profissional (plano padrão para trial)
    const { data: plan, error: planError } = await supabase
      .from('plans')
      .select('id')
      .eq('name', 'Profissional')
      .single();

    if (planError || !plan) {
      console.error('Erro ao buscar plano:', planError);
      return { success: false, error: 'Plano não encontrado' };
    }

    // Calcular data de expiração do trial (7 dias)
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 7);

    // Criar assinatura de trial
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .insert({
        restaurant_id: restaurantId,
        plan_id: plan.id,
        status: 'active',
        is_trial: true,
        trial_ends_at: trialEndsAt.toISOString(),
        start_date: new Date().toISOString(),
      })
      .select()
      .single();

    if (subError) {
      console.error('Erro ao criar trial:', subError);
      return { success: false, error: subError.message };
    }

    return { success: true, subscription };
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
  paymentData: any
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
