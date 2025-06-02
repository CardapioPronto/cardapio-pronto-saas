
import { useEffect, useState } from "react";
import { useCurrentUser } from "../useCurrentUser";
import { obterConfiguracoesSistema, salvarConfiguracoesSistema, ConfiguracoesSistema } from "@/services/configuracoes";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export const useSistema = () => {
  const { user } = useCurrentUser();
  const [configuracoesSistema, setConfiguracoesSistema] = useState<ConfiguracoesSistema>({
    notification_new_order: true,
    notification_email: true,
    dark_mode: false,
    language: "pt-BR",
    auto_print: false
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.restaurant_id) {
      carregarConfiguracoesDoSistema();
    }
  }, [user?.restaurant_id]);

  const carregarConfiguracoesDoSistema = async () => {
    if (!user?.restaurant_id) return;

    setLoading(true);
    try {
      const config = await obterConfiguracoesSistema(user.restaurant_id);
      
      // Se não existir configuração, criar uma padrão
      if (!config) {
        await criarConfiguracoesPadrao();
      } else {
        setConfiguracoesSistema(config);
      }
    } catch (error) {
      console.error("Erro ao carregar configurações do sistema:", error);
      toast.error("Erro ao carregar configurações do sistema");
    } finally {
      setLoading(false);
    }
  };

  const criarConfiguracoesPadrao = async () => {
    if (!user?.restaurant_id) return;

    try {
      const { error } = await supabase
        .from('system_configurations')
        .insert({
          restaurant_id: user.restaurant_id,
          notification_new_order: true,
          notification_email: true,
          dark_mode: false,
          language: 'pt-BR',
          auto_print: false
        });

      if (error) {
        console.error('Erro ao criar configurações padrão:', error);
        toast.error('Erro ao criar configurações padrão');
      } else {
        // Recarregar as configurações após criar
        await carregarConfiguracoesDoSistema();
      }
    } catch (error) {
      console.error('Erro ao criar configurações padrão:', error);
    }
  };

  const salvarConfiguracoesDoSistema = async () => {
    if (!user?.restaurant_id) return;

    setLoading(true);
    try {
      await salvarConfiguracoesSistema(user.restaurant_id, configuracoesSistema);
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
