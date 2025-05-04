
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Pedido } from "../types";

interface PedidoHistoricoItemProps {
  pedido: Pedido;
  alterarStatusPedido: (pedidoId: number, novoStatus: 'em-andamento' | 'finalizado') => void;
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

  return (
    <Card className={pedido.status === 'finalizado' ? 'bg-gray-50' : ''}>
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">
            {pedido.mesa.startsWith('Mesa') ? pedido.mesa : `Balcão #${pedido.id}`}
          </CardTitle>
          <div className={`px-2 py-1 rounded text-xs ${
            pedido.status === 'em-andamento' 
              ? 'bg-blue-100 text-blue-800' 
              : 'bg-green-100 text-green-800'
          }`}>
            {pedido.status === 'em-andamento' ? 'Em andamento' : 'Finalizado'}
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
        {pedido.status === 'em-andamento' ? (
          <Button 
            variant="outline" 
            onClick={() => alterarStatusPedido(pedido.id, 'finalizado')}
          >
            Marcar como Finalizado
          </Button>
        ) : (
          <Button 
            variant="outline" 
            onClick={() => alterarStatusPedido(pedido.id, 'em-andamento')}
          >
            Reabrir Pedido
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};
