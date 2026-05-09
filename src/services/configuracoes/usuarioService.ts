
import { supabase } from "@/integrations/supabase/client";
import { Json } from "@/integrations/supabase/types";

const USER_AVATAR_BUCKET = "user-avatars";
const MAX_AVATAR_SIZE = 5 * 1024 * 1024;
const PROFILE_UPDATED_EVENT = "profile-updated";

const notifyProfileUpdated = () => {
  window.dispatchEvent(new CustomEvent(PROFILE_UPDATED_EVENT));
};

const assertImageFile = (file: File) => {
  if (!file.type.startsWith("image/")) {
    throw new Error("Selecione um arquivo de imagem");
  }

  if (file.size > MAX_AVATAR_SIZE) {
    throw new Error("A imagem deve ter no máximo 5MB");
  }
};

const extensionFromFile = (file: File) => {
  const byName = file.name.split(".").pop()?.toLowerCase();
  if (byName && ["jpg", "jpeg", "png", "webp"].includes(byName)) return byName;
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return "jpg";
};

/**
 * Obtém os dados do usuário autenticado
 */
export async function obterDadosUsuario() {
  try {
    const { data: user } = await supabase.auth.getUser();
    
    if (!user.user) {
      throw new Error("Usuário não autenticado");
    }

    const { data: profile } = await supabase
      .from("users")
      .select("name, email, avatar_url, avatar_storage_path")
      .eq("id", user.user.id)
      .maybeSingle();

    return {
      nome: profile?.name || user.user.user_metadata?.name || "Usuário",
      email: profile?.email || user.user.email || "",
      avatar_url: profile?.avatar_url || user.user.user_metadata?.avatar_url || null,
      avatar_storage_path: profile?.avatar_storage_path || null,
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

    const currentEmail = user.user.email || "";

    if (email !== currentEmail) {
      throw new Error("Alteração de e-mail deve ser solicitada ao suporte");
    }

    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("id, name, email, restaurant_id, avatar_url")
      .eq("id", user.user.id)
      .single();

    if (profileError) {
      console.error("Erro ao obter perfil do usuário:", profileError);
      throw profileError;
    }

    // Atualizar metadata do usuário
    const { error: updateError } = await supabase.auth.updateUser({
      password: novaSenha,
      data: {
        ...user.user.user_metadata,
        name: nome,
        avatar_url: profile.avatar_url || user.user.user_metadata?.avatar_url || null,
      }
    });

    if (updateError) {
      console.error("Erro ao atualizar usuário:", updateError);
      throw updateError;
    }

    const publicProfileUpdates = {
      name: nome,
    };

    if (profile.name !== nome) {
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

    notifyProfileUpdated();
    return { success: true };
  } catch (error) {
    console.error("Erro ao atualizar dados do usuário:", error);
    throw error;
  }
}

export async function atualizarAvatarUsuario(file: File) {
  assertImageFile(file);

  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) throw new Error("Usuário não autenticado");

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("avatar_storage_path")
    .eq("id", user.id)
    .single();

  if (profileError) throw profileError;

  const extension = extensionFromFile(file);
  const path = `${user.id}/${Date.now()}.${extension}`;

  const { data: uploaded, error: uploadError } = await supabase.storage
    .from(USER_AVATAR_BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) throw uploadError;

  const { data: publicData } = supabase.storage
    .from(USER_AVATAR_BUCKET)
    .getPublicUrl(uploaded.path);

  const avatarUrl = publicData.publicUrl;

  const { error: updateError } = await supabase
    .from("users")
    .update({
      avatar_url: avatarUrl,
      avatar_storage_path: uploaded.path,
    })
    .eq("id", user.id);

  if (updateError) {
    await supabase.storage.from(USER_AVATAR_BUCKET).remove([uploaded.path]);
    throw updateError;
  }

  await supabase.auth.updateUser({
    data: {
      ...user.user_metadata,
      avatar_url: avatarUrl,
    },
  });

  if (profile?.avatar_storage_path && profile.avatar_storage_path !== uploaded.path) {
    await supabase.storage.from(USER_AVATAR_BUCKET).remove([profile.avatar_storage_path]);
  }

  notifyProfileUpdated();

  return {
    avatar_url: avatarUrl,
    avatar_storage_path: uploaded.path,
  };
}

export async function removerAvatarUsuario() {
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) throw new Error("Usuário não autenticado");

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("avatar_storage_path")
    .eq("id", user.id)
    .single();

  if (profileError) throw profileError;

  const { error: updateError } = await supabase
    .from("users")
    .update({
      avatar_url: null,
      avatar_storage_path: null,
    })
    .eq("id", user.id);

  if (updateError) throw updateError;

  await supabase.auth.updateUser({
    data: {
      ...user.user_metadata,
      avatar_url: null,
    },
  });

  if (profile?.avatar_storage_path) {
    await supabase.storage.from(USER_AVATAR_BUCKET).remove([profile.avatar_storage_path]);
  }

  notifyProfileUpdated();

  return { avatar_url: null, avatar_storage_path: null };
}
