
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
import { useImageUpload } from "@/hooks/useImageUpload";
import { useStockSettings } from "@/hooks/useStockSettings";

interface EditProdutoDialogProps {
  produto: Product;
  onSave: (produto: Product) => Promise<boolean> | boolean;
  restaurantId: string;
  onClose?: () => void;
  isSaving?: boolean;
}

export const EditProdutoDialog = ({
  produto,
  onSave,
  restaurantId,
  onClose,
  isSaving = false,
}: EditProdutoDialogProps) => {
  const [isOpen, setIsOpen] = useState(true); // Sempre aberto quando o componente existe
  const [produtoEditando, setProdutoEditando] = useState<Product>(produto);
  const { deleteImage } = useImageUpload(restaurantId);
  const { enabled: stockControlEnabled } = useStockSettings(restaurantId);

  // Em edição, só permite contagem inicial quando o produto está sendo
  // ATIVADO agora (antes não era rastreado). Para produtos já rastreados,
  // o saldo só muda via "Ajustar estoque".
  const allowInitialStockEntry =
    !produto.stock_tracking_enabled && Boolean(produtoEditando.stock_tracking_enabled);

  const handleSave = async () => {
    const success = await onSave(produtoEditando);
    if (success) {
      setIsOpen(false);
      onClose?.();
    }
  };

  const handleCancel = async () => {
    if (
      produtoEditando.image_storage_path &&
      produtoEditando.image_storage_path !== produto.image_storage_path
    ) {
      await deleteImage(produtoEditando.image_storage_path);
    }
    setIsOpen(false);
    onClose?.();
  };

  const { categorias, loading } = useCategorias();

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
          saving={isSaving}
          stockControlEnabled={stockControlEnabled}
          allowInitialStockEntry={allowInitialStockEntry}
        />
      </DialogContent>
    </Dialog>
  );
};
