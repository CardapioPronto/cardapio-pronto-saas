
import { supabase } from "@/integrations/supabase/client";
import { ConfiguracoesSistema } from "./types";

const DEFAULT_SYSTEM_CONFIG: Omit<ConfiguracoesSistema, "id"> = {
  notification_new_order: true,
  notification_email: true,
  dark_mode: false,
  language: "pt-BR",
  auto_print: false,
  print_paper_size: "80mm",
  print_default_kitchen: true,
  print_default_cashier: false,
  print_default_customer: false,
};

async function obterRestauranteId(restauranteId?: string | null) {
  if (restauranteId) return restauranteId;

  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error("Usuário não autenticado");

  const { data: perfil, error } = await supabase
    .from("users")
    .select("restaurant_id")
    .eq("id", user.user.id)
    .maybeSingle();

  if (error) throw error;
  if (!perfil?.restaurant_id) throw new Error("Restaurante não encontrado para este usuário");

  return perfil.restaurant_id;
}

/**
 * Obtém as configurações do sistema para o restaurante do usuário autenticado
 */
export async function obterConfiguracoesSistema(restauranteId?: string | null): Promise<ConfiguracoesSistema> {
  try {
    const restaurantId = await obterRestauranteId(restauranteId);

    // Obter configurações
    const { data, error } = await supabase
      .from("system_configurations")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .maybeSingle();

    if (error) {
      console.error("Erro ao obter configurações:", error);
      throw error;
    }

    // Se não existir configuração, retorna valores padrão
    if (!data) {
      return DEFAULT_SYSTEM_CONFIG;
    }

    return {
      id: data.id,
      notification_new_order: data.notification_new_order ?? true,
      notification_email: data.notification_email ?? true,
      dark_mode: data.dark_mode ?? false,
      language: data.language ?? "pt-BR",
      auto_print: data.auto_print ?? false,
      print_paper_size: data.print_paper_size ?? "80mm",
      print_default_kitchen: data.print_default_kitchen ?? true,
      print_default_cashier: data.print_default_cashier ?? false,
      print_default_customer: data.print_default_customer ?? false,
    };
  } catch (error) {
    console.error("Erro ao obter configurações do sistema:", error);
    // Retornar configurações padrão em caso de erro
    return DEFAULT_SYSTEM_CONFIG;
  }
}

/**
 * Salva as configurações do sistema para o restaurante do usuário autenticado
 */
export async function salvarConfiguracoesSistema(config: ConfiguracoesSistema, restauranteId?: string | null) {
  try {
    const restaurantId = await obterRestauranteId(restauranteId);

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
          print_paper_size: config.print_paper_size,
          print_default_kitchen: config.print_default_kitchen,
          print_default_cashier: config.print_default_cashier,
          print_default_customer: config.print_default_customer,
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
        restaurant_id: restaurantId,
        notification_new_order: config.notification_new_order,
        notification_email: config.notification_email,
        dark_mode: config.dark_mode,
        language: config.language,
        auto_print: config.auto_print,
        print_paper_size: config.print_paper_size,
        print_default_kitchen: config.print_default_kitchen,
        print_default_cashier: config.print_default_cashier,
        print_default_customer: config.print_default_customer,
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
