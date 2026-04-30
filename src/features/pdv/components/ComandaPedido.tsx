
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ItemPedidoLinha } from "./ItemPedidoLinha";
import { ItemPedido } from "../types";
import { AlertCircle, Loader2, Printer } from "lucide-react";
import { usePrint } from "@/hooks/usePrint";
import { MesaStatus } from "@/types/mesa";

interface ComandaPedidoProps {
  tipoPedido: "mesa" | "balcao";
  mesaSelecionada: string;
  itensPedido: ItemPedido[];
  totalPedido: number;
  alterarQuantidade: (index: number, delta: number) => void;
  removerItem: (index: number) => void;
  finalizarPedido: () => void;
  salvandoPedido: boolean;
  nomeCliente: string;
  restaurantName: string;
  mesaError?: string;
  mesas?: Array<{id: string; number: string; status: MesaStatus}>;
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
  nomeCliente,
  restaurantName,
  mesaError,
  mesas = [],
}: ComandaPedidoProps) => {
  const { printOrder, printing } = usePrint();
  const mesaAtual = mesas.find(m => m.id === mesaSelecionada);

  const getMesaDisplay = () => {
    if (!mesaSelecionada) return tipoPedido === "mesa" ? "Mesa não selecionada" : "Balcão";
    
    if (mesaAtual) {
      return tipoPedido === "mesa" ? `Mesa ${mesaAtual.number}` : `Balcão - Mesa ${mesaAtual.number}`;
    }
    
    return tipoPedido === "mesa" ? "Mesa não encontrada" : "Balcão";
  };

  const tituloComanda = getMesaDisplay();
  const precisaMesa = tipoPedido === "mesa" && !mesaSelecionada;

  const handlePrintPreview = () => {
    if (itensPedido.length === 0) return;
    
    // Criar um pedido temporário para visualização
    const pedidoTemp = {
      id: 'preview',
      mesa: getMesaDisplay(),
      cliente: nomeCliente || undefined,
      itensPedido,
      status: 'pendente' as const,
      timestamp: new Date(),
      total: totalPedido,
    };
    printOrder(pedidoTemp, { restaurantName });
  };

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
        </CardContent>

        <CardFooter className="flex-col pt-4">
          {precisaMesa && itensPedido.length > 0 && (
            <div className="mb-4 flex w-full items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                {mesaError || "Selecione uma mesa para finalizar este pedido ou altere o tipo para balcão."}
              </span>
            </div>
          )}

          {mesaAtual?.status === "ocupada" && itensPedido.length > 0 && (
            <div className="mb-4 flex w-full items-start gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>Esta mesa já está ocupada. O novo pedido será vinculado ao atendimento aberto da mesa.</span>
            </div>
          )}

          <div className="flex justify-between w-full mb-4 font-bold text-lg">
            <span>Total</span>
            <span>R$ {totalPedido.toFixed(2)}</span>
          </div>

          {/* Botão de Visualizar Impressão */}
          {itensPedido.length > 0 && (
            <Button
              onClick={handlePrintPreview}
              variant="outline"
              className="w-full mb-2"
              disabled={printing}
            >
              <Printer className="mr-2 h-4 w-4" />
              {printing ? 'Imprimindo...' : 'Visualizar Impressão'}
            </Button>
          )}

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
              precisaMesa ? "Selecionar mesa para finalizar" : "Finalizar Pedido"
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};
