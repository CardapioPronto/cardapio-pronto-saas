import { useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Plus, Minus } from 'lucide-react';
import { formatBRL } from '../cart/cartContextCore';

export interface AddItemModalProduct {
  id: string;
  name: string;
  price: number;
  description?: string;
  image_url?: string;
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
  onClose: () => void;
  onConfirm: (payload: { quantity: number; observations?: string }) => void;
}

export const AddItemModal = ({ product, primaryColor, onClose, onConfirm }: Props) => {
  const [quantity, setQuantity] = useState(1);
  const [observations, setObservations] = useState('');

  const open = product !== null;

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      onClose();
      // Reset for next open
      setTimeout(() => {
        setQuantity(1);
        setObservations('');
      }, 150);
    }
  };

  const handleConfirm = () => {
    if (product?.is_sold_out) return;
    onConfirm({ quantity, observations: observations.trim() || undefined });
    setQuantity(1);
    setObservations('');
  };

  if (!product) return null;

  const finalUnitPrice = product.promotion?.final_price ?? product.price;
  const total = finalUnitPrice * quantity;
  const hasPromotion = !!product.promotion && product.promotion.unit_discount > 0;
  const isSoldOut = Boolean(product.is_sold_out);
  const promotionLabel = product.promotion
    ? product.promotion.discount_type === 'percentage'
      ? `${product.promotion.discount_value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% OFF`
      : `${formatBRL(product.promotion.discount_value)} OFF`
    : null;

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
            disabled={isSoldOut}
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
