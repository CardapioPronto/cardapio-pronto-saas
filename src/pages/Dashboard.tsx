
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { StatsGrid } from "@/components/dashboard/StatsGrid";
import { QRCodePromotionCard } from "@/components/dashboard/QRCodePromotionCard";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useSystemInitialization } from "@/hooks/useSystemInitialization";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { usePermissionsV2 } from "@/hooks/usePermissionsV2";
import { RecentSales as RecentSalesComponent } from "@/components/dashboard/RecentSales";
import { PopularProducts as PopularProductsComponent } from "@/components/dashboard/PopularProducts";
import { DashboardExecutiveSummary } from "@/components/dashboard/DashboardExecutiveSummary";
import { OperationsOverview } from "@/components/dashboard/OperationsOverview";
import { OnboardingChecklistCard } from "@/components/dashboard/OnboardingChecklistCard";
import { FollowUpFirstWeekCard } from "@/components/dashboard/FollowUpFirstWeekCard";
import { PWAInstallDiagnosticCard } from "@/components/dashboard/PWAInstallDiagnosticCard";
import { Skeleton } from "@/components/ui/skeleton";

const DashboardSkeleton = () => (
  <div className="space-y-5">
    <Skeleton className="h-72 w-full lg:h-64" />
    <Skeleton className="h-48 w-full" />
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {[...Array(4)].map((_, index) => (
        <Skeleton key={index} className="h-32 w-full" />
      ))}
    </div>
    <div className="grid gap-4 lg:grid-cols-2">
      <Skeleton className="h-80 w-full" />
      <Skeleton className="h-80 w-full" />
    </div>
  </div>
);

const Dashboard = () => {
  const { user, loading: userLoading } = useCurrentUser();
  const { hasPermission, loading: permissionsLoading } = usePermissionsV2();
  const canViewFinancials = hasPermission("orders_metrics_view");
  const canAccessPDV = hasPermission("pdv_access");
  const canManageProducts = hasPermission("products_view");
  const canManageSettings = hasPermission("settings_view");
  const canManageOnboarding = hasPermission("settings_manage");
  const { stats, loading: statsLoading, recentSales, popularProducts, overview } = useDashboardData(
    user?.restaurant_id || null,
    canViewFinancials
  );
  const { initialized, loading: initLoading } = useSystemInitialization();

  if (userLoading || permissionsLoading || statsLoading || initLoading) {
    return (
      <DashboardLayout title="Dashboard">
        <DashboardSkeleton />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Dashboard">
      <div className="space-y-5">
        <DashboardExecutiveSummary overview={overview} />

        <OnboardingChecklistCard
          restaurantId={user?.restaurant_id || null}
          currentUserId={user?.id || null}
          overview={overview}
          canAccessPDV={canAccessPDV}
          canManageProducts={canManageProducts}
          canManageSettings={canManageSettings}
          canManageOnboarding={canManageOnboarding}
        />

        <FollowUpFirstWeekCard restaurantId={user?.restaurant_id || null} overview={overview} />

        <PWAInstallDiagnosticCard restaurantId={user?.restaurant_id || null} />

        <OperationsOverview overview={overview} />

        <QRCodePromotionCard />
        
        <StatsGrid stats={stats} />
        
        <div className="grid gap-4 lg:grid-cols-2">
          <PopularProductsComponent products={popularProducts} canViewFinancials={canViewFinancials} />
          <RecentSalesComponent sales={recentSales} />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
