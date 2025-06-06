
import { useUserSession } from "./useUserSession";

export function useCurrentUserV2() {
  const { appUser, loading, error } = useUserSession();

  return { 
    user: appUser, 
    loading, 
    error 
  };
}
