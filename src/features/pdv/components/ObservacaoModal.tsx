
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Produto } from "../types";

interface ObservacaoModalProps {
  produtoSelecionado: Produto | null;
  observacaoAtual: string;
  setObservacaoAtual: (obs: string) => void;
  confirmarAdicao: () => void;
  cancelarAdicao: () => void;
}

export const ObservacaoModal = ({
  produtoSelecionado,
  observacaoAtual,
  setObservacaoAtual,
  confirmarAdicao,
  cancelarAdicao,
}: ObservacaoModalProps) => {
  if (!produtoSelecionado) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-full max-w-md">
        <h3 className="text-lg font-bold mb-2">{produtoSelecionado.nome}</h3>
        <p className="text-green font-medium mb-4">R$ {produtoSelecionado.preco.toFixed(2)}</p>
        
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Observações:</label>
          <Textarea
            placeholder="Ex: sem cebola, bem passado, etc."
            value={observacaoAtual}
            onChange={(e) => setObservacaoAtual(e.target.value)}
            className="resize-none"
          />
        </div>
        
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={cancelarAdicao}>
            Cancelar
          </Button>
          <Button onClick={confirmarAdicao}>
            Adicionar ao Pedido
          </Button>
        </div>
      </div>
    </div>
  );
};
