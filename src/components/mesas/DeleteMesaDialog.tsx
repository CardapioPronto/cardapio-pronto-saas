import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Mesa } from "@/types/mesa";

interface DeleteMesaDialogProps {
  mesa: Mesa | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: (id: string) => Promise<void>;
}

export function DeleteMesaDialog({ mesa, open, onOpenChange, onDelete }: DeleteMesaDialogProps) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!mesa) return;

    setLoading(true);
    try {
      await onDelete(mesa.id);
      onOpenChange(false);
    } catch (error) {
      console.error("Erro ao remover mesa:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Remover Mesa</DialogTitle>
          <DialogDescription>
            Tem certeza que deseja remover a mesa "{mesa?.number}"? 
            Esta ação não pode ser desfeita.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={loading}
          >
            {loading ? "Removendo..." : "Remover"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}