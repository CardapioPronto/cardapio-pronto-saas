
import { Card, CardContent } from "@/components/ui/card";
import { Product } from "@/types";

interface ProdutoCardProps {
  produto: Product;
  onSelecionar: (produto: Product) => void;
}

export const ProdutoCard = ({ produto, onSelecionar }: ProdutoCardProps) => {
  const getProductImage = (imageUrl?: string) => {
    return imageUrl || 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=300&fit=crop&crop=center';
  };

  return (
    <Card 
      key={produto.id} 
      className="cursor-pointer hover:bg-gray-50 transition-colors" 
      onClick={() => onSelecionar(produto)}
    >
      <CardContent className="p-4">
        <div className="w-full h-32 mb-2 overflow-hidden rounded-md">
          <img 
            src={getProductImage(produto.image_url)} 
            alt={produto.name} 
            className="w-full h-full object-cover"
          />
        </div>
        <div className="font-medium">{produto.name}</div>
        <div className="text-sm text-muted-foreground line-clamp-2">
          {produto.description}
        </div>
        <div className="text-green font-bold mt-1">
          R$ {produto.price.toFixed(2)}
        </div>
        {!produto.available && (
          <div className="mt-1 text-xs px-2 py-0.5 bg-orange-100 text-orange-600 rounded-full inline-block">
            Indisponível
          </div>
        )}
      </CardContent>
    </Card>
  );
};
