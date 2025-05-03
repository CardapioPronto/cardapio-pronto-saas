
import { useEffect, useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { StatsGrid } from "@/components/dashboard/StatsGrid";
import { RecentSales } from "@/components/dashboard/RecentSales";
import { PopularProducts } from "@/components/dashboard/PopularProducts";
import { useDashboardData } from "@/hooks/useDashboardData";
import { supabase } from "@/lib/supabase";

const Dashboard = () => {
  const [restaurantId, setRestaurantId] = useState<string | null>(null);

  useEffect(() => {
    const getRestaurant = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("users")
        .select("restaurant_id")
        .eq("id", user.id)
        .single();

      if (data?.restaurant_id) {
        setRestaurantId(data.restaurant_id);
      }
    };

    getRestaurant();
  }, []);

  const { stats, loading, recentSales, popularProducts } = useDashboardData(restaurantId);
  
  return (
    <DashboardLayout title="Dashboard">
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
