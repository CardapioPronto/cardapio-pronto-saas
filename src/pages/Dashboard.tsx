
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { StatsGrid } from "@/components/dashboard/StatsGrid";
import { QRCodePromotionCard } from "@/components/dashboard/QRCodePromotionCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useSystemInitialization } from "@/hooks/useSystemInitialization";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { RecentSales as RecentSalesComponent } from "@/components/dashboard/RecentSales";
import { PopularProducts as PopularProductsComponent } from "@/components/dashboard/PopularProducts";

const Dashboard = () => {
  const { user, loading: userLoading } = useCurrentUser();
  const { stats, loading: statsLoading, recentSales, popularProducts } = useDashboardData(user?.restaurant_id || null);
  const { initialized, loading: initLoading } = useSystemInitialization();

  if (userLoading || statsLoading || initLoading) {
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
        <QRCodePromotionCard />
        
        <StatsGrid stats={stats} />
        
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Produtos Populares</CardTitle>
            </CardHeader>
            <CardContent>
              <PopularProductsComponent products={popularProducts} />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Vendas Recentes</CardTitle>
            </CardHeader>
            <CardContent>
              <RecentSalesComponent sales={recentSales} />
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
