
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface DadosEstabelecimento {
  nome: string;
  endereco: string | null;
  telefone: string | null;
  phone_whatsapp?: string | null;
  email: string | null;
  cnpj?: string | null;
  categoria?: string | null;
  horarioFuncionamento: string | null;
  logo_url: string | null;
}

export async function obterDadosEstabelecimento(): Promise<DadosEstabelecimento> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('Usuário não autenticado');
    }

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
      return {
        nome: '',
        endereco: '',
        telefone: '',
        phone_whatsapp: '',
        email: '',
        cnpj: '',
        categoria: '',
        horarioFuncionamento: '',
        logo_url: ''
      };
    }

    const restaurant = restaurants[0];
    
    return {
      nome: restaurant.name || '',
      endereco: restaurant.address || '',
      telefone: restaurant.phone || '',
      phone_whatsapp: restaurant.phone_whatsapp || '',
      email: restaurant.email || '',
      cnpj: restaurant.cnpj || '',
      categoria: restaurant.category || '',
      horarioFuncionamento: restaurant.business_hours || '',
      logo_url: restaurant.logo_url || ''
    };
  } catch (error) {
    console.error('Erro ao obter dados do estabelecimento:', error);
    throw error;
  }
}

export async function atualizarDadosEstabelecimento(dados: DadosEstabelecimento): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('Usuário não autenticado');
    }

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
      name: dados.nome,
      address: dados.endereco,
      phone: dados.telefone,
      phone_whatsapp: dados.phone_whatsapp,
      email: dados.email,
      cnpj: dados.cnpj,
      category: dados.categoria,
      business_hours: dados.horarioFuncionamento,
      logo_url: dados.logo_url,
      owner_id: user.id,
      updated_at: new Date().toISOString()
    };

    if (existingRestaurants && existingRestaurants.length > 0) {
      const { error: updateError } = await supabase
        .from('restaurants')
        .update(dadosParaSalvar)
        .eq('id', existingRestaurants[0].id);

      if (updateError) {
        console.error('Erro ao atualizar estabelecimento:', updateError);
        throw new Error('Erro ao salvar dados do estabelecimento');
      }
    } else {
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

export async function uploadLogo(file: File): Promise<{ url: string }> {
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
    return { url: data.publicUrl };
  } catch (error) {
    console.error('Erro ao fazer upload da logo:', error);
    toast.error('Erro ao fazer upload da logo');
    throw error;
  }
}
