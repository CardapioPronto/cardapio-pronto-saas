
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type DadosEstabelecimento = {
  nome: string;
  endereco: string | null;
  telefone: string | null;
  email: string | null;
  horarioFuncionamento: string | null;
  logo_url: string | null;
};

export type ConfiguracoesSistema = {
  id?: string;
  notification_new_order: boolean;
  notification_email: boolean;
  dark_mode: boolean;
  language: string;
  auto_print: boolean;
};

export async function obterDadosEstabelecimento() {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      throw new Error("Usuário não autenticado");
    }

    const { data: restaurant, error } = await supabase
      .from("restaurants")
      .select("id, name, address, phone, email, business_hours, logo_url")
      .eq("owner_id", user.user.id)
      .single();

    if (error) {
      console.error("Erro ao obter dados do estabelecimento:", error);
      throw error;
    }

    return {
      nome: restaurant.name,
      endereco: restaurant.address,
      telefone: restaurant.phone,
      email: restaurant.email,
      horarioFuncionamento: restaurant.business_hours,
      logo_url: restaurant.logo_url,
    };
  } catch (error) {
    console.error("Erro ao obter dados do estabelecimento:", error);
    throw error;
  }
}

export async function atualizarDadosEstabelecimento(dados: DadosEstabelecimento) {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      throw new Error("Usuário não autenticado");
    }

    const { data: restaurant, error: findError } = await supabase
      .from("restaurants")
      .select("id")
      .eq("owner_id", user.user.id)
      .single();

    if (findError) {
      console.error("Erro ao encontrar restaurante:", findError);
      throw findError;
    }

    const { error } = await supabase
      .from("restaurants")
      .update({
        name: dados.nome,
        address: dados.endereco,
        phone: dados.telefone,
        email: dados.email,
        business_hours: dados.horarioFuncionamento,
        updated_at: new Date().toISOString(),
      })
      .eq("id", restaurant.id);

    if (error) {
      console.error("Erro ao atualizar dados do estabelecimento:", error);
      throw error;
    }

    return { success: true };
  } catch (error) {
    console.error("Erro ao atualizar dados do estabelecimento:", error);
    throw error;
  }
}

export async function obterConfiguracoesSistema() {
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
      notification_new_order: data.notification_new_order,
      notification_email: data.notification_email,
      dark_mode: data.dark_mode,
      language: data.language,
      auto_print: data.auto_print,
    };
  } catch (error) {
    console.error("Erro ao obter configurações do sistema:", error);
    throw error;
  }
}

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

export async function obterDadosUsuario() {
  try {
    const { data: user } = await supabase.auth.getUser();
    
    if (!user.user) {
      throw new Error("Usuário não autenticado");
    }

    return {
      nome: user.user.user_metadata?.name || "Usuário",
      email: user.user.email,
    };
  } catch (error) {
    console.error("Erro ao obter dados do usuário:", error);
    throw error;
  }
}

export async function atualizarDadosUsuario(nome: string, email: string, senha?: string, novaSenha?: string) {
  try {
    const { data: user } = await supabase.auth.getUser();
    
    if (!user.user) {
      throw new Error("Usuário não autenticado");
    }

    // Atualizar metadata do usuário
    const { error: updateError } = await supabase.auth.updateUser({
      email: email !== user.user.email ? email : undefined,
      password: novaSenha,
      data: { name: nome }
    });

    if (updateError) {
      console.error("Erro ao atualizar usuário:", updateError);
      throw updateError;
    }

    return { success: true };
  } catch (error) {
    console.error("Erro ao atualizar dados do usuário:", error);
    throw error;
  }
}

export async function uploadLogo(file: File) {
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

    // Gerar nome de arquivo único
    const fileExt = file.name.split('.').pop();
    const fileName = `${restaurant.id}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `logos/${fileName}`;

    // Upload do arquivo
    const { error: uploadError } = await supabase.storage
      .from('restaurant-assets')
      .upload(filePath, file);

    if (uploadError) {
      console.error("Erro ao fazer upload do logo:", uploadError);
      throw uploadError;
    }

    // Obter URL pública
    const { data: urlData } = supabase.storage
      .from('restaurant-assets')
      .getPublicUrl(filePath);

    // Atualizar o restaurante com a nova URL do logo
    const { error: updateError } = await supabase
      .from("restaurants")
      .update({
        logo_url: urlData.publicUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", restaurant.id);

    if (updateError) {
      console.error("Erro ao atualizar logo do restaurante:", updateError);
      throw updateError;
    }

    return { success: true, url: urlData.publicUrl };
  } catch (error) {
    console.error("Erro ao fazer upload do logo:", error);
    throw error;
  }
}
