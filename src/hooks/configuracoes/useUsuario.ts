
import { useState, useEffect } from "react";
import {
  atualizarAvatarUsuario,
  atualizarDadosUsuario,
  obterDadosUsuario,
  removerAvatarUsuario,
  type DadosUsuario,
} from "@/services/configuracoes";
import { toast } from "sonner";
import { useCurrentUser } from "@/hooks/useCurrentUser";

export function useUsuario() {
  const { user } = useCurrentUser();
  const [dadosUsuario, setDadosUsuario] = useState<DadosUsuario>({
    nome: "",
    email: "",
    senha: "••••••••",
    novaSenha: "",
    confirmarSenha: "",
    avatar_url: null,
    avatar_storage_path: null,
  });
  
  const [loading, setLoading] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);

  // Carregar dados do usuário
  useEffect(() => {
    const carregarDadosUsuario = async () => {
      if (!user) return; // Não carrega dados se não houver usuário autenticado
      
      setLoading(true);
      try {
        const dados = await obterDadosUsuario();
        setDadosUsuario(prev => ({
          ...prev,
          nome: dados.nome || "",
          email: dados.email || "",
          avatar_url: dados.avatar_url || null,
          avatar_storage_path: dados.avatar_storage_path || null,
        }));
      } catch (error) {
        console.error("Erro ao carregar dados do usuário:", error);
        toast.error("Erro ao carregar dados do usuário");
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      carregarDadosUsuario();
    }
  }, [user]);

  // Atualizar dados do usuário
  const salvarDadosUsuario = async () => {
    if (dadosUsuario.novaSenha && dadosUsuario.novaSenha !== dadosUsuario.confirmarSenha) {
      toast.error("As senhas não coincidem");
      return;
    }

    setLoading(true);
    try {
      await atualizarDadosUsuario(
        dadosUsuario.nome, 
        dadosUsuario.email, 
        dadosUsuario.senha !== "••••••••" ? dadosUsuario.senha : undefined,
        dadosUsuario.novaSenha || undefined
      );
      
      setDadosUsuario(prev => ({
        ...prev,
        senha: dadosUsuario.novaSenha ? "••••••••" : prev.senha,
        novaSenha: "",
        confirmarSenha: ""
      }));
      
      toast.success("Dados do usuário atualizados com sucesso!");
    } catch (error) {
      console.error("Erro ao atualizar dados do usuário:", error);
      toast.error("Erro ao atualizar dados do usuário");
    } finally {
      setLoading(false);
    }
  };

  const fazerUploadAvatar = async (file: File) => {
    setAvatarLoading(true);
    try {
      const avatar = await atualizarAvatarUsuario(file);
      setDadosUsuario(prev => ({
        ...prev,
        avatar_url: avatar.avatar_url,
        avatar_storage_path: avatar.avatar_storage_path,
      }));
      toast.success("Foto de perfil atualizada com sucesso!");
    } catch (error) {
      console.error("Erro ao atualizar foto de perfil:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao atualizar foto de perfil");
    } finally {
      setAvatarLoading(false);
    }
  };

  const removerAvatar = async () => {
    setAvatarLoading(true);
    try {
      await removerAvatarUsuario();
      setDadosUsuario(prev => ({
        ...prev,
        avatar_url: null,
        avatar_storage_path: null,
      }));
      toast.success("Foto de perfil removida");
    } catch (error) {
      console.error("Erro ao remover foto de perfil:", error);
      toast.error("Erro ao remover foto de perfil");
    } finally {
      setAvatarLoading(false);
    }
  };

  return {
    dadosUsuario,
    setDadosUsuario,
    loading,
    avatarLoading,
    salvarDadosUsuario,
    fazerUploadAvatar,
    removerAvatar,
  };
}
