
import { Card, CardContent } from "@/components/ui/card";
import { Produto } from "../types";

interface ProdutoCardProps {
  produto: Produto;
  onSelecionar: (produto: Produto) => void;
}

export const ProdutoCard = ({ produto, onSelecionar }: ProdutoCardProps) => {
  return (
    <Card 
      key={produto.id} 
      className="cursor-pointer hover:bg-gray-50 transition-colors" 
      onClick={() => onSelecionar(produto)}
    >
      <CardContent className="p-4">
        <div className="font-medium">{produto.nome}</div>
        <div className="text-green font-bold">R$ {produto.preco.toFixed(2)}</div>
      </CardContent>
    </Card>
  );
};
