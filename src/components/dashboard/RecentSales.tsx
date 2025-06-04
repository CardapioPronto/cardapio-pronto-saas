
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { RecentSale } from "@/services/dashboardService";

interface RecentSalesProps {
  sales: RecentSale[];
}

export function RecentSales({ sales }: RecentSalesProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Vendas Recentes</CardTitle>
      </CardHeader>
      <CardContent>
        {sales && sales.length > 0 ? (
          <div className="space-y-4">
            {sales.map((sale) => (
              <div key={sale.id} className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-beige/30 flex items-center justify-center text-sm font-semibold">
                  {sale.customer ? sale.customer.substring(0, 1) : "C"}
                </div>
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {sale.customer || "Cliente"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {sale.time}
                  </p>
                </div>
                <div className="font-medium">{formatCurrency(sale.amount)}</div>
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
