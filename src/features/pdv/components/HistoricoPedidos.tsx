
import { Pedido } from "../types";
import { Card } from "@/components/ui/card";
import { PedidoHistoricoItem } from "./PedidoHistoricoItem";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useState } from "react";

interface HistoricoPedidosProps {
  pedidosHistorico: Pedido[];
  alterarStatusPedido: (pedidoId: number | string, novoStatus: 'em-andamento' | 'finalizado' | 'pendente' | 'preparo' | 'cancelado') => void;
  onAtualizar: () => Promise<void>;
}

export const HistoricoPedidos = ({
  pedidosHistorico,
  alterarStatusPedido,
  onAtualizar,
}: HistoricoPedidosProps) => {
  const [atualizando, setAtualizando] = useState(false);

  const handleAtualizar = async () => {
    setAtualizando(true);
    try {
      await onAtualizar();
    } finally {
      setAtualizando(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end mb-4">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleAtualizar}
          disabled={atualizando}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${atualizando ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

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
