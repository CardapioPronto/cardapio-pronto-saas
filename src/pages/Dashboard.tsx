
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { StatsGrid } from "@/components/dashboard/StatsGrid";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useSystemInitialization } from "@/hooks/useSystemInitialization";
import { PopularProducts } from "@/components/dashboard/PopularProducts";
import { RecentSales } from "@/components/dashboard/RecentSales";
import { useCurrentUser } from "@/hooks/useCurrentUser";

const Dashboard = () => {
  const { user } = useCurrentUser();
  const { stats, loading: statsLoading, recentSales, popularProducts } = useDashboardData(user?.restaurant_id || null);
  const { initialized, loading: initLoading } = useSystemInitialization();

  if (statsLoading || initLoading || !initialized) {
    return (
      <DashboardLayout title="Dashboard">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Carregando dashboard...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Dashboard">
      <div className="space-y-6">
        <StatsGrid stats={stats} />
        
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Produtos Populares</CardTitle>
              <CardDescription>
                Os produtos mais vendidos este mês
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PopularProducts products={popularProducts} />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Vendas Recentes</CardTitle>
              <CardDescription>
                Últimas transações realizadas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RecentSales sales={recentSales} />
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
