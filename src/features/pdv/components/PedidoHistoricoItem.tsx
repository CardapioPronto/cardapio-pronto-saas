
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Pedido } from "../types";
import { AlertCircle, CheckCircle, Clock, Package, XCircle } from "lucide-react";

interface PedidoHistoricoItemProps {
  pedido: Pedido;
  alterarStatusPedido: (pedidoId: number, novoStatus: 'em-andamento' | 'finalizado' | 'pendente' | 'preparo' | 'cancelado') => void;
}

export const PedidoHistoricoItem = ({
  pedido,
  alterarStatusPedido,
}: PedidoHistoricoItemProps) => {
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
      <CardContent>
        <ul className="space-y-1">
          {pedido.itensPedido.map((item, index) => (
            <li key={index} className="text-sm">
              <div className="flex justify-between">
                <span>{item.quantidade}x {item.produto.name}</span>
                <span>R$ {(item.produto.price * item.quantidade).toFixed(2)}</span>
              </div>
              {item.observacao && (
                <p className="text-xs text-muted-foreground">Obs: {item.observacao}</p>
              )}
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter className="flex-col items-stretch gap-2 border-t pt-4">
        <div className="flex justify-between font-medium">
          <span>Total</span>
          <span>R$ {pedido.total.toFixed(2)}</span>
        </div>
        
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
