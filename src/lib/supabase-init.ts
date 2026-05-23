
import { supabase } from './supabase';
import { checkSupabaseConnection } from './supabase-service';
import { toast } from '@/components/ui/use-toast';
import { isCiPlaceholderSupabase } from './ci-supabase';

/**
 * Inicializa a conexão com o Supabase e verifica se está funcionando corretamente
 */
export async function initSupabase(): Promise<boolean> {
  if (isCiPlaceholderSupabase()) {
    return false;
  }

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
    await supabase.auth.getSession();
    
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

/**
 * Anteriormente registrava um segundo onAuthStateChange listener que duplicava
 * o de useUserSession, causando re-renders extras. Agora é um no-op — toda a
 * lógica de auth state vive em useUserSession.
 */
export function setupAuthListeners() {
  // noop — mantido para não quebrar App.tsx
}
