import { ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { getMyRestaurantAccess, setActiveRestaurant } from "@/services/multiunitService";
import type { RestaurantAccess } from "@/types/multiunit";
import { useUserSession } from "./useUserSession";
import { RestaurantAccessContext } from "./restaurantAccessContext";

const ACTIVE_RESTAURANT_STORAGE_KEY = "pubfy.activeRestaurantId";
const PROFILE_UPDATED_EVENT = "profile-updated";

const getStoredRestaurantId = () => {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ACTIVE_RESTAURANT_STORAGE_KEY);
};

const storeRestaurantId = (restaurantId: string | null) => {
  if (typeof window === "undefined") return;
  if (restaurantId) {
    window.localStorage.setItem(ACTIVE_RESTAURANT_STORAGE_KEY, restaurantId);
  } else {
    window.localStorage.removeItem(ACTIVE_RESTAURANT_STORAGE_KEY);
  }
};

const pickActiveRestaurant = (
  restaurants: RestaurantAccess[],
  profileRestaurantId: string | null | undefined,
): RestaurantAccess | null => {
  if (restaurants.length === 0) return null;

  const storedRestaurantId = getStoredRestaurantId();
  return (
    restaurants.find((restaurant) => restaurant.is_active_unit) ??
    restaurants.find((restaurant) => restaurant.restaurant_id === profileRestaurantId) ??
    restaurants.find((restaurant) => restaurant.restaurant_id === storedRestaurantId) ??
    restaurants[0]
  );
};

export function RestaurantAccessProvider({ children }: { children: ReactNode }) {
  const { authUser, appUser, loading: sessionLoading } = useUserSession();
  const [restaurants, setRestaurants] = useState<RestaurantAccess[]>([]);
  const [activeRestaurantId, setActiveRestaurantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (sessionLoading) return;

    if (!authUser?.id) {
      setRestaurants([]);
      setActiveRestaurantId(null);
      storeRestaurantId(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const nextRestaurants = await getMyRestaurantAccess();
      const active = pickActiveRestaurant(nextRestaurants, appUser?.restaurant_id);
      setRestaurants(nextRestaurants);
      setActiveRestaurantId(active?.restaurant_id ?? null);
      storeRestaurantId(active?.restaurant_id ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar unidades");
    } finally {
      setLoading(false);
    }
  }, [appUser?.restaurant_id, authUser?.id, sessionLoading]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const switchRestaurant = useCallback(async (restaurantId: string) => {
    if (!restaurantId || restaurantId === activeRestaurantId) return;

    const previousRestaurantId = activeRestaurantId;
    setSwitching(true);
    setError(null);
    setActiveRestaurantId(restaurantId);
    storeRestaurantId(restaurantId);

    try {
      await setActiveRestaurant(restaurantId);
      await refresh();
      window.dispatchEvent(new Event(PROFILE_UPDATED_EVENT));
    } catch (err) {
      setActiveRestaurantId(previousRestaurantId);
      storeRestaurantId(previousRestaurantId);
      setError(err instanceof Error ? err.message : "Erro ao trocar unidade");
      throw err;
    } finally {
      setSwitching(false);
    }
  }, [activeRestaurantId, refresh]);

  const activeRestaurant = useMemo(
    () => restaurants.find((restaurant) => restaurant.restaurant_id === activeRestaurantId) ?? null,
    [activeRestaurantId, restaurants],
  );

  const value = useMemo(() => ({
    restaurants,
    activeRestaurant,
    activeRestaurantId,
    hasMultipleRestaurants: restaurants.length > 1,
    loading,
    switching,
    error,
    refresh,
    switchRestaurant,
  }), [
    activeRestaurant,
    activeRestaurantId,
    error,
    loading,
    refresh,
    restaurants,
    switching,
    switchRestaurant,
  ]);

  return (
    <RestaurantAccessContext.Provider value={value}>
      {children}
    </RestaurantAccessContext.Provider>
  );
}
