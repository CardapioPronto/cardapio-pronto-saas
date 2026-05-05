
import { memo, useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { PopularProduct } from "@/services/dashboardService";
import { formatCurrency } from "@/lib/utils";

interface PopularProductsProps {
  products: PopularProduct[];
  canViewFinancials?: boolean;
}

function PopularProductsBase({ products, canViewFinancials = false }: PopularProductsProps) {
  // Calculate maximum sales to normalize popularity percentages
  const maxSales = useMemo(
    () => (products.length > 0 ? Math.max(...products.map((p) => p.sales)) : 1),
    [products]
  );

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-base font-semibold">Produtos populares</CardTitle>
          <CardDescription>Mais vendidos nos últimos 30 dias</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {products && products.length > 0 ? (
          <div className="space-y-4">
            {products.map((product) => {
              // Calculate popularity percentage based on max sales
              const popularity = Math.round((product.sales / maxSales) * 100);
              
              return (
                <div key={product.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="truncate text-sm font-medium leading-none" title={product.name}>
                      {product.name}
                    </p>
                    <div className="flex flex-shrink-0 items-center gap-2">
                      <p className="text-xs text-muted-foreground">
                        {product.sales} un.
                      </p>
                      {canViewFinancials && (
                        <p className="text-xs font-medium">{formatCurrency(product.revenue)}</p>
                      )}
                    </div>
                  </div>
                  <Progress value={popularity} className="h-1.5" />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
            Nenhum produto vendido ainda.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export const PopularProducts = memo(PopularProductsBase);
