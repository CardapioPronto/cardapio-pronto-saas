
import { useState } from "react";
import { Product } from "@/types";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ProdutoForm } from "./ProdutoForm";

interface EditProdutoDialogProps {
  produto: Product;
  onSave: (produto: Product) => void;
  restaurantId: string;
}

export const EditProdutoDialog = ({
  produto,
  onSave,
  restaurantId
}: EditProdutoDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [produtoEditando, setProdutoEditando] = useState<Product | null>(null);
  
  const handleOpenDialog = () => {
    setProdutoEditando({ ...produto });
    setIsOpen(true);
  };
  
  const handleSave = () => {
    if (produtoEditando) {
      onSave(produtoEditando);
      setIsOpen(false);
    }
  };
  
  const handleCancel = () => {
    setProdutoEditando(null);
    setIsOpen(false);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" onClick={handleOpenDialog}>
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Produto</DialogTitle>
        </DialogHeader>

        {produtoEditando && (
          <ProdutoForm
            produto={produtoEditando}
            onChangeProduto={(produto) => setProdutoEditando({ ...produtoEditando, ...produto })}
            onSave={handleSave}
            onCancel={handleCancel}
            title="Editar Produto"
            saveButtonText="Salvar"
            restaurantId={restaurantId}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};
