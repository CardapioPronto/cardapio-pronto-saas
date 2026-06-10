import { createContext } from "react";
import type { RestaurantAccess } from "@/types/multiunit";

export interface RestaurantAccessContextType {
  restaurants: RestaurantAccess[];
  activeRestaurant: RestaurantAccess | null;
  activeRestaurantId: string | null;
  hasMultipleRestaurants: boolean;
  loading: boolean;
  switching: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  switchRestaurant: (restaurantId: string) => Promise<void>;
}

export const RestaurantAccessContext = createContext<RestaurantAccessContextType | undefined>(undefined);
