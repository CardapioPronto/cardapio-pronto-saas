
import { memo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { RecentSale } from "@/services/dashboardService";

interface RecentSalesProps {
  sales: RecentSale[];
}

function RecentSalesBase({ sales }: RecentSalesProps) {
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
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-base font-semibold">Vendas recentes</CardTitle>
          <CardDescription>Últimos pedidos registrados</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {sales && sales.length > 0 ? (
          <div className="space-y-4">
            {sales.map((sale) => (
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
    </Card>
  );
}

export const RecentSales = memo(RecentSalesBase);
