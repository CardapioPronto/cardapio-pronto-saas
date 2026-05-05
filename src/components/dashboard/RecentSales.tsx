
import { memo } from "react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { RecentSale } from "@/services/dashboardService";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const RECENT_SALES_LIMIT = 6;

interface RecentSalesProps {
  sales: RecentSale[];
}

function RecentSalesBase({ sales }: RecentSalesProps) {
  const visibleSales = sales.slice(0, RECENT_SALES_LIMIT);
  const hiddenCount = Math.max(0, sales.length - visibleSales.length);

  const statusLabel = (status: string) => {
    switch (status) {
      case "pendente":
      case "pending":
        return "Pendente";
      case "preparo":
      case "em-andamento":
      case "preparing":
        return "Preparo";
      case "finalizado":
        return "Finalizado";
      case "cancelado":
      case "cancelled":
      case "canceled":
        return "Cancelado";
      default:
        return status;
    }
  };

  return (
    <Card className="flex h-full min-h-[360px] flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-base font-semibold">Vendas recentes</CardTitle>
          <CardDescription>Últimos {RECENT_SALES_LIMIT} pedidos registrados</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        {sales && sales.length > 0 ? (
          <div className="space-y-4">
            {visibleSales.map((sale) => (
              <div key={sale.id} className="flex items-center gap-3">
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-beige/30 text-sm font-semibold">
                  {sale.customer ? sale.customer.substring(0, 1) : "C"}
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="truncate text-sm font-medium leading-none" title={sale.customer || "Cliente"}>
                    {sale.customer || "Cliente"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {sale.time}
                  </p>
                </div>
                <div className="flex flex-shrink-0 flex-col items-end gap-1">
                  <Badge variant={sale.status === "cancelado" ? "destructive" : "secondary"}>
                    {statusLabel(sale.status)}
                  </Badge>
                  <div className="text-sm font-medium">
                    {sale.amount === null ? "Restrito" : formatCurrency(sale.amount)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
            Nenhuma venda recente registrada.
          </div>
        )}
      </CardContent>
      <CardFooter className="border-t px-6 py-3">
        <Button asChild variant="ghost" className="w-full justify-between">
          <Link to="/pedidos">
            {hiddenCount > 0 ? `Ver todos os pedidos (${hiddenCount} mais)` : "Ver todos os pedidos"}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

export const RecentSales = memo(RecentSalesBase);
