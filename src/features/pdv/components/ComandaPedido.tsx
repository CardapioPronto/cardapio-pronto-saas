
import { Product } from "@/types";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ItemPedidoLinha } from "./ItemPedidoLinha";

interface ComandaPedidoProps {
  tipoPedido: "mesa" | "balcao";
  mesaSelecionada: string;
  itensPedido: Array<{
    produto: Product;
    quantidade: number;
    observacao?: string;
  }>;
  totalPedido: number;
  alterarQuantidade: (index: number, delta: number) => void;
  removerItem: (index: number) => void;
  finalizarPedido: () => void;
}

export const ComandaPedido = ({
  tipoPedido,
  mesaSelecionada,
  itensPedido,
  totalPedido,
  alterarQuantidade,
  removerItem,
  finalizarPedido,
}: ComandaPedidoProps) => {
  const titulo = tipoPedido === "mesa" ? `Mesa ${mesaSelecionada}` : "Balcão";

  return (
    <Card className="h-fit sticky top-4">
      <CardHeader>
        <CardTitle className="text-lg">{titulo} - Comanda</CardTitle>
      </CardHeader>
      <CardContent className="max-h-[50vh] overflow-y-auto space-y-2">
        {itensPedido.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Nenhum item adicionado ao pedido
          </div>
        ) : (
          itensPedido.map((item, index) => (
            <ItemPedidoLinha
              key={`${item.produto.id}-${index}`}
              item={item}
              index={index}
              alterarQuantidade={alterarQuantidade}
              removerItem={removerItem}
            />
          ))
        )}
      </CardContent>
      <CardFooter className="flex flex-col gap-3 border-t pt-4">
        <div className="flex justify-between w-full text-lg font-bold">
          <span>Total</span>
          <span>R$ {totalPedido.toFixed(2)}</span>
        </div>
        <Button
          onClick={finalizarPedido}
          disabled={itensPedido.length === 0}
          className="w-full"
        >
          Finalizar Pedido
        </Button>
      </CardFooter>
    </Card>
  );
};
