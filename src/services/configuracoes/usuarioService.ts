
import { supabase } from "@/integrations/supabase/client";
import { Json } from "@/integrations/supabase/types";

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

    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("id, name, email, restaurant_id")
      .eq("id", user.user.id)
      .single();

    if (profileError) {
      console.error("Erro ao obter perfil do usuário:", profileError);
      throw profileError;
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

    const publicProfileUpdates = {
      name: nome,
      email,
    };

    if (profile.name !== nome || profile.email !== email) {
      const { error: publicProfileError } = await supabase
        .from("users")
        .update(publicProfileUpdates)
        .eq("id", user.user.id);

      if (publicProfileError) {
        console.error("Erro ao atualizar perfil público do usuário:", publicProfileError);
        throw publicProfileError;
      }
    }

    if (novaSenha && profile.restaurant_id) {
      const passwordAuditChanges: Json = {
        password: {
          from: null,
          to: "alterada",
        },
      };

      const { error: auditError } = await supabase.rpc("record_configuration_audit_event", {
        target_restaurant_id: profile.restaurant_id,
        event_area: "user",
        event_action: "password_change",
        event_entity_type: "user",
        event_entity_id: user.user.id,
        event_changes: passwordAuditChanges,
        event_target_user_id: user.user.id,
        event_metadata: { source: "settings_user_tab" },
      });

      if (auditError) {
        console.error("Erro ao registrar auditoria de senha:", auditError);
        throw auditError;
      }
    }

    return { success: true };
  } catch (error) {
    console.error("Erro ao atualizar dados do usuário:", error);
    throw error;
  }
}
