
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ItemPedidoLinha } from "./ItemPedidoLinha";
import { ItemPedido } from "../types";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ComandaPedidoProps {
  tipoPedido: "mesa" | "balcao";
  mesaSelecionada: string;
  itensPedido: ItemPedido[];
  totalPedido: number;
  alterarQuantidade: (index: number, delta: number) => void;
  removerItem: (index: number) => void;
  finalizarPedido: () => void;
  salvandoPedido: boolean;
  nomeCliente?: string;
  setNomeCliente?: (nome: string) => void;
  mesas?: Array<{id: string; number: string}>;
}

export const ComandaPedido = ({
  tipoPedido,
  mesaSelecionada,
  itensPedido,
  totalPedido,
  alterarQuantidade,
  removerItem,
  finalizarPedido,
  salvandoPedido,
  nomeCliente = "",
  setNomeCliente,
  mesas = [],
}: ComandaPedidoProps) => {
  const getMesaDisplay = () => {
    if (!mesaSelecionada) return tipoPedido === "mesa" ? "Mesa não selecionada" : "Balcão";
    
    const mesa = mesas.find(m => m.id === mesaSelecionada);
    if (mesa) {
      return tipoPedido === "mesa" ? `Mesa ${mesa.number}` : `Balcão - Mesa ${mesa.number}`;
    }
    
    return tipoPedido === "mesa" ? "Mesa não encontrada" : "Balcão";
  };

  const tituloComanda = getMesaDisplay();

  return (
    <div className="sticky top-4">
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <span>Comanda: {tituloComanda}</span>
            <span className="text-sm font-normal text-muted-foreground">
              {itensPedido.length} {itensPedido.length === 1 ? "item" : "itens"}
            </span>
          </CardTitle>
        </CardHeader>

        <CardContent className="border-y py-4 space-y-4">
          {itensPedido.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <p>Nenhum item adicionado</p>
              <p className="text-sm">
                Clique nos produtos para adicionar à comanda
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {itensPedido.map((item, index) => (
                <ItemPedidoLinha
                  key={`${item.produto.id}-${index}`}
                  item={item}
                  index={index}
                  alterarQuantidade={alterarQuantidade}
                  removerItem={removerItem}
                />
              ))}
            </div>
          )}
          
          {/* Campo opcional para nome do cliente */}
          {setNomeCliente && (
            <div className="pt-4">
              <Label htmlFor="nome-cliente" className="text-sm">
                Nome do cliente (opcional)
              </Label>
              <Input
                id="nome-cliente"
                placeholder="Informe o nome do cliente"
                value={nomeCliente}
                onChange={(e) => setNomeCliente(e.target.value)}
                className="mt-1"
              />
            </div>
          )}
        </CardContent>

        <CardFooter className="flex-col pt-4">
          <div className="flex justify-between w-full mb-4 font-bold text-lg">
            <span>Total</span>
            <span>R$ {totalPedido.toFixed(2)}</span>
          </div>

          <Button
            onClick={finalizarPedido}
            className="w-full"
            size="lg"
            disabled={itensPedido.length === 0 || salvandoPedido}
          >
            {salvandoPedido ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Finalizando...
              </>
            ) : (
              "Finalizar Pedido"
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};
