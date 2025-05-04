
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface PDVTabsProps {
  visualizacaoAtiva: "novo" | "historico";
  onChangeVisualizacao: (value: "novo" | "historico") => void;
  tipoPedido: "mesa" | "balcao";
  onChangeTipoPedido: (value: "mesa" | "balcao") => void;
  showPedidoTabs: boolean;
}

export const PDVTabs = ({
  visualizacaoAtiva,
  onChangeVisualizacao,
  tipoPedido,
  onChangeTipoPedido,
  showPedidoTabs
}: PDVTabsProps) => {
  return (
    <div className="mb-4 flex justify-between items-center">
      <div>
        <Tabs value={visualizacaoAtiva} onValueChange={(v) => onChangeVisualizacao(v as "novo" | "historico")}>
          <TabsList>
            <TabsTrigger value="novo">Novo Pedido</TabsTrigger>
            <TabsTrigger value="historico">Histórico</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      
      {showPedidoTabs && (
        <Tabs value={tipoPedido} onValueChange={(v) => onChangeTipoPedido(v as "mesa" | "balcao")}>
          <TabsList>
            <TabsTrigger value="mesa">Mesa</TabsTrigger>
            <TabsTrigger value="balcao">Balcão</TabsTrigger>
          </TabsList>
        </Tabs>
      )}
    </div>
  );
};
