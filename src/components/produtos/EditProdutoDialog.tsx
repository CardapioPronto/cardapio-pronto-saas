
import { useState } from "react";
import { Product } from "@/types";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ProdutoForm } from "./ProdutoForm";
import { useCategorias } from "@/hooks/useCategorias";

interface EditProdutoDialogProps {
  produto: Product;
  onSave: (produto: Product) => void;
  restaurantId: string;
}

export const EditProdutoDialog = ({
  produto,
  onSave,
  restaurantId,
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

  const { categorias, loading } = useCategorias();

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
          <DialogDescription className="sr-only">
            Formulário para editar os dados do produto selecionado.
          </DialogDescription>
        </DialogHeader>

        {produtoEditando && (
          <ProdutoForm
            produto={produtoEditando}
            onChangeProduto={(produto) =>
              setProdutoEditando({ ...produtoEditando, ...produto })
            }
            onSave={handleSave}
            onCancel={handleCancel}
            title="Editar Produto"
            saveButtonText="Salvar"
            restaurantId={restaurantId}
            categories={categorias}
            loadingCategories={loading}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};
