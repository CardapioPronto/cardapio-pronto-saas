
import { Pedido } from "../types";
import { PedidoHistoricoItem } from "./PedidoHistoricoItem";

interface HistoricoPedidosProps {
  pedidosHistorico: Pedido[];
  alterarStatusPedido: (pedidoId: number, novoStatus: 'em-andamento' | 'finalizado') => void;
}

export const HistoricoPedidos = ({
  pedidosHistorico,
  alterarStatusPedido
}: HistoricoPedidosProps) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 border">
      <h3 className="font-bold text-lg mb-4">Histórico de Pedidos</h3>
      
      {pedidosHistorico.length === 0 ? (
        <div className="text-center text-gray-500 py-12">
          Não há pedidos registrados
        </div>
      ) : (
        <div className="space-y-6">
          {pedidosHistorico.map((pedido) => (
            <PedidoHistoricoItem
              key={pedido.id}
              pedido={pedido}
              alterarStatusPedido={alterarStatusPedido}
            />
          ))}
        </div>
      )}
    </div>
  );
};
