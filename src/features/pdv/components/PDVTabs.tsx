
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { History, ReceiptText, Store, UtensilsCrossed } from "lucide-react";

interface PDVTabsProps {
  visualizacaoAtiva: "novo" | "historico";
  onChangeVisualizacao: (value: "novo" | "historico") => void;
  tipoPedido: "mesa" | "balcao";
  onChangeTipoPedido: (value: "mesa" | "balcao") => void;
  showPedidoTabs: boolean;
  canViewHistory: boolean;
  className?: string;
}

export const PDVTabs = ({
  visualizacaoAtiva,
  onChangeVisualizacao,
  tipoPedido,
  onChangeTipoPedido,
  showPedidoTabs,
  canViewHistory,
  className,
}: PDVTabsProps) => {
  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between", className)}>
      <div>
        <Tabs value={visualizacaoAtiva} onValueChange={(v) => onChangeVisualizacao(v as "novo" | "historico")}>
          <TabsList className="h-11 bg-muted/70">
            <TabsTrigger value="novo" className="h-9 gap-2 px-4">
              <ReceiptText className="h-4 w-4" />
              Novo pedido
            </TabsTrigger>
            {canViewHistory && (
              <TabsTrigger value="historico" className="h-9 gap-2 px-4">
                <History className="h-4 w-4" />
                Histórico
              </TabsTrigger>
            )}
          </TabsList>
        </Tabs>
      </div>
      
      {showPedidoTabs && (
        <Tabs value={tipoPedido} onValueChange={(v) => onChangeTipoPedido(v as "mesa" | "balcao")}>
          <TabsList className="h-11 bg-muted/70">
            <TabsTrigger value="mesa" className="h-9 gap-2 px-4">
              <UtensilsCrossed className="h-4 w-4" />
              Mesa
            </TabsTrigger>
            <TabsTrigger value="balcao" className="h-9 gap-2 px-4">
              <Store className="h-4 w-4" />
              Balcão
            </TabsTrigger>
          </TabsList>
        </Tabs>
      )}
    </div>
  );
};
