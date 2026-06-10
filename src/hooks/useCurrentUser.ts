
import { useUserSession } from "./useUserSession";
import { useRestaurantAccess } from "./useRestaurantAccess";

/**
 * Hook unificado de usuário. Retorna o perfil do usuário autenticado a partir
 * da sessão única (`useUserSession`), garantindo consistência em todo o app.
 */
export function useCurrentUser() {
  const { appUser, loading, error } = useUserSession();
  const { activeRestaurantId } = useRestaurantAccess();

  return {
    user: appUser && activeRestaurantId
      ? { ...appUser, restaurant_id: activeRestaurantId }
      : appUser,
    loading,
    error,
  };
}
