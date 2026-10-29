import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { POS_PAYMENT_METHODS, type PosPaymentMethod } from "@/lib/paymentMethods";
import { parseMoneyInput } from "@/lib/cashRegister";
import { Plus, Trash2 } from "lucide-react";

export interface PaymentSplitInput {
  method: PosPaymentMethod;
  amount: number;
}

interface PaymentSplitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderTotal: number;
  saving: boolean;
  onConfirm: (splits: PaymentSplitInput[]) => void;
}

const SPLIT_METHODS = POS_PAYMENT_METHODS.filter((m) => m.value !== "misto");

interface DraftSplit {
  method: PosPaymentMethod;
  amountText: string;
}

const round2 = (v: number) => Math.round(v * 100) / 100;

/** Diálogo para dividir o pagamento do pedido em parcelas com forma e valor. */
export const PaymentSplitDialog = ({ open, onOpenChange, orderTotal, saving, onConfirm }: PaymentSplitDialogProps) => {
  const [drafts, setDrafts] = useState<DraftSplit[]>([
    { method: "dinheiro", amountText: "" },
    { method: "pix", amountText: "" },
  ]);

  const total = round2(orderTotal);
  const parsed = drafts.map((d) => ({ method: d.method, amount: parseMoneyInput(d.amountText) }));
  const sum = round2(parsed.reduce((acc, p) => acc + p.amount, 0));
  const remaining = round2(total - sum);
  const allPositive = parsed.every((p) => p.amount > 0);
  const matches = allPositive && Math.abs(remaining) <= 0.01;

  const usedMethods = useMemo(() => new Set(drafts.map((d) => d.method)), [drafts]);

  const updateDraft = (index: number, patch: Partial<DraftSplit>) => {
    setDrafts((current) => current.map((d, i) => (i === index ? { ...d, ...patch } : d)));
  };

  const addDraft = () => {
    const next = SPLIT_METHODS.find((m) => !usedMethods.has(m.value));
    if (!next) return;
    setDrafts((current) => [...current, { method: next.value, amountText: remaining > 0 ? remaining.toFixed(2).replace(".", ",") : "" }]);
  };

  const removeDraft = (index: number) => {
    setDrafts((current) => (current.length <= 2 ? current : current.filter((_, i) => i !== index)));
  };

  const confirm = () => {
    if (!matches) return;
    onConfirm(parsed.map((p) => ({ method: p.method, amount: round2(p.amount) })));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Dividir pagamento</DialogTitle>
          <DialogDescription>
            Informe quanto foi pago em cada forma. A soma deve ser igual ao total do pedido (R$ {total.toFixed(2)}).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {drafts.map((draft, index) => (
            <div key={index} className="flex items-end gap-2">
              <div className="flex-1 space-y-1">
                <Label htmlFor={`split-method-${index}`}>Forma</Label>
                <select
                  id={`split-method-${index}`}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={draft.method}
                  onChange={(e) => updateDraft(index, { method: e.target.value as PosPaymentMethod })}
                >
                  {SPLIT_METHODS.map((m) => (
                    <option key={m.value} value={m.value} disabled={usedMethods.has(m.value) && draft.method !== m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-32 space-y-1">
                <Label htmlFor={`split-amount-${index}`}>Valor (R$)</Label>
                <Input
                  id={`split-amount-${index}`}
                  inputMode="decimal"
                  placeholder="0,00"
                  value={draft.amountText}
                  onChange={(e) => updateDraft(index, { amountText: e.target.value })}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Remover parcela"
                disabled={drafts.length <= 2}
                onClick={() => removeDraft(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}

          <Button type="button" variant="outline" size="sm" onClick={addDraft} disabled={usedMethods.size >= SPLIT_METHODS.length}>
            <Plus className="mr-1 h-4 w-4" /> Adicionar forma
          </Button>

          <div className="rounded-md border bg-muted/30 p-3 text-sm" role="status">
            <div className="flex justify-between">
              <span>Soma das parcelas</span>
              <span className="font-medium">R$ {sum.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>{remaining >= 0 ? "Falta" : "Excede"}</span>
              <span className={matches ? "font-medium text-emerald-700" : "font-medium text-destructive"}>
                R$ {Math.abs(remaining).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button type="button" onClick={confirm} disabled={!matches || saving}>
            {saving ? "Salvando..." : "Confirmar parcelas"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
