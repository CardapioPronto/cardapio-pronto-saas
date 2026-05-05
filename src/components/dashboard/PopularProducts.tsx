
import { memo, useMemo } from "react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { PopularProduct } from "@/services/dashboardService";
import { formatCurrency } from "@/lib/utils";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const POPULAR_PRODUCTS_LIMIT = 5;

interface PopularProductsProps {
  products: PopularProduct[];
  canViewFinancials?: boolean;
}

function PopularProductsBase({ products, canViewFinancials = false }: PopularProductsProps) {
  const visibleProducts = products.slice(0, POPULAR_PRODUCTS_LIMIT);
  const hiddenCount = Math.max(0, products.length - visibleProducts.length);

  // Calculate maximum sales to normalize popularity percentages
  const maxSales = useMemo(
    () => (visibleProducts.length > 0 ? Math.max(...visibleProducts.map((p) => p.sales)) : 1),
    [visibleProducts]
  );

  return (
    <Card className="flex h-full min-h-[360px] flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-base font-semibold">Produtos populares</CardTitle>
          <CardDescription>Top {POPULAR_PRODUCTS_LIMIT} dos últimos 30 dias</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        {products && products.length > 0 ? (
          <div className="space-y-4">
            {visibleProducts.map((product) => {
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
      <CardFooter className="border-t px-6 py-3">
        <Button asChild variant="ghost" className="w-full justify-between">
          <Link to="/relatorios">
            {hiddenCount > 0 ? `Ver relatório completo (${hiddenCount} mais)` : "Ver relatório completo"}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

export const PopularProducts = memo(PopularProductsBase);
