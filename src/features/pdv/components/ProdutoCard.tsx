
import { Card, CardContent } from "@/components/ui/card";
import { Product } from "@/types";

interface ProdutoCardProps {
  produto: Product;
  onSelecionar: (produto: Product) => void;
}

export const ProdutoCard = ({ produto, onSelecionar }: ProdutoCardProps) => {
  return (
    <Card 
      key={produto.id} 
      className="cursor-pointer hover:bg-gray-50 transition-colors" 
      onClick={() => onSelecionar(produto)}
    >
      <CardContent className="p-4">
        <div className="font-medium">{produto.name}</div>
        <div className="text-green font-bold">R$ {produto.price}</div>
      </CardContent>
    </Card>
  );
};
