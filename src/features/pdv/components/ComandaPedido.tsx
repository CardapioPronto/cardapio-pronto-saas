
import { Button } from "@/components/ui/button";
import { CreditCard, QrCode } from "lucide-react";
import { ItemPedido } from "../types";
import { ItemPedidoLinha } from "./ItemPedidoLinha";

interface ComandaPedidoProps {
  tipoPedido: "mesa" | "balcao";
  mesaSelecionada: string;
  itensPedido: ItemPedido[];
  totalPedido: number;
  alterarQuantidade: (itemIndex: number, delta: number) => void;
  removerItem: (itemIndex: number) => void;
  finalizarPedido: () => void;
}

export const ComandaPedido = ({
  tipoPedido,
  mesaSelecionada,
  itensPedido,
  totalPedido,
  alterarQuantidade,
  removerItem,
  finalizarPedido
}: ComandaPedidoProps) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-4 border">
      <h3 className="font-bold text-lg mb-4">
        {tipoPedido === "mesa" ? `Comanda Mesa ${mesaSelecionada}` : "Comanda Balcão"}
      </h3>
      
      <div className="max-h-[400px] overflow-y-auto mb-4">
        {itensPedido.length === 0 ? (
          <div className="text-center text-gray-500 py-6">
            Adicione itens ao pedido
          </div>
        ) : (
          <div className="space-y-2">
            {itensPedido.map((item, index) => (
              <ItemPedidoLinha
                key={index}
                item={item}
                index={index}
                alterarQuantidade={alterarQuantidade}
                removerItem={removerItem}
              />
            ))}
          </div>
        )}
      </div>

      <div className="border-t pt-4">
        <div className="flex justify-between text-lg font-bold mb-4">
          <span>Total</span>
          <span className="text-green">R$ {totalPedido.toFixed(2)}</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Button 
            className="bg-green hover:bg-green-dark text-white w-full"
            onClick={finalizarPedido}
          >
            <CreditCard className="mr-2 h-4 w-4" />
            Finalizar Pedido
          </Button>
          <Button variant="outline" className="w-full">
            <QrCode className="mr-2 h-4 w-4" />
            QR Code
          </Button>
        </div>
      </div>
    </div>
  );
};
