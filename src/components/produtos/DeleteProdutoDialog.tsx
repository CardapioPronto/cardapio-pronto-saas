
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Product } from "@/types";

interface DeleteProdutoDialogProps {
  produto: Product;
  onDelete: (id: string) => Promise<boolean> | boolean;
  onClose?: () => void;
  isDeleting?: boolean;
}

export const DeleteProdutoDialog = ({
  produto,
  onDelete,
  onClose,
  isDeleting = false,
}: DeleteProdutoDialogProps) => {
  const [open, setOpen] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const busy = deleting || isDeleting;

  const handleClose = () => {
    setOpen(false);
    onClose?.();
  };

  const handleDelete = async () => {
    setDeleting(true);
    const success = await onDelete(produto.id);
    setDeleting(false);
    if (success) {
      handleClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Excluir Produto</DialogTitle>
          <DialogDescription>
            Tem certeza que deseja excluir o produto{" "}
            <strong>{produto.name}</strong>? Esta ação não poderá ser desfeita.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={busy}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={busy}>
            {busy ? "Excluindo..." : "Excluir"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
