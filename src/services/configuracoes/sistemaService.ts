
import { supabase } from "@/integrations/supabase/client";
import { ConfiguracoesSistema } from "./types";

/**
 * Obtém as configurações do sistema para o restaurante do usuário autenticado
 */
export async function obterConfiguracoesSistema(): Promise<ConfiguracoesSistema> {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      throw new Error("Usuário não autenticado");
    }

    // Obter ID do restaurante do usuário
    const { data: restaurant, error: restaurantError } = await supabase
      .from("restaurants")
      .select("id")
      .eq("owner_id", user.user.id)
      .single();

    if (restaurantError) {
      console.error("Erro ao obter restaurante:", restaurantError);
      throw restaurantError;
    }

    // Obter configurações
    const { data, error } = await supabase
      .from("system_configurations")
      .select("*")
      .eq("restaurant_id", restaurant.id)
      .maybeSingle();

    if (error) {
      console.error("Erro ao obter configurações:", error);
      throw error;
    }

    // Se não existir configuração, retorna valores padrão
    if (!data) {
      return {
        notification_new_order: true,
        notification_email: true,
        dark_mode: false,
        language: "pt-BR",
        auto_print: false,
      };
    }

    return {
      id: data.id,
      notification_new_order: data.notification_new_order ?? true,
      notification_email: data.notification_email ?? true,
      dark_mode: data.dark_mode ?? false,
      language: data.language ?? "pt-BR",
      auto_print: data.auto_print ?? false,
    };
  } catch (error) {
    console.error("Erro ao obter configurações do sistema:", error);
    throw error;
  }
}

/**
 * Salva as configurações do sistema para o restaurante do usuário autenticado
 */
export async function salvarConfiguracoesSistema(config: ConfiguracoesSistema) {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      throw new Error("Usuário não autenticado");
    }

    // Obter ID do restaurante do usuário
    const { data: restaurant, error: restaurantError } = await supabase
      .from("restaurants")
      .select("id")
      .eq("owner_id", user.user.id)
      .single();

    if (restaurantError) {
      console.error("Erro ao obter restaurante:", restaurantError);
      throw restaurantError;
    }

    // Verificar se já existe configuração para este restaurante
    if (config.id) {
      // Atualizar configuração existente
      const { error } = await supabase
        .from("system_configurations")
        .update({
          notification_new_order: config.notification_new_order,
          notification_email: config.notification_email,
          dark_mode: config.dark_mode,
          language: config.language,
          auto_print: config.auto_print,
          updated_at: new Date().toISOString(),
        })
        .eq("id", config.id);

      if (error) {
        console.error("Erro ao atualizar configurações:", error);
        throw error;
      }
    } else {
      // Criar nova configuração
      const { error } = await supabase.from("system_configurations").insert({
        restaurant_id: restaurant.id,
        notification_new_order: config.notification_new_order,
        notification_email: config.notification_email,
        dark_mode: config.dark_mode,
        language: config.language,
        auto_print: config.auto_print,
      });

      if (error) {
        console.error("Erro ao criar configurações:", error);
        throw error;
      }
    }

    return { success: true };
  } catch (error) {
    console.error("Erro ao salvar configurações do sistema:", error);
    throw error;
  }
}
