
import { Pedido } from "../types";
import { Card } from "@/components/ui/card";
import { PedidoHistoricoItem } from "./PedidoHistoricoItem";

interface HistoricoPedidosProps {
  pedidosHistorico: Pedido[];
  alterarStatusPedido: (pedidoId: number, novoStatus: 'em-andamento' | 'finalizado') => void;
}

export const HistoricoPedidos = ({
  pedidosHistorico,
  alterarStatusPedido,
}: HistoricoPedidosProps) => {
  return (
    <div className="space-y-4">
      {pedidosHistorico.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Nenhum pedido registrado</p>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
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
