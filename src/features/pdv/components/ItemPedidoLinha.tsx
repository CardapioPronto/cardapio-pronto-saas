
import { Button } from "@/components/ui/button";
import { Plus, Minus, Trash2 } from "lucide-react";
import { ItemPedido } from "../types";

interface ItemPedidoLinhaProps {
  item: ItemPedido;
  index: number;
  alterarQuantidade: (itemIndex: number, delta: number) => void;
  removerItem: (itemIndex: number) => void;
}

export const ItemPedidoLinha = ({ 
  item, 
  index, 
  alterarQuantidade, 
  removerItem 
}: ItemPedidoLinhaProps) => {
  return (
    <div className="flex justify-between items-start border-b pb-2">
      <div className="flex-1">
        <p className="font-medium">{item.produto.nome}</p>
        <p className="text-sm text-muted-foreground">
          R$ {item.produto.preco.toFixed(2)} x {item.quantidade}
        </p>
        {item.observacao && (
          <p className="text-xs text-gray-500 italic mt-1">Obs: {item.observacao}</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button 
          size="icon" 
          variant="outline" 
          className="h-7 w-7" 
          onClick={() => alterarQuantidade(index, -1)}
        >
          <Minus className="h-3 w-3" />
        </Button>
        <span className="w-5 text-center">{item.quantidade}</span>
        <Button 
          size="icon" 
          variant="outline" 
          className="h-7 w-7" 
          onClick={() => alterarQuantidade(index, 1)}
        >
          <Plus className="h-3 w-3" />
        </Button>
        <Button 
          size="icon" 
          variant="ghost" 
          className="h-7 w-7 text-red-500" 
          onClick={() => removerItem(index)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
