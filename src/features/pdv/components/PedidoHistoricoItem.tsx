
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Pedido, PedidoStatus } from "../types";
import { AlertCircle, CheckCircle, ChevronDown, ChevronUp, Clock, Package, Printer, User, XCircle } from "lucide-react";
import { usePrint } from "@/hooks/usePrint";

interface PedidoHistoricoItemProps {
  pedido: Pedido;
  alterarStatusPedido: (pedidoId: number | string, novoStatus: PedidoStatus) => void;
  restaurantName: string;
}

export const PedidoHistoricoItem = ({
  pedido,
  alterarStatusPedido,
  restaurantName,
}: PedidoHistoricoItemProps) => {
  const [detalhesAbertos, setDetalhesAbertos] = useState(false);
  const { printOrder, printing } = usePrint();
  const dataFormatada = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(pedido.timestamp);

  const getStatusInfo = (status: string) => {
    switch (status) {
      case "pendente":
        return {
          label: "Pendente",
          icon: <AlertCircle className="h-4 w-4 mr-1" />,
          bgClass: "bg-orange-100 text-orange-800"
        };
      case "preparo":
      case "em-andamento":
        return {
          label: "Em preparo",
          icon: <Package className="h-4 w-4 mr-1" />,
          bgClass: "bg-blue-100 text-blue-800"
        };
      case "finalizado":
        return {
          label: "Finalizado",
          icon: <CheckCircle className="h-4 w-4 mr-1" />,
          bgClass: "bg-green-100 text-green-800"
        };
      case "cancelado":
        return {
          label: "Cancelado",
          icon: <XCircle className="h-4 w-4 mr-1" />,
          bgClass: "bg-red-100 text-red-800"
        };
      default:
        return {
          label: status,
          icon: <Clock className="h-4 w-4 mr-1" />,
          bgClass: "bg-gray-100 text-gray-800"
        };
    }
  };

  const statusInfo = getStatusInfo(pedido.status);
  const nomeCliente = pedido.cliente || pedido.clientName || "Cliente não informado";
  const totalItens = pedido.itensPedido.reduce((total, item) => total + item.quantidade, 0);

  const handlePrint = () => {
    printOrder(pedido, { restaurantName });
  };

  return (
    <Card className={pedido.status === 'finalizado' ? 'bg-gray-50' : ''}>
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">
            {pedido.mesa}
          </CardTitle>
          <div className={`px-2 py-1 rounded text-xs flex items-center ${statusInfo.bgClass}`}>
            {statusInfo.icon}
            {statusInfo.label}
          </div>
        </div>
        <div className="text-sm text-muted-foreground">{dataFormatada}</div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-md border bg-background p-3">
          <div className="flex items-start gap-2">
            <User className="mt-0.5 h-4 w-4 text-muted-foreground" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Cliente</p>
              <p className="truncate text-sm font-medium">{nomeCliente}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {totalItens} {totalItens === 1 ? "item" : "itens"} no pedido
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setDetalhesAbertos((aberto) => !aberto)}
            className="h-8 px-2"
          >
            {detalhesAbertos ? (
              <>
                <ChevronUp className="mr-1 h-4 w-4" />
                Ver menos
              </>
            ) : (
              <>
                <ChevronDown className="mr-1 h-4 w-4" />
                Ver mais
              </>
            )}
          </Button>
        </div>

        {detalhesAbertos && (
          <ul className="max-h-56 space-y-2 overflow-y-auto rounded-md border bg-muted/30 p-3">
            {pedido.itensPedido.map((item, index) => (
              <li key={`${item.produto.id}-${index}`} className="text-sm">
                <div className="flex justify-between gap-3">
                  <span className="min-w-0">
                    {item.quantidade}x {item.produto.name}
                  </span>
                  <span className="shrink-0">R$ {(item.produto.price * item.quantidade).toFixed(2)}</span>
                </div>
                {item.observacao && (
                  <p className="mt-1 text-xs text-muted-foreground">Obs: {item.observacao}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
      <CardFooter className="flex-col items-stretch gap-2 border-t pt-4">
        <div className="flex justify-between font-medium">
          <span>Total</span>
          <span>R$ {pedido.total.toFixed(2)}</span>
        </div>

        {/* Botão de Imprimir - sempre disponível */}
        <Button 
          variant="outline" 
          onClick={handlePrint}
          disabled={printing}
          className="border-gray-500 text-gray-700 hover:bg-gray-50"
        >
          <Printer className="h-4 w-4 mr-1" />
          {printing ? 'Imprimindo...' : 'Imprimir Comanda'}
        </Button>
        
        {pedido.status === 'pendente' && (
          <Button 
            variant="outline" 
            onClick={() => alterarStatusPedido(pedido.id, 'preparo')}
            className="border-blue-500 text-blue-500 hover:bg-blue-50"
          >
            <Package className="h-4 w-4 mr-1" /> Iniciar preparo
          </Button>
        )}
        
        {(pedido.status === 'preparo' || pedido.status === 'em-andamento') && (
          <Button 
            variant="outline" 
            onClick={() => alterarStatusPedido(pedido.id, 'finalizado')}
            className="border-green-500 text-green-500 hover:bg-green-50"
          >
            <CheckCircle className="h-4 w-4 mr-1" /> Marcar como finalizado
          </Button>
        )}
        
        {pedido.status !== 'cancelado' && pedido.status !== 'finalizado' && (
          <Button 
            variant="outline" 
            onClick={() => alterarStatusPedido(pedido.id, 'cancelado')}
            className="border-red-500 text-red-500 hover:bg-red-50"
          >
            <XCircle className="h-4 w-4 mr-1" /> Cancelar
          </Button>
        )}
        
        {pedido.status === 'cancelado' && (
          <Button 
            variant="outline" 
            onClick={() => alterarStatusPedido(pedido.id, 'pendente')}
          >
            <Clock className="h-4 w-4 mr-1" /> Reabrir pedido
          </Button>
        )}
        
        {pedido.status === 'finalizado' && (
          <Button 
            variant="outline" 
            onClick={() => alterarStatusPedido(pedido.id, 'pendente')}
          >
            <Clock className="h-4 w-4 mr-1" /> Reabrir pedido
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};
