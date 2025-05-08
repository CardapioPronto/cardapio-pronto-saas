
import { useState, useEffect } from "react";
import { obterConfiguracoesSistema, salvarConfiguracoesSistema, ConfiguracoesSistema } from "@/services/configuracoes";
import { toast } from "sonner";
import { useCurrentUser } from "@/hooks/useCurrentUser";

export function useSistema() {
  const { user } = useCurrentUser();
  const [configuracoesSistema, setConfiguracoesSistema] = useState<ConfiguracoesSistema>({
    notification_new_order: true,
    notification_email: true,
    dark_mode: false,
    language: "pt-BR",
    auto_print: false
  });
  
  const [loading, setLoading] = useState(false);

  // Carregar configurações do sistema
  useEffect(() => {
    const carregarConfiguracoesSistema = async () => {
      if (!user) return; // Não carrega dados se não houver usuário autenticado
      
      setLoading(true);
      try {
        const config = await obterConfiguracoesSistema();
        setConfiguracoesSistema(config);
      } catch (error) {
        console.error("Erro ao carregar configurações do sistema:", error);
        toast.error("Erro ao carregar configurações do sistema");
        // Ainda mantemos o estado padrão das configurações
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      carregarConfiguracoesSistema();
    }
  }, [user]);

  // Salvar configurações do sistema
  const salvarConfiguracoesDoSistema = async () => {
    setLoading(true);
    try {
      await salvarConfiguracoesSistema(configuracoesSistema);
      toast.success("Configurações salvas com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar configurações:", error);
      toast.error("Erro ao salvar configurações");
    } finally {
      setLoading(false);
    }
  };

  return {
    configuracoesSistema,
    setConfiguracoesSistema,
    loading,
    salvarConfiguracoesDoSistema
  };
}
