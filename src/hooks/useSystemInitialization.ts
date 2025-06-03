
import { useEffect, useState } from "react";
import { useCurrentUser } from "./useCurrentUser";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export const useSystemInitialization = () => {
  const { user } = useCurrentUser();
  const [initialized, setInitialized] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.restaurant_id && !initialized) {
      initializeSystemConfigurations();
    }
  }, [user?.restaurant_id, initialized]);

  const initializeSystemConfigurations = async () => {
    if (!user?.restaurant_id) return;

    setLoading(true);
    try {
      // Verificar se já existem configurações do sistema para este restaurante
      const { data: existingConfig, error: checkError } = await supabase
        .from('system_configurations')
        .select('id')
        .eq('restaurant_id', user.restaurant_id)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Erro ao verificar configurações existentes:', checkError);
        return;
      }

      // Se não existir, criar configurações padrão
      if (!existingConfig) {
        const { error: insertError } = await supabase
          .from('system_configurations')
          .insert({
            restaurant_id: user.restaurant_id,
            notification_new_order: true,
            notification_email: true,
            dark_mode: false,
            language: 'pt-BR',
            auto_print: false
          });

        if (insertError) {
          console.error('Erro ao criar configurações do sistema:', insertError);
          toast.error('Erro ao inicializar configurações do sistema');
        } else {
          console.log('Configurações do sistema criadas com sucesso');
        }
      }

      setInitialized(true);
    } catch (error) {
      console.error('Erro na inicialização do sistema:', error);
    } finally {
      setLoading(false);
    }
  };

  return { initialized, loading, initializeSystemConfigurations };
};
