
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface Product {
  id: number;
  name: string;
  popularity: number;
  units: number;
}

interface PopularProductsProps {
  products: Product[];
}

export function PopularProducts({ products }: PopularProductsProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Produtos Populares</CardTitle>
      </CardHeader>
      <CardContent>
        {products && products.length > 0 ? (
          <div className="space-y-4">
            {products.map((product) => (
              <div key={product.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium leading-none">
                    {product.name}
                  </p>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-muted-foreground">
                      {product.units} un.
                    </p>
                    <p className="text-xs font-medium">{product.popularity}%</p>
                  </div>
                </div>
                <Progress value={product.popularity} className="h-1.5" />
              </div>
            ))}
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
