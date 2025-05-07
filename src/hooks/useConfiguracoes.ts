
import { useState, useEffect } from "react";
import { 
  obterDadosEstabelecimento, 
  atualizarDadosEstabelecimento, 
  obterConfiguracoesSistema, 
  salvarConfiguracoesSistema,
  obterDadosUsuario,
  atualizarDadosUsuario,
  uploadLogo,
  DadosEstabelecimento,
  ConfiguracoesSistema
} from "@/services/configuracoes";
import { toast } from "sonner";
import { useCurrentUser } from "@/hooks/useCurrentUser";

export function useConfiguracoes() {
  const { user } = useCurrentUser();
  const [dadosEstabelecimento, setDadosEstabelecimento] = useState<DadosEstabelecimento>({
    nome: "",
    endereco: null,
    telefone: null,
    email: null,
    horarioFuncionamento: null,
    logo_url: null
  });

  const [dadosUsuario, setDadosUsuario] = useState({
    nome: "",
    email: "",
    senha: "••••••••",
    novaSenha: "",
    confirmarSenha: ""
  });

  const [configuracoesSistema, setConfiguracoesSistema] = useState<ConfiguracoesSistema>({
    notification_new_order: true,
    notification_email: true,
    dark_mode: false,
    language: "pt-BR",
    auto_print: false
  });

  const [loading, setLoading] = useState({
    estabelecimento: false,
    usuario: false,
    configuracoes: false,
    logoUpload: false
  });

  // Carregar dados do estabelecimento
  useEffect(() => {
    const carregarDadosEstabelecimento = async () => {
      if (!user) return; // Não carrega dados se não houver usuário autenticado
      
      setLoading(prev => ({ ...prev, estabelecimento: true }));
      try {
        const dados = await obterDadosEstabelecimento();
        setDadosEstabelecimento(dados);
      } catch (error) {
        console.error("Erro ao carregar dados do estabelecimento:", error);
        toast.error("Erro ao carregar dados do estabelecimento");
      } finally {
        setLoading(prev => ({ ...prev, estabelecimento: false }));
      }
    };

    if (user) {
      carregarDadosEstabelecimento();
    }
  }, [user]);

  // Carregar dados do usuário
  useEffect(() => {
    const carregarDadosUsuario = async () => {
      if (!user) return; // Não carrega dados se não houver usuário autenticado
      
      setLoading(prev => ({ ...prev, usuario: true }));
      try {
        const dados = await obterDadosUsuario();
        setDadosUsuario(prev => ({
          ...prev,
          nome: dados.nome || "",
          email: dados.email || ""
        }));
      } catch (error) {
        console.error("Erro ao carregar dados do usuário:", error);
        toast.error("Erro ao carregar dados do usuário");
      } finally {
        setLoading(prev => ({ ...prev, usuario: false }));
      }
    };

    if (user) {
      carregarDadosUsuario();
    }
  }, [user]);

  // Carregar configurações do sistema
  useEffect(() => {
    const carregarConfiguracoesSistema = async () => {
      if (!user) return; // Não carrega dados se não houver usuário autenticado
      
      setLoading(prev => ({ ...prev, configuracoes: true }));
      try {
        const config = await obterConfiguracoesSistema();
        // Convertendo valores possivelmente nulos para booleanos
        setConfiguracoesSistema({
          id: config.id,
          notification_new_order: config.notification_new_order === null ? true : config.notification_new_order,
          notification_email: config.notification_email === null ? true : config.notification_email,
          dark_mode: config.dark_mode === null ? false : config.dark_mode,
          language: config.language || "pt-BR",
          auto_print: config.auto_print === null ? false : config.auto_print
        });
      } catch (error) {
        console.error("Erro ao carregar configurações do sistema:", error);
        toast.error("Erro ao carregar configurações do sistema");
      } finally {
        setLoading(prev => ({ ...prev, configuracoes: false }));
      }
    };

    if (user) {
      carregarConfiguracoesSistema();
    }
  }, [user]);

  // Atualizar dados do estabelecimento
  const salvarDadosEstabelecimento = async () => {
    setLoading(prev => ({ ...prev, estabelecimento: true }));
    try {
      await atualizarDadosEstabelecimento(dadosEstabelecimento);
      toast.success("Dados do estabelecimento atualizados com sucesso!");
    } catch (error) {
      console.error("Erro ao atualizar dados do estabelecimento:", error);
      toast.error("Erro ao atualizar dados do estabelecimento");
    } finally {
      setLoading(prev => ({ ...prev, estabelecimento: false }));
    }
  };

  // Atualizar dados do usuário
  const salvarDadosUsuario = async () => {
    if (dadosUsuario.novaSenha && dadosUsuario.novaSenha !== dadosUsuario.confirmarSenha) {
      toast.error("As senhas não coincidem");
      return;
    }

    setLoading(prev => ({ ...prev, usuario: true }));
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
      setLoading(prev => ({ ...prev, usuario: false }));
    }
  };

  // Salvar configurações do sistema
  const salvarConfiguracoesDoSistema = async () => {
    setLoading(prev => ({ ...prev, configuracoes: true }));
    try {
      await salvarConfiguracoesSistema(configuracoesSistema);
      toast.success("Configurações salvas com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar configurações:", error);
      toast.error("Erro ao salvar configurações");
    } finally {
      setLoading(prev => ({ ...prev, configuracoes: false }));
    }
  };

  // Upload de logo do estabelecimento
  const fazerUploadLogo = async (file: File) => {
    setLoading(prev => ({ ...prev, logoUpload: true }));
    try {
      const result = await uploadLogo(file);
      setDadosEstabelecimento(prev => ({
        ...prev,
        logo_url: result.url
      }));
      toast.success("Logo atualizado com sucesso!");
    } catch (error) {
      console.error("Erro ao fazer upload do logo:", error);
      toast.error("Erro ao fazer upload do logo");
    } finally {
      setLoading(prev => ({ ...prev, logoUpload: false }));
    }
  };

  return {
    dadosEstabelecimento,
    setDadosEstabelecimento,
    dadosUsuario,
    setDadosUsuario,
    configuracoesSistema,
    setConfiguracoesSistema,
    loading,
    salvarDadosEstabelecimento,
    salvarDadosUsuario,
    salvarConfiguracoesDoSistema,
    fazerUploadLogo
  };
}
