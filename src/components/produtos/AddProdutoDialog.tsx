
import { useState } from "react";
import { Product } from "@/types";
import { Plus } from "lucide-react";
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
import { useImageUpload } from "@/hooks/useImageUpload";

interface AddProdutoDialogProps {
  onAddProduto: (produto: Partial<Product>) => Promise<boolean>;
  restaurantId: string;
  isSaving?: boolean;
}

export const AddProdutoDialog = ({ onAddProduto, restaurantId, isSaving = false }: AddProdutoDialogProps) => {

  const [isOpen, setIsOpen] = useState(false);
  const [novoProduto, setNovoProduto] = useState<Partial<Product>>({
    name: "",
    description: "",
    price: undefined,
    category: null,
    available: true,
  });
  
  const { categorias, loading } = useCategorias();
  const { deleteImage } = useImageUpload(restaurantId);

  const handleAddProduto = async () => {
    const success = await onAddProduto(novoProduto);
    if (success) {
      resetForm();
      setIsOpen(false);
    }
  };
  
  const resetForm = () => {
    setNovoProduto({
      name: "",
      description: "",
      price: undefined,
      category: null,
      image_url: undefined,
      image_storage_path: null,
      available: true,
    });
  };
  
  const handleCancel = async () => {
    if (novoProduto.image_storage_path) {
      await deleteImage(novoProduto.image_storage_path);
    }
    resetForm();
    setIsOpen(false);
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (open) {
          setIsOpen(true);
        } else {
          void handleCancel();
        }
      }}
    >
      <DialogTrigger asChild>
        <Button className="bg-green hover:bg-green-dark text-white">
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Produto
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar Novo Produto</DialogTitle>
          <DialogDescription>
            Preencha os campos para adicionar um novo produto ao cardápio
          </DialogDescription>
        </DialogHeader>

        <ProdutoForm
          produto={novoProduto}
          onChangeProduto={setNovoProduto}
          onSave={handleAddProduto}
          onCancel={handleCancel}
          title="Adicionar Novo Produto"
          saveButtonText="Adicionar"
          restaurantId={restaurantId}
          categories={categorias}
          loadingCategories={loading}
          saving={isSaving}
        />
      </DialogContent>
    </Dialog>
  );
};
