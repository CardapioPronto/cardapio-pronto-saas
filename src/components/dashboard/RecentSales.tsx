
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface SaleItem {
  id: number;
  table: number;
  commandaNumber: number;
  time: string;
  value: number;
}

interface RecentSalesProps {
  sales: SaleItem[];
}

export const RecentSales = ({ sales }: RecentSalesProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Vendas recentes</CardTitle>
        <CardDescription>Últimos pedidos realizados no sistema</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sales.map((sale) => (
            <div key={sale.id} className="flex justify-between items-center border-b pb-3">
              <div>
                <p className="font-medium">Mesa {sale.table} - Comanda #{sale.commandaNumber}</p>
                <p className="text-sm text-muted-foreground">{sale.time}</p>
              </div>
              <span className="font-medium">{sale.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
