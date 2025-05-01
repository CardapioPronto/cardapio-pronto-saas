
import { supabase } from './supabase';
import { checkSupabaseConnection } from './supabase-service';
import { toast } from '@/components/ui/use-toast';

/**
 * Inicializa a conexão com o Supabase e verifica se está funcionando corretamente
 */
export async function initSupabase(): Promise<boolean> {
  try {
    // Verifica se a conexão com o Supabase está funcionando
    const { connected, error } = await checkSupabaseConnection();
    
    if (!connected) {
      console.error('Falha ao conectar com o Supabase:', error);
      toast({
        variant: 'destructive',
        title: 'Erro de conexão',
        description: 'Não foi possível conectar ao Supabase. Verifique suas configurações.',
      });
      return false;
    }
    
    // Verifica a sessão atual do usuário
    const { data, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Erro ao verificar a sessão:', sessionError.message);
    } else if (data?.session) {
      console.log('Usuário já autenticado:', data.session.user.email);
    } else {
      console.log('Nenhum usuário autenticado.');
    }
    
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('Erro na inicialização do Supabase:', errorMessage);
    
    toast({
      variant: 'destructive',
      title: 'Erro na inicialização',
      description: `Falha ao inicializar o Supabase: ${errorMessage}`,
    });
    
    return false;
  }
}

// Verifica e configura listeners para mudanças de autenticação
export function setupAuthListeners() {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN') {
      console.log('Usuário autenticado:', session?.user?.email);
      // Aqui você pode atualizar o estado global ou fazer outras ações necessárias
    }
    
    if (event === 'SIGNED_OUT') {
      console.log('Usuário desconectado');
      // Limpar dados locais ou fazer outras ações necessárias quando o usuário desconectar
    }
  });

  // Retorna a função para remover o listener quando necessário
  return () => {
    subscription.unsubscribe();
  };
}
