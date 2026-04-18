
import { useUserSession } from "./useUserSession";

/**
 * Hook unificado de usuário. Retorna o perfil do usuário autenticado a partir
 * da sessão única (`useUserSession`), garantindo consistência em todo o app.
 */
export function useCurrentUser() {
  const { appUser, loading, error } = useUserSession();

  return {
    user: appUser,
    loading,
    error,
  };
}
