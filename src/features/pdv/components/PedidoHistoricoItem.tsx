
import { Button } from "@/components/ui/button";
import { Clock, CheckCircle } from "lucide-react";
import { Pedido } from "../types";

interface PedidoHistoricoItemProps {
  pedido: Pedido;
  alterarStatusPedido: (pedidoId: number, novoStatus: 'em-andamento' | 'finalizado') => void;
}

export const PedidoHistoricoItem = ({ pedido, alterarStatusPedido }: PedidoHistoricoItemProps) => {
  return (
    <div className="border rounded-lg p-4">
      <div className="flex justify-between items-center mb-3">
        <div>
          <h4 className="font-bold">Pedido #{pedido.id} - {pedido.mesa}</h4>
          <p className="text-sm text-gray-500">
            {pedido.timestamp.toLocaleTimeString()} - {pedido.timestamp.toLocaleDateString()}
          </p>
        </div>
        <div className="flex gap-2">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            pedido.status === 'em-andamento' ? 'bg-orange/10 text-orange' : 'bg-green/10 text-green'
          }`}>
            {pedido.status === 'em-andamento' ? 'Em andamento' : 'Finalizado'}
          </span>
        </div>
      </div>
      
      <div className="space-y-2 mb-4">
        {pedido.itensPedido.map((item, idx) => (
          <div key={idx} className="flex justify-between text-sm">
            <span>
              {item.quantidade}x {item.produto.nome}
              {item.observacao && <span className="text-xs text-gray-500 ml-2 italic">({item.observacao})</span>}
            </span>
            <span>R$ {(item.produto.preco * item.quantidade).toFixed(2)}</span>
          </div>
        ))}
      </div>
      
      <div className="flex justify-between items-center pt-3 border-t">
        <div className="font-bold">
          Total: R$ {pedido.total.toFixed(2)}
        </div>
        <div className="flex gap-2">
          {pedido.status === 'em-andamento' ? (
            <Button
              size="sm"
              variant="default"
              onClick={() => alterarStatusPedido(pedido.id, 'finalizado')}
              className="bg-green hover:bg-green-dark"
            >
              <CheckCircle className="mr-1 h-4 w-4" />
              Finalizar
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => alterarStatusPedido(pedido.id, 'em-andamento')}
            >
              <Clock className="mr-1 h-4 w-4" />
              Em andamento
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
