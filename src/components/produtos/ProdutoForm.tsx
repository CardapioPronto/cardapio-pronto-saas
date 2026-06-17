
import { Product, Category } from "@/types";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
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
  /**
   * Quando false, a seção "Estoque" não aparece — mesmo que o produto
   * já tenha `stock_tracking_enabled`. O dono do restaurante precisa
   * ligar a chave geral em `Personalização → Controle de estoque`
   * antes de gerenciar saldos.
   */
  stockControlEnabled?: boolean;
  /**
   * Quando true, exibe o input de "contagem inicial" no momento da
   * criação/ativação. Em edição de produto já rastreado, o saldo é
   * alterado pela ação "Ajustar estoque" (modal próprio).
   */
  allowInitialStockEntry?: boolean;
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
  stockControlEnabled = false,
  allowInitialStockEntry = false,
}: ProdutoFormProps) => {
  const trackingEnabled = Boolean(produto.stock_tracking_enabled);
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

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
            <Label htmlFor="custo">Custo unitário (R$)</Label>
            <Input
              id="custo"
              type="number"
              step="0.01"
              min="0"
              value={produto.cost_price ?? ""}
              placeholder="Opcional"
              onChange={(e) =>
                onChangeProduto({
                  ...produto,
                  cost_price: e.target.value === "" ? null : parseFloat(e.target.value),
                })
              }
            />
            <p className="text-xs text-muted-foreground">
              Usado apenas para estimar margem nos relatórios.
            </p>
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

        <div className="rounded-lg border border-border p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <Label htmlFor="multi-flavor-enabled" className="text-sm font-medium">
                Combinar sabores
              </Label>
              <p className="text-xs text-muted-foreground">
                Permite que o cliente escolha este item junto de outro produto da mesma categoria, como pizzas de dois sabores.
              </p>
            </div>
            <Switch
              id="multi-flavor-enabled"
              checked={Boolean(produto.multi_flavor_enabled)}
              onCheckedChange={(value) =>
                onChangeProduto({
                  ...produto,
                  multi_flavor_enabled: value,
                })
              }
            />
          </div>
        </div>

        {stockControlEnabled && (
          <div className="rounded-lg border border-border p-4 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <Label htmlFor="stock-tracking" className="text-sm font-medium">
                  Controlar estoque deste produto
                </Label>
                <p className="text-xs text-muted-foreground">
                  Vendas (cardápio público e PDV) deduzem o saldo automaticamente. Cancelamentos restauram.
                </p>
              </div>
              <Switch
                id="stock-tracking"
                checked={trackingEnabled}
                onCheckedChange={(value) =>
                  onChangeProduto({
                    ...produto,
                    stock_tracking_enabled: value,
                    // Ao desligar, limpa campos auxiliares para não ficarem fantasmas no banco.
                    ...(value
                      ? {}
                      : {
                          stock_min_quantity: null,
                          stock_is_fractional: false,
                        }),
                  })
                }
              />
            </div>

            {trackingEnabled && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {allowInitialStockEntry && (
                  <div className="grid gap-2">
                    <Label htmlFor="stock-initial">Contagem inicial</Label>
                    <Input
                      id="stock-initial"
                      type="number"
                      min={0}
                      step={produto.stock_is_fractional ? "0.001" : "1"}
                      value={produto.stock_quantity ?? 0}
                      onChange={(e) =>
                        onChangeProduto({
                          ...produto,
                          stock_quantity:
                            e.target.value === "" ? 0 : Math.max(parseFloat(e.target.value) || 0, 0),
                        })
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Pode começar com 0 e registrar entrada depois.
                    </p>
                  </div>
                )}

                <div className="grid gap-2">
                  <Label htmlFor="stock-min">Saldo mínimo (opcional)</Label>
                  <Input
                    id="stock-min"
                    type="number"
                    min={0}
                    step={produto.stock_is_fractional ? "0.001" : "1"}
                    value={produto.stock_min_quantity ?? ""}
                    placeholder="Sem alerta"
                    onChange={(e) =>
                      onChangeProduto({
                        ...produto,
                        stock_min_quantity:
                          e.target.value === "" ? null : Math.max(parseFloat(e.target.value) || 0, 0),
                      })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Quando o saldo cai a este valor, o produto é destacado na lista.
                  </p>
                </div>

                <div className="flex items-center gap-2 sm:col-span-2">
                  <Switch
                    id="stock-fractional"
                    checked={Boolean(produto.stock_is_fractional)}
                    onCheckedChange={(value) =>
                      onChangeProduto({
                        ...produto,
                        stock_is_fractional: value,
                      })
                    }
                  />
                  <Label htmlFor="stock-fractional" className="text-sm">
                    Permitir quantidades fracionadas (peso, dose)
                  </Label>
                </div>
              </div>
            )}
          </div>
        )}
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
