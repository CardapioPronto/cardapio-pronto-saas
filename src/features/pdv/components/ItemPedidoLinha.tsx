import { Button } from "@/components/ui/button";
import { Minus, Plus, Trash } from "lucide-react";
import { ItemPedido } from "../types";

interface ItemPedidoLinhaProps {
  item: ItemPedido;
  index: number;
  alterarQuantidade: (index: number, delta: number) => void;
  removerItem: (index: number) => void;
}

export const ItemPedidoLinha = ({
  item,
  index,
  alterarQuantidade,
  removerItem,
}: ItemPedidoLinhaProps) => {
  const { produto, quantidade, observacao } = item;
  const subtotal = produto.price * quantidade;

  return (
    <div className="py-2 border-b last:border-b-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 font-medium leading-tight">
          <span className="line-clamp-2">{produto.name}</span>
        </div>
        <div className="shrink-0 font-medium">R$ {subtotal.toFixed(2)}</div>
      </div>
      
      {observacao && (
        <div className="mt-1 line-clamp-2 text-sm text-muted-foreground">
          Obs: {observacao}
        </div>
      )}
      
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={() => alterarQuantidade(index, -1)}
          >
            <Minus className="h-3 w-3" />
          </Button>
          
          <span className="w-6 text-center">{quantidade}</span>
          
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={() => alterarQuantidade(index, 1)}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
        
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-red-500"
          onClick={() => removerItem(index)}
        >
          <Trash className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
};
