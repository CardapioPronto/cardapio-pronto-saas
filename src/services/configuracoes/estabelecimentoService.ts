
import { supabase } from "@/integrations/supabase/client";
import { DadosEstabelecimento } from "./types";

/**
 * Obtém os dados do estabelecimento do usuário autenticado
 * Em caso de múltiplos estabelecimentos, retorna o primeiro encontrado
 */
export async function obterDadosEstabelecimento(): Promise<DadosEstabelecimento> {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      throw new Error("Usuário não autenticado");
    }

    // Modificado para usar .limit(1) em vez de .single()
    const { data: restaurants, error } = await supabase
      .from("restaurants")
      .select("id, name, address, phone, email, business_hours, logo_url")
      .eq("owner_id", user.user.id)
      .limit(1);

    if (error) {
      console.error("Erro ao obter dados do estabelecimento:", error);
      throw error;
    }

    if (!restaurants || restaurants.length === 0) {
      throw new Error("Nenhum estabelecimento encontrado para este usuário");
    }

    const restaurant = restaurants[0];
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

/**
 * Atualiza os dados do estabelecimento do usuário autenticado
 */
export async function atualizarDadosEstabelecimento(dados: DadosEstabelecimento) {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      throw new Error("Usuário não autenticado");
    }

    // Modificado para usar .limit(1) em vez de .single()
    const { data: restaurants, error: findError } = await supabase
      .from("restaurants")
      .select("id")
      .eq("owner_id", user.user.id)
      .limit(1);

    if (findError) {
      console.error("Erro ao encontrar restaurante:", findError);
      throw findError;
    }

    if (!restaurants || restaurants.length === 0) {
      throw new Error("Nenhum estabelecimento encontrado para este usuário");
    }

    const restaurantId = restaurants[0].id;

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
      .eq("id", restaurantId);

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

/**
 * Faz upload do logo do estabelecimento
 */
export async function uploadLogo(file: File) {
  try {
    const { data: user } = await supabase.auth.getUser();
    
    if (!user.user) {
      throw new Error("Usuário não autenticado");
    }

    // Modificado para usar .limit(1) em vez de .single()
    const { data: restaurants, error: restaurantError } = await supabase
      .from("restaurants")
      .select("id")
      .eq("owner_id", user.user.id)
      .limit(1);

    if (restaurantError) {
      console.error("Erro ao obter restaurante:", restaurantError);
      throw restaurantError;
    }

    if (!restaurants || restaurants.length === 0) {
      throw new Error("Nenhum estabelecimento encontrado para este usuário");
    }

    const restaurant = restaurants[0];

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
