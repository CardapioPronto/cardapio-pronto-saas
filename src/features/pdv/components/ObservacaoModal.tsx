
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Product } from "@/types";

interface ObservacaoModalProps {
  produtoSelecionado: Product | null;
  observacaoAtual: string;
  setObservacaoAtual: (observacao: string) => void;
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
  const isOpen = produtoSelecionado !== null;

  return (
    <Dialog open={isOpen} onOpenChange={cancelarAdicao}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            Adicionar {produtoSelecionado?.name || "produto"}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <div className="col-span-4">
              <Textarea
                id="observacao"
                placeholder="Alguma observação? Ex: sem cebola, bem passado, etc."
                value={observacaoAtual}
                onChange={(e) => setObservacaoAtual(e.target.value)}
                className="h-32"
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={cancelarAdicao}>
            Cancelar
          </Button>
          <Button onClick={confirmarAdicao}>
            Adicionar ao Pedido
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
