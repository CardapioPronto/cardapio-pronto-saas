import { Pedido } from "@/features/pdv/types";
import { formatDate } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

interface PrintOrderTemplateProps {
  pedido: Pedido;
  restaurantName: string;
}

export const PrintOrderTemplate = ({ pedido, restaurantName }: PrintOrderTemplateProps) => {
  return (
    <div className="print-template p-4 bg-white text-black font-mono text-sm max-w-md mx-auto">
      {/* Cabeçalho */}
      <div className="text-center mb-4">
        <h1 className="text-lg font-bold uppercase">{restaurantName}</h1>
        <p className="text-xs">COMANDA DE COZINHA</p>
      </div>

      <Separator className="mb-4" />

      {/* Informações do Pedido */}
      <div className="space-y-2 mb-4">
        <div className="flex justify-between">
          <span className="font-bold">MESA:</span>
          <span>{pedido.mesa}</span>
        </div>
        
        {pedido.cliente && (
          <div className="flex justify-between">
            <span className="font-bold">CLIENTE:</span>
            <span>{pedido.cliente}</span>
          </div>
        )}

        <div className="flex justify-between">
          <span className="font-bold">DATA/HORA:</span>
          <span>{formatDate(pedido.timestamp.toISOString())}</span>
        </div>

        <div className="flex justify-between">
          <span className="font-bold">STATUS:</span>
          <span className="uppercase">{pedido.status}</span>
        </div>
      </div>

      <Separator className="mb-4" />

      {/* Itens do Pedido */}
      <div className="mb-4">
        <h3 className="font-bold mb-2 text-center">ITENS DO PEDIDO</h3>
        
        {pedido.itensPedido.map((item, index) => (
          <div key={index} className="mb-3 border-b border-dashed border-gray-300 pb-2">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="font-bold">
                  {item.quantidade}x {item.produto.name}
                </div>
                
                {item.produto.description && (
                  <div className="text-xs text-gray-600 mt-1">
                    {item.produto.description}
                  </div>
                )}
                
                {item.observacao && (
                  <div className="text-xs mt-1 bg-yellow-100 p-1 rounded">
                    <strong>OBS:</strong> {item.observacao}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <Separator className="mb-4" />

      {/* Total */}
      <div className="text-center">
        <div className="text-lg font-bold">
          TOTAL: R$ {pedido.total.toFixed(2)}
        </div>
      </div>

      <Separator className="mt-4" />

      {/* Rodapé */}
      <div className="text-center text-xs mt-4 space-y-1">
        <p>*** COMANDA DE COZINHA ***</p>
        <p>Preparar com atenção às observações</p>
        <p>Imprresso em: {new Date().toLocaleString('pt-BR')}</p>
      </div>
    </div>
  );
};