
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface PopularProduct {
  id: number;
  name: string;
  popularity: number;
  units: number;
}

interface PopularProductsProps {
  products: PopularProduct[];
}

export const PopularProducts = ({ products }: PopularProductsProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Produtos mais vendidos</CardTitle>
        <CardDescription>Items mais populares do seu cardápio</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {products.map((product) => (
            <div key={product.id} className="flex justify-between items-center border-b pb-3">
              <div className="w-full pr-4">
                <p className="font-medium">{product.name}</p>
                <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1.5">
                  <div 
                    className="bg-green h-1.5 rounded-full" 
                    style={{ width: `${product.popularity}%` }}
                  ></div>
                </div>
              </div>
              <span className="font-medium whitespace-nowrap">{product.units} un</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
