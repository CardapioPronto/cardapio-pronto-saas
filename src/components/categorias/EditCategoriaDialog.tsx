
import { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Edit } from "lucide-react";
import { CategoriaForm } from "./CategoriaForm";
import { Category } from "@/types";
import { DialogTrigger } from "@radix-ui/react-dialog";

interface EditCategoriaDialogProps {
  categoria: Category;
  onEditCategoria: (id: string, name: string) => Promise<boolean>;
}

export const EditCategoriaDialog = ({ 
  categoria, 
  onEditCategoria 
}: EditCategoriaDialogProps) => {
  const [open, setOpen] = useState(false);

  const handleEditCategoria = async (name: string): Promise<boolean> => {
    const success = await onEditCategoria(categoria.id, name);
    if (success) {
      setOpen(false);
    }
    return success;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Edit className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Categoria</DialogTitle>
        </DialogHeader>
        <CategoriaForm 
          onSubmit={handleEditCategoria} 
          initialValues={{ name: categoria.name }} 
        />
      </DialogContent>
    </Dialog>
  );
};
