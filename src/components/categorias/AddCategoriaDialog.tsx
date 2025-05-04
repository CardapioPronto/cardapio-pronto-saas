
import { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { CategoriaForm } from "./CategoriaForm";

interface AddCategoriaDialogProps {
  onAddCategoria: (name: string) => Promise<boolean>;
}

export const AddCategoriaDialog = ({ onAddCategoria }: AddCategoriaDialogProps) => {
  const [open, setOpen] = useState(false);

  const handleAddCategoria = async (name: string) => {
    const success = await onAddCategoria(name);
    if (success) {
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2" />
          Nova Categoria
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar Nova Categoria</DialogTitle>
        </DialogHeader>
        <CategoriaForm 
          onSubmit={handleAddCategoria} 
          initialValues={{ name: "" }} 
        />
      </DialogContent>
    </Dialog>
  );
};
