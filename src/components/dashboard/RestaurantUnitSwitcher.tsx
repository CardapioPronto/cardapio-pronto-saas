import { Building2, Check, ChevronsUpDown, Loader2, Network } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { useRestaurantAccess } from "@/hooks/useRestaurantAccess";
import { cn } from "@/lib/utils";
import type { RestaurantAccessType } from "@/types/multiunit";

const accessLabel: Record<RestaurantAccessType, string> = {
  owner: "Dono",
  manager: "Gerente",
  employee: "Equipe",
  viewer: "Leitura",
};

export const RestaurantUnitSwitcher = () => {
  const navigate = useNavigate();
  const {
    restaurants,
    activeRestaurant,
    activeRestaurantId,
    hasMultipleRestaurants,
    loading,
    switching,
    switchRestaurant,
  } = useRestaurantAccess();

  if (loading || !hasMultipleRestaurants || !activeRestaurant) return null;

  const handleSwitch = async (restaurantId: string) => {
    try {
      await switchRestaurant(restaurantId);
      toast.success("Unidade ativa alterada.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível trocar a unidade.");
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="hidden h-9 max-w-[260px] justify-between gap-2 px-3 md:inline-flex"
          disabled={switching}
        >
          {switching ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
          ) : (
            <Building2 className="h-4 w-4 shrink-0 text-primary" />
          )}
          <span className="truncate">{activeRestaurant.restaurant_name}</span>
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{activeRestaurant.restaurant_name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {activeRestaurant.group_name || "Rede Pubfy"}
              </p>
            </div>
            <Badge variant="secondary" className="shrink-0">
              {accessLabel[activeRestaurant.access_type]}
            </Badge>
          </div>
        </div>
        <Separator />
        <div className="max-h-72 overflow-y-auto p-2">
          {restaurants.map((restaurant) => {
            const active = restaurant.restaurant_id === activeRestaurantId;
            return (
              <button
                key={restaurant.restaurant_id}
                type="button"
                onClick={() => void handleSwitch(restaurant.restaurant_id)}
                disabled={active || switching}
                className={cn(
                  "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors",
                  active ? "bg-primary/10 text-primary" : "hover:bg-muted",
                )}
              >
                <Building2 className="h-4 w-4 shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{restaurant.restaurant_name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {accessLabel[restaurant.access_type]}
                    {restaurant.is_group_master ? " - Matriz" : ""}
                  </span>
                </span>
                {active && <Check className="h-4 w-4 shrink-0" />}
              </button>
            );
          })}
        </div>
        <Separator />
        <div className="p-2">
          <Button
            type="button"
            variant="ghost"
            className="w-full justify-start"
            onClick={() => navigate("/multiunidade")}
          >
            <Network className="mr-2 h-4 w-4" />
            Rede e unidades
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};
