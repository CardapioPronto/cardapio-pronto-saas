
import { supabase } from "@/integrations/supabase/client";
import { Restaurant } from "@/types/restaurant";
import { toast } from "sonner";

export interface DadosEstabelecimento {
  name: string;
  phone?: string;
  phone_whatsapp?: string; // Novo campo
  address: string;
  cnpj?: string;
  email?: string;
  category?: string;
  business_hours?: string;
  logo_url?: string;
}

export async function obterDadosEstabelecimento(): Promise<DadosEstabelecimento> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('Usuário não autenticado');
    }

    // Buscar o restaurante do usuário
    const { data: restaurants, error } = await supabase
      .from('restaurants')
      .select('*')
      .eq('owner_id', user.id)
      .limit(1);

    if (error) {
      console.error('Erro ao buscar dados do estabelecimento:', error);
      throw new Error('Erro ao carregar dados do estabelecimento');
    }

    if (!restaurants || restaurants.length === 0) {
      // Retornar dados vazios se não houver restaurante
      return {
        name: '',
        phone: '',
        phone_whatsapp: '',
        address: '',
        cnpj: '',
        email: '',
        category: '',
        business_hours: '',
        logo_url: ''
      };
    }

    const restaurant = restaurants[0];
    
    return {
      name: restaurant.name || '',
      phone: restaurant.phone || '',
      phone_whatsapp: restaurant.phone_whatsapp || '', // Incluir o novo campo
      address: restaurant.address || '',
      cnpj: restaurant.cnpj || '',
      email: restaurant.email || '',
      category: restaurant.category || '',
      business_hours: restaurant.business_hours || '',
      logo_url: restaurant.logo_url || ''
    };
  } catch (error) {
    console.error('Erro ao obter dados do estabelecimento:', error);
    throw error;
  }
}

export async function salvarDadosEstabelecimento(dados: DadosEstabelecimento): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('Usuário não autenticado');
    }

    // Verificar se já existe um restaurante para este usuário
    const { data: existingRestaurants, error: searchError } = await supabase
      .from('restaurants')
      .select('id')
      .eq('owner_id', user.id)
      .limit(1);

    if (searchError) {
      console.error('Erro ao buscar restaurante existente:', searchError);
      throw new Error('Erro ao verificar dados existentes');
    }

    const dadosParaSalvar = {
      name: dados.name,
      phone: dados.phone,
      phone_whatsapp: dados.phone_whatsapp, // Incluir o novo campo
      address: dados.address,
      cnpj: dados.cnpj,
      email: dados.email,
      category: dados.category,
      business_hours: dados.business_hours,
      logo_url: dados.logo_url,
      owner_id: user.id,
      updated_at: new Date().toISOString()
    };

    if (existingRestaurants && existingRestaurants.length > 0) {
      // Atualizar restaurante existente
      const { error: updateError } = await supabase
        .from('restaurants')
        .update(dadosParaSalvar)
        .eq('id', existingRestaurants[0].id);

      if (updateError) {
        console.error('Erro ao atualizar estabelecimento:', updateError);
        throw new Error('Erro ao salvar dados do estabelecimento');
      }
    } else {
      // Criar novo restaurante
      const { error: insertError } = await supabase
        .from('restaurants')
        .insert(dadosParaSalvar);

      if (insertError) {
        console.error('Erro ao criar estabelecimento:', insertError);
        throw new Error('Erro ao criar estabelecimento');
      }
    }

    toast.success('Dados do estabelecimento salvos com sucesso!');
  } catch (error) {
    console.error('Erro ao salvar dados do estabelecimento:', error);
    toast.error('Erro ao salvar dados do estabelecimento');
    throw error;
  }
}

export async function fazerUploadLogo(file: File): Promise<string> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('Usuário não autenticado');
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}-${Math.random()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('restaurant-logos')
      .upload(fileName, file);

    if (uploadError) {
      console.error('Erro ao fazer upload:', uploadError);
      throw new Error('Erro ao fazer upload da logo');
    }

    const { data } = supabase.storage
      .from('restaurant-logos')
      .getPublicUrl(fileName);

    toast.success('Logo enviada com sucesso!');
    return data.publicUrl;
  } catch (error) {
    console.error('Erro ao fazer upload da logo:', error);
    toast.error('Erro ao fazer upload da logo');
    throw error;
  }
}
