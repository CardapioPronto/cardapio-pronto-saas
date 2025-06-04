
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { PopularProduct } from "@/services/dashboardService";

interface PopularProductsProps {
  products: PopularProduct[];
}

export function PopularProducts({ products }: PopularProductsProps) {
  // Calculate maximum sales to normalize popularity percentages
  const maxSales = products.length > 0 
    ? Math.max(...products.map(product => product.sales)) 
    : 1;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Produtos Populares</CardTitle>
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
                    <p className="text-sm font-medium leading-none">
                      {product.name}
                    </p>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-muted-foreground">
                        {product.sales} un.
                      </p>
                      <p className="text-xs font-medium">{popularity}%</p>
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
