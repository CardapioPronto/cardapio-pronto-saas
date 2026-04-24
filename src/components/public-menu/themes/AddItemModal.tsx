import { useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Plus, Minus } from 'lucide-react';
import { formatBRL } from '../cart/CartContext';

export interface AddItemModalProduct {
  id: string;
  name: string;
  price: number;
  description?: string;
  image_url?: string;
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
    onConfirm({ quantity, observations: observations.trim() || undefined });
    setQuantity(1);
    setObservations('');
  };

  if (!product) return null;

  const total = product.price * quantity;

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

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            className="text-white hover:opacity-90"
            style={{ backgroundColor: primaryColor }}
          >
            Adicionar • {formatBRL(total)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};