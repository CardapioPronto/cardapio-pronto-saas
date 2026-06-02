
import { useCallback, useEffect, useState } from "react";
import { useCurrentUser } from "../useCurrentUser";
import { obterConfiguracoesSistema, salvarConfiguracoesSistema, ConfiguracoesSistema } from "@/services/configuracoes";
import { toast } from "sonner";

export const useSistema = () => {
  const { user } = useCurrentUser();
  const [configuracoesSistema, setConfiguracoesSistema] = useState<ConfiguracoesSistema>({
    notification_new_order: true,
    notification_email: true,
    dark_mode: false,
    language: "pt-BR",
    auto_print: false,
    print_paper_size: "80mm",
    print_default_kitchen: true,
    print_default_cashier: false,
    print_default_customer: false,
  });
  const [loading, setLoading] = useState(false);

  const carregarConfiguracoesDoSistema = useCallback(async () => {
    if (!user?.restaurant_id) return;

    setLoading(true);
    try {
      const config = await obterConfiguracoesSistema(user.restaurant_id);
      setConfiguracoesSistema(config);
    } catch (error) {
      console.error("Erro ao carregar configurações do sistema:", error);
      toast.error("Erro ao carregar configurações do sistema");
    } finally {
      setLoading(false);
    }
  }, [user?.restaurant_id]);

  useEffect(() => {
    if (user?.restaurant_id) {
      void carregarConfiguracoesDoSistema();
    }
  }, [user?.restaurant_id, carregarConfiguracoesDoSistema]);

  const salvarConfiguracoesDoSistema = async () => {
    if (!user?.restaurant_id) return;

    setLoading(true);
    try {
      await salvarConfiguracoesSistema(configuracoesSistema, user.restaurant_id);
      toast.success("Configurações do sistema salvas com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar configurações do sistema:", error);
      toast.error("Erro ao salvar configurações do sistema");
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
};
