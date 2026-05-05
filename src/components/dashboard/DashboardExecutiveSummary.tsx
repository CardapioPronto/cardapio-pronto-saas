import { Link } from "react-router-dom";
import { ArrowRight, ClipboardList, QrCode, ShoppingCart, Store, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DashboardOverview } from "@/services/dashboardService";

interface DashboardExecutiveSummaryProps {
  overview: DashboardOverview | null;
}

const formatToday = () =>
  new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(new Date());

export const DashboardExecutiveSummary = ({ overview }: DashboardExecutiveSummaryProps) => {
  const restaurantName = overview?.restaurantName || "Restaurante";
  const hasDelayedOrders = (overview?.overdueOpenOrders || 0) > 0;
  const hasOpenOrdersToday = (overview?.openOrdersToday || 0) > 0;
  const menuReady = !!overview?.menuThemeConfigured && (overview?.availableProducts || 0) > 0;

  const statusText = hasDelayedOrders
    ? `${overview?.overdueOpenOrders} pedido${overview?.overdueOpenOrders === 1 ? "" : "s"} de dias anteriores precisa${overview?.overdueOpenOrders === 1 ? "" : "m"} de revisão`
    : hasOpenOrdersToday
      ? `${overview?.openOrdersToday} pedido${overview?.openOrdersToday === 1 ? "" : "s"} aberto${overview?.openOrdersToday === 1 ? "" : "s"} hoje`
      : "Operação sem pedidos abertos no momento";

  return (
    <Card className="overflow-hidden border-primary/15 bg-card">
      <CardContent className="p-0">
        <div className="grid gap-0 lg:grid-cols-[1fr_360px]">
          <div className="p-5 sm:p-6">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <Badge variant={hasDelayedOrders ? "destructive" : "secondary"} className="w-fit">
                {hasDelayedOrders ? "Atenção operacional" : "Painel executivo"}
              </Badge>
              <span className="text-sm capitalize text-muted-foreground">{formatToday()}</span>
            </div>

            <div className="max-w-3xl">
              <h2 className="text-2xl font-semibold tracking-normal text-foreground sm:text-3xl">
                {restaurantName}
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {statusText}
              </p>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-md border bg-muted/25 p-3">
                <ShoppingCart className="mb-2 h-4 w-4 text-orange" />
                <p className="text-xl font-semibold">{overview?.openOrdersToday || 0}</p>
                <p className="text-xs text-muted-foreground">Pedidos hoje</p>
              </div>
              <div className="rounded-md border bg-muted/25 p-3">
                <TriangleAlert className="mb-2 h-4 w-4 text-destructive" />
                <p className="text-xl font-semibold">{overview?.overdueOpenOrders || 0}</p>
                <p className="text-xs text-muted-foreground">Abertos antigos</p>
              </div>
              <div className="rounded-md border bg-muted/25 p-3">
                <Store className="mb-2 h-4 w-4 text-green" />
                <p className="text-xl font-semibold">{overview?.availableProducts || 0}</p>
                <p className="text-xs text-muted-foreground">Produtos ativos</p>
              </div>
            </div>
          </div>

          <div className="border-t bg-muted/20 p-5 lg:border-l lg:border-t-0 sm:p-6">
            <p className="text-sm font-medium">Atalhos principais</p>
            <div className="mt-4 space-y-2">
              <Button asChild className="w-full justify-between">
                <Link to="/pdv">
                  Abrir PDV
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-between">
                <Link to="/pedidos">
                  Ver pedidos
                  <ClipboardList className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-between">
                <Link to="/cardapio">
                  {menuReady ? "Gerenciar cardápio" : "Finalizar cardápio"}
                  <QrCode className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
