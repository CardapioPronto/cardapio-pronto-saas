
import { Product, Category } from "@/types";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ImageUpload } from "./ImageUpload";

interface ProdutoFormProps {
  produto: Partial<Product>;
  onChangeProduto: (produto: Partial<Product>) => void;
  onSave: () => void;
  onCancel: () => void;
  title: string;
  saveButtonText: string;
  restaurantId: string;
  categories: Category[];
  loadingCategories: boolean;
  saving?: boolean;
}

export const ProdutoForm = ({
  produto,
  onChangeProduto,
  onSave,
  onCancel,
  title,
  saveButtonText,
  restaurantId,
  categories,
  loadingCategories,
  saving = false,
}: ProdutoFormProps) => {
  return (
    <>
      <div className="grid gap-4 py-4">
        <div className="grid gap-2">
          <Label htmlFor="nome">Nome*</Label>
          <Input
            id="nome"
            value={produto.name || ""}
            onChange={(e) =>
              onChangeProduto({ ...produto, name: e.target.value })
            }
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="descricao">Descrição*</Label>
          <Input
            id="descricao"
            value={produto.description || ""}
            onChange={(e) =>
              onChangeProduto({
                ...produto,
                description: e.target.value,
              })
            }
          />
        </div>

        <ImageUpload
          currentImageUrl={produto.image_url ?? undefined}
          onImageChange={({ imageUrl, storagePath }) =>
            onChangeProduto({
              ...produto,
              image_url: imageUrl || undefined,
              image_storage_path: storagePath,
            })
          }
          restaurantId={restaurantId}
        />

        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="preco">Preço (R$)*</Label>
            <Input
              id="preco"
              type="number"
              step="0.01"
              min="0.01"
              value={produto.price ?? ""}
              onChange={(e) =>
                onChangeProduto({
                  ...produto,
                  price: e.target.value === "" ? undefined : parseFloat(e.target.value),
                })
              }
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="categoria">Categoria*</Label>
            {loadingCategories ? (
              <div className="flex items-center justify-center">
                <span>Carregando categorias...</span>
              </div>
            ) : (
              <Select
                value={produto.category?.id}
                onValueChange={(value) => {
                  const selectedCategory = categories.find(
                    (cat) => cat.id === value
                  );
                  if (selectedCategory) {
                    onChangeProduto({
                      ...produto,
                      category: selectedCategory,
                    });
                  }
                }}
              >
                <SelectTrigger id="categoria" disabled={loadingCategories || categories.length === 0}>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="disponivel"
            title="Disponível para venda"
            checked={produto.available ?? true}
            onChange={(e) =>
              onChangeProduto({
                ...produto,
                available: e.target.checked,
              })
            }
          />
          <Label htmlFor="disponivel">Disponível para venda</Label>
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          Cancelar
        </Button>
        <Button type="button" onClick={onSave} disabled={saving}>
          {saving ? "Salvando..." : saveButtonText}
        </Button>
      </div>
    </>
  );
};
