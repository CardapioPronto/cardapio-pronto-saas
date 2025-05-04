
import { useEffect, useState } from "react";
import { Category, Product } from "@/types";
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
import { supabase } from "@/lib/supabase";


interface AddProdutoDialogProps {
  onAddProduto: (produto: Partial<Product>) => void;
  restaurantId: string;
}

export const AddProdutoDialog = ({ onAddProduto, restaurantId }: AddProdutoDialogProps) => {

  const [isOpen, setIsOpen] = useState(false);
  const [novoProduto, setNovoProduto] = useState<Partial<Product>>({
    name: "",
    description: "",
    price: 0,
    category: {
      id: "lanches",
      name: "lanches",
      restaurant_id: restaurantId
    },
    available: true,
  });
  
  const handleAddProduto = () => {
    onAddProduto(novoProduto);
    resetForm();
    setIsOpen(false);
  };
  
  const resetForm = () => {
    setNovoProduto({
      name: "",
      description: "",
      price: 0,
      category: {
        id: "lanches",
        name: "lanches",
        restaurant_id: restaurantId
      },
      available: true,
    });
  };
  
  const handleCancel = () => {
    resetForm();
    setIsOpen(false);
  };

  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoadingCategories(true);
      supabase
        .from('categories')
        .select('id, name, restaurant_id')
        .eq('restaurant_id', restaurantId)
        .then(({ data, error }) => {
          if (error) {
            console.error('Erro ao carregar categorias:', error);
          } else {
            setCategories((data || []).filter((category): category is Category => category.restaurant_id !== null));
          }
          setLoadingCategories(false);
        });
    }
  }, [isOpen, restaurantId]);
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
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
          categories={categories}
        />
      </DialogContent>
    </Dialog>
  );
};
