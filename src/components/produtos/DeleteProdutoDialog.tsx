import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { Product } from "@/types";

interface DeleteProdutoDialogProps {
  produto: Product;
  onDelete: (id: string) => void;
}

export const DeleteProdutoDialog = ({
  produto,
  onDelete,
}: DeleteProdutoDialogProps) => {
  const [open, setOpen] = useState(false);

  const handleDelete = () => {
    onDelete(produto.id);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="text-red-500">
          <Trash2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Excluir Produto</DialogTitle>
          <DialogDescription>
            Tem certeza que deseja excluir o produto{" "}
            <strong>{produto.name}</strong>? Esta ação não poderá ser desfeita.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={handleDelete}>
            Excluir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
