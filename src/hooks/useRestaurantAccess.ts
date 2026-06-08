import { useContext } from "react";
import { RestaurantAccessContext } from "./restaurantAccessContext";

export const useRestaurantAccess = () => {
  const context = useContext(RestaurantAccessContext);
  if (!context) {
    throw new Error("useRestaurantAccess must be used within RestaurantAccessProvider");
  }
  return context;
};
