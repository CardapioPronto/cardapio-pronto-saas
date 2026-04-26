
import { memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Product } from "@/types";
import produtoPadrao from "@/assets/produto-padrao.jpg";

interface ProdutoCardProps {
  produto: Product;
  onSelecionar: (produto: Product) => void;
}

const ProdutoCardBase = ({ produto, onSelecionar }: ProdutoCardProps) => {
  const imageSrc = produto.image_url || produtoPadrao;

  return (
    <Card 
      key={produto.id} 
      className="cursor-pointer hover:bg-gray-50 transition-colors" 
      onClick={() => onSelecionar(produto)}
    >
      <CardContent className="p-4">
        <div className="w-full h-32 mb-2 overflow-hidden rounded-md">
          <img 
            src={imageSrc}
            alt={produto.name} 
            loading="lazy"
            decoding="async"
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

export const ProdutoCard = memo(ProdutoCardBase);
