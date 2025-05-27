
import { useEffect, useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { StatsGrid } from "@/components/dashboard/StatsGrid";
import { RecentSales } from "@/components/dashboard/RecentSales";
import { PopularProducts } from "@/components/dashboard/PopularProducts";
import { useDashboardData } from "@/hooks/useDashboardData";
import { supabase } from "@/lib/supabase";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { icons, Info } from "lucide-react";

const Dashboard = () => {
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    const getRestaurant = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setFetchError("Usuário não autenticado");
          return;
        }

        const { data, error } = await supabase
          .from("users")
          .select("restaurant_id")
          .eq("id", user.id)
          .single();

        if (error) {
          console.error("Erro ao buscar restaurante:", error);
          setFetchError(null);
          return;
        }

        if (data?.restaurant_id) {
          setRestaurantId(data.restaurant_id);
        } else {
          setFetchError(null);
        }
      } catch (error) {
        console.error("Erro ao buscar restaurante:", error);
        setFetchError(null);
      }
    };

    getRestaurant();
  }, []);

  const { stats: rawStats, loading, recentSales, popularProducts } = useDashboardData(restaurantId);
  const stats = rawStats.map(stat => ({
    ...stat,
    icon: typeof stat.icon === "string" ? icons[stat.icon] : stat.icon,
  }));
  
  return (
    <DashboardLayout title="Dashboard">
      {fetchError && (
        <Alert variant="destructive" className="mb-6">
          <Info className="h-4 w-4" />
          <AlertTitle>Erro</AlertTitle>
          <AlertDescription>{fetchError}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <p>Carregando dados...</p>
        </div>
      ) : (
        <>
          <StatsGrid stats={stats} />

          <div className="grid gap-6 mt-6 md:grid-cols-2">
            <RecentSales sales={recentSales} />
            <PopularProducts products={popularProducts} />
          </div>
        </>
      )}
    </DashboardLayout>
  );
};

export default Dashboard;
