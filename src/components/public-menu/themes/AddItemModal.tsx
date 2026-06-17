import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Plus, Minus } from 'lucide-react';
import { formatBRL } from '../cart/cartContextCore';
import type { PublicMenuUpsellSuggestion } from '@/types/menuTheme';
import {
  calculateMultiFlavorUnitPrice,
  formatMultiFlavorNames,
  normalizeMultiFlavorConfig,
  type MultiFlavorConfig,
  type MultiFlavorSelection,
  type MultiFlavorSelectionFlavor,
} from '@/lib/multiFlavor';

export interface AddItemModalProduct {
  id: string;
  name: string;
  price: number;
  description?: string;
  image_url?: string;
  category_id?: string;
  multi_flavor_enabled?: boolean;
  is_sold_out?: boolean;
  promotion?: {
    id: string;
    name: string;
    discount_type: 'percentage' | 'fixed';
    discount_value: number;
    unit_discount: number;
    final_price: number;
  } | null;
}

interface Props {
  product: AddItemModalProduct | null;
  primaryColor: string;
  suggestions?: PublicMenuUpsellSuggestion[];
  flavorOptions?: AddItemModalProduct[];
  multiFlavorConfig?: MultiFlavorConfig;
  onClose: () => void;
  onAddSuggestion?: (suggestion: PublicMenuUpsellSuggestion) => void;
  onConfirm: (payload: {
    quantity: number;
    observations?: string;
    unitPrice: number;
    displayName?: string;
    flavorSelection?: MultiFlavorSelection;
  }) => void;
}

