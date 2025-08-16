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
import { Area } from "@/types/area";

interface DeleteAreaDialogProps {
  area: Area | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: (id: string) => Promise<void>;
}

export function DeleteAreaDialog({ area, open, onOpenChange, onDelete }: DeleteAreaDialogProps) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!area) return;

    setLoading(true);
    try {
      await onDelete(area.id);
      onOpenChange(false);
    } catch (error) {
      console.error("Erro ao remover área:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Remover Área</DialogTitle>
          <DialogDescription>
            Tem certeza que deseja remover a área "{area?.name}"? 
            Esta ação não pode ser desfeita e todas as mesas associadas a esta área também serão afetadas.
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