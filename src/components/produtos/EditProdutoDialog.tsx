
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
  onSave: (produto: Product) => Promise<boolean> | boolean;
  restaurantId: string;
}

export const EditProdutoDialog = ({
  produto,
  onSave,
  restaurantId,
}: EditProdutoDialogProps) => {
  const [isOpen, setIsOpen] = useState(true); // Sempre aberto quando o componente existe
  const [produtoEditando, setProdutoEditando] = useState<Product>(produto);

  const handleSave = async () => {
    const success = await onSave(produtoEditando);
    if (success) {
      setIsOpen(false);
    }
  };

  const handleCancel = () => {
    setIsOpen(false);
  };

  const { categorias, loading } = useCategorias();

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Produto</DialogTitle>
          <DialogDescription className="sr-only">
            Formulário para editar os dados do produto selecionado.
          </DialogDescription>
        </DialogHeader>

        <ProdutoForm
          produto={produtoEditando}
          onChangeProduto={(produtoData) => 
            setProdutoEditando({ ...produtoEditando, ...produtoData })
          }
          onSave={handleSave}
          onCancel={handleCancel}
          title="Editar Produto"
          saveButtonText="Salvar"
          restaurantId={restaurantId}
          categories={categorias}
          loadingCategories={loading}
        />
      </DialogContent>
    </Dialog>
  );
};