export const AddItemModal = ({
  product,
  primaryColor,
  suggestions = [],
  flavorOptions = [],
  multiFlavorConfig,
  onClose,
  onAddSuggestion,
  onConfirm,
}: Props) => {
  const [quantity, setQuantity] = useState(1);
  const [observations, setObservations] = useState('');
  const [combiningFlavors, setCombiningFlavors] = useState(false);
  const [secondaryFlavorId, setSecondaryFlavorId] = useState<string>('');

  const open = product !== null;

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      onClose();
      // Reset for next open
      setTimeout(() => {
        setQuantity(1);
        setObservations('');
        setCombiningFlavors(false);
        setSecondaryFlavorId('');
      }, 150);
    }
  };

  const handleConfirm = () => {
    if (product?.is_sold_out) return;
    const flavorSelection = buildFlavorSelection();
    onConfirm({
      quantity,
      observations: observations.trim() || undefined,
      unitPrice: flavorSelection?.unit_price ?? finalUnitPrice,
      displayName: flavorSelection ? formatMultiFlavorNames(flavorSelection.flavors) : undefined,
      flavorSelection,
    });
    setQuantity(1);
    setObservations('');
    setCombiningFlavors(false);
    setSecondaryFlavorId('');
  };

  const normalizedMultiFlavorConfig = normalizeMultiFlavorConfig(multiFlavorConfig);
  const finalUnitPrice = product?.promotion?.final_price ?? product?.price ?? 0;
  const hasPromotion = !!product?.promotion && product.promotion.unit_discount > 0;
  const isSoldOut = Boolean(product?.is_sold_out);
  const availableFlavorOptions = useMemo(
    () =>
      product
        ? flavorOptions.filter(
            option =>
              option.id !== product.id &&
              option.multi_flavor_enabled &&
              !option.is_sold_out &&
              option.category_id === product.category_id,
          )
        : [],
    [flavorOptions, product],
  );
  const canCombineFlavors =
    normalizedMultiFlavorConfig.enabled &&
    Boolean(product?.multi_flavor_enabled) &&
    availableFlavorOptions.length > 0;
  const selectedSecondaryFlavor = useMemo(
    () => availableFlavorOptions.find((option) => option.id === secondaryFlavorId) ?? null,
    [availableFlavorOptions, secondaryFlavorId],
  );
  const promotionLabel = product?.promotion
    ? product.promotion.discount_type === 'percentage'
      ? `${product.promotion.discount_value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% OFF`
      : `${formatBRL(product.promotion.discount_value)} OFF`
    : null;

  const selectedFlavorProducts = useMemo(() => {
    if (!product || !combiningFlavors || !selectedSecondaryFlavor) return [];
    return [product, selectedSecondaryFlavor];
  }, [combiningFlavors, product, selectedSecondaryFlavor]);

  const currentUnitPrice = useMemo(() => {
    if (selectedFlavorProducts.length < 2) return finalUnitPrice;
    const portion = 1 / selectedFlavorProducts.length;
    const flavors = selectedFlavorProducts.map((flavor): MultiFlavorSelectionFlavor => ({
      product_id: flavor.id,
      name: flavor.name,
      price: flavor.price,
      final_price: flavor.promotion?.final_price ?? flavor.price,
      portion,
    }));
    return calculateMultiFlavorUnitPrice(flavors, normalizedMultiFlavorConfig.pricing_strategy);
  }, [finalUnitPrice, normalizedMultiFlavorConfig.pricing_strategy, selectedFlavorProducts]);

  const total = currentUnitPrice * quantity;

  function buildFlavorSelection(): MultiFlavorSelection | undefined {
    if (selectedFlavorProducts.length < 2) return undefined;
    const portion = 1 / selectedFlavorProducts.length;
    const flavors = selectedFlavorProducts.map((flavor): MultiFlavorSelectionFlavor => ({
      product_id: flavor.id,
      name: flavor.name,
      price: flavor.price,
      final_price: flavor.promotion?.final_price ?? flavor.price,
      portion,
    }));
    return {
      mode: 'combined',
      pricing_strategy: normalizedMultiFlavorConfig.pricing_strategy,
      base_unit_price: calculateMultiFlavorUnitPrice(flavors, normalizedMultiFlavorConfig.pricing_strategy, false),
      unit_price: calculateMultiFlavorUnitPrice(flavors, normalizedMultiFlavorConfig.pricing_strategy),
      flavors,
    };
  }

  useEffect(() => {
    if (!open) return;
    setCombiningFlavors(false);
    setSecondaryFlavorId('');
  }, [open, product?.id]);

  useEffect(() => {
    if (!canCombineFlavors) {
      setCombiningFlavors(false);
      setSecondaryFlavorId('');
      return;
    }
    if (combiningFlavors && !secondaryFlavorId && availableFlavorOptions[0]) {
      setSecondaryFlavorId(availableFlavorOptions[0].id);
    }
  }, [availableFlavorOptions, canCombineFlavors, combiningFlavors, secondaryFlavorId]);

  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{product.name}</DialogTitle>
        </DialogHeader>

        {product.image_url && (
          <div className="w-full aspect-video rounded-lg overflow-hidden bg-muted">
            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
          </div>
        )}

        {product.description && (
          <p className="text-sm text-muted-foreground">{product.description}</p>
        )}

        {hasPromotion && (
          <div
            className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
            style={{ borderColor: `${primaryColor}33`, backgroundColor: `${primaryColor}10`, color: primaryColor }}
          >
            <span className="font-semibold">{promotionLabel}</span>
            <span className="text-xs opacity-80">
              de <span className="line-through">{formatBRL(product.price)}</span> por {formatBRL(finalUnitPrice)}
            </span>
          </div>
        )}

        {canCombineFlavors && (
          <div className="space-y-3 rounded-lg border border-border p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <Label className="text-sm">Sabores</Label>
                <p className="text-xs text-muted-foreground">
                  {normalizedMultiFlavorConfig.pricing_strategy === 'highest'
                    ? 'Valor pelo sabor mais caro.'
                    : 'Valor proporcional entre os sabores.'}
                </p>
              </div>
              <div className="flex rounded-lg border border-border p-1">
                <button
                  type="button"
                  onClick={() => setCombiningFlavors(false)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium ${!combiningFlavors ? 'text-white' : 'text-foreground hover:bg-muted'}`}
                  style={!combiningFlavors ? { backgroundColor: primaryColor } : undefined}
                >
                  1 sabor
                </button>
                <button
                  type="button"
                  onClick={() => setCombiningFlavors(true)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium ${combiningFlavors ? 'text-white' : 'text-foreground hover:bg-muted'}`}
                  style={combiningFlavors ? { backgroundColor: primaryColor } : undefined}
                >
                  2 sabores
                </button>
              </div>
            </div>

            {combiningFlavors && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Segundo sabor</p>
                <div className="grid max-h-40 gap-2 overflow-y-auto pr-1">
                  {availableFlavorOptions.map((option) => {
                    const price = option.promotion?.final_price ?? option.price;
                    const selected = option.id === secondaryFlavorId;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setSecondaryFlavorId(option.id)}
                        className={`flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-left text-sm transition ${
                          selected ? 'border-transparent text-white' : 'border-border hover:bg-muted/50'
                        }`}
                        style={selected ? { backgroundColor: primaryColor } : undefined}
                      >
                        <span className="min-w-0 flex-1 truncate">{option.name}</span>
                        <span className="shrink-0 text-xs font-semibold">{formatBRL(price)}</span>
                      </button>
                    );
                  })}
                </div>
                {selectedFlavorProducts.length === 2 && (
                  <p className="text-xs text-muted-foreground">
                    {formatMultiFlavorNames(selectedFlavorProducts)}: {formatBRL(currentUnitPrice)}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {suggestions.length > 0 && (
          <div className="space-y-2">
            <Label>Também combina</Label>
            <div className="space-y-2">
              {suggestions.slice(0, 4).map((suggestion) => {
                const suggestedProduct = suggestion.product;
                const price = suggestedProduct.promotion?.final_price ?? suggestedProduct.price;

                return (
                  <button
                    key={`${suggestion.source}-${suggestedProduct.id}`}
                    type="button"
                    onClick={() => onAddSuggestion?.(suggestion)}
                    className="flex w-full items-center gap-3 rounded-lg border border-border px-3 py-2 text-left transition hover:bg-muted/50"
                  >
                    <div className="h-11 w-11 flex-shrink-0 overflow-hidden rounded-md bg-muted">
                      {suggestedProduct.image_url ? (
                        <img
                          src={suggestedProduct.image_url}
                          alt={suggestedProduct.name}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground">
                          sem foto
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{suggestion.title || suggestedProduct.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {suggestion.source === 'sales'
                          ? 'Clientes também pedem'
                          : suggestion.description || suggestedProduct.description || suggestedProduct.name}
                      </p>
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-2">
                      <span className="text-sm font-semibold" style={{ color: primaryColor }}>
                        {formatBRL(price)}
                      </span>
                      <Plus className="h-4 w-4" style={{ color: primaryColor }} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="obs">Observações (opcional)</Label>
          <Textarea
            id="obs"
            placeholder="Ex: sem cebola, ponto da carne, sem molho..."
            value={observations}
            onChange={(e) => setObservations(e.target.value)}
            rows={3}
            maxLength={300}
          />
          <p className="text-xs text-muted-foreground text-right">{observations.length}/300</p>
        </div>

        <div className="flex items-center justify-between pt-2">
          <span className="text-sm text-muted-foreground">Quantidade</span>
          <div className="flex items-center gap-3 border border-border rounded-lg px-1">
            <button
              type="button"
              onClick={() => setQuantity(q => Math.max(1, q - 1))}
              className="p-2 hover:bg-muted rounded-md disabled:opacity-40"
              disabled={quantity <= 1}
              aria-label="Diminuir"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="w-6 text-center font-semibold">{quantity}</span>
            <button
              type="button"
              onClick={() => setQuantity(q => q + 1)}
              className="p-2 hover:bg-muted rounded-md"
              style={{ color: primaryColor }}
              aria-label="Aumentar"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        {isSoldOut && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Produto esgotado no momento. O restaurante já foi protegido contra novas vendas deste item.
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isSoldOut || (combiningFlavors && !selectedSecondaryFlavor)}
            className="text-white hover:opacity-90"
            style={{ backgroundColor: primaryColor }}
          >
            {isSoldOut ? 'Esgotado' : `Adicionar • ${formatBRL(total)}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
