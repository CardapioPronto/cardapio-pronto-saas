
import { supabase } from "@/integrations/supabase/client";

/**
 * Obtém os dados do usuário autenticado
 */
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

/**
 * Atualiza os dados do usuário autenticado
 */
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
