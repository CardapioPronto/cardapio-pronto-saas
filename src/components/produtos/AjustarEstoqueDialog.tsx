import { useState } from "react";
import { Product } from "@/types";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/sonner-toast";
import { Loader2 } from "lucide-react";

type AdjustmentType = "adjustment_in" | "adjustment_out" | "inventory_count";

interface AjustarEstoqueDialogProps {
    produto: Product;
    restaurantId: string;
    onClose: () => void;
    /** Disparado quando a RPC retorna sucesso. Use para refetch de produtos. */
    onAdjusted?: () => void;
}

const TYPE_LABELS: Record<AdjustmentType, string> = {
    adjustment_in: "Entrada (compra, devolução, sobra)",
    adjustment_out: "Saída (perda, quebra, consumo interno)",
    inventory_count: "Inventário (definir saldo absoluto)",
};

const formatStock = (value: number, isFractional: boolean) =>
    isFractional
        ? value.toLocaleString("pt-BR", { maximumFractionDigits: 3 })
        : Math.round(value).toLocaleString("pt-BR");

export const AjustarEstoqueDialog = ({
    produto,
    restaurantId,
    onClose,
    onAdjusted,
}: AjustarEstoqueDialogProps) => {
    const [type, setType] = useState<AdjustmentType>("adjustment_in");
    const [quantity, setQuantity] = useState<string>("");
    const [reason, setReason] = useState<string>("");
    const [notes, setNotes] = useState<string>("");
    const [submitting, setSubmitting] = useState(false);

    const isFractional = produto.stock_is_fractional ?? false;
    const currentQuantity = produto.stock_quantity ?? 0;
    const step = isFractional ? "0.001" : "1";

    const handleSubmit = async () => {
        const trimmedReason = reason.trim();
        if (!trimmedReason) {
            toast.error("Informe o motivo do ajuste.");
            return;
        }

        const numericQuantity = parseFloat(quantity);
        if (Number.isNaN(numericQuantity) || numericQuantity < 0) {
            toast.error("Quantidade inválida.");
            return;
        }
        if (type !== "inventory_count" && numericQuantity <= 0) {
            toast.error("Para entrada/saída a quantidade deve ser maior que zero.");
            return;
        }

        setSubmitting(true);
        try {
            const args: Record<string, unknown> = {
                restaurant_id: restaurantId,
                product_id: produto.id,
                movement_type: type,
                reason: trimmedReason,
                notes: notes.trim() || null,
            };
            if (type === "inventory_count") {
                args.target_quantity = numericQuantity;
            } else {
                args.quantity = numericQuantity;
            }

            const { error } = await supabase.rpc("adjust_stock", { p_args: args });
            if (error) {
                throw error;
            }
            toast.success("Estoque ajustado.");
            onAdjusted?.();
        } catch (err) {
            console.error("Erro ao ajustar estoque:", err);
            const message = err instanceof Error ? err.message : "Falha ao ajustar estoque.";
            toast.error(message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open onOpenChange={(open) => !open && !submitting && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Ajustar estoque · {produto.name}</DialogTitle>
                    <DialogDescription>
                        Saldo atual:{" "}
                        <span className="font-medium">{formatStock(currentQuantity, isFractional)}</span>
                        {produto.stock_min_quantity != null && (
                            <>
                                {" "}· mínimo{" "}
                                <span className="font-medium">
                                    {formatStock(produto.stock_min_quantity, isFractional)}
                                </span>
                            </>
                        )}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-2">
                    <div className="grid gap-2">
                        <Label htmlFor="adjustment-type">Tipo de ajuste</Label>
                        <Select value={type} onValueChange={(v) => setType(v as AdjustmentType)}>
                            <SelectTrigger id="adjustment-type">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {(Object.entries(TYPE_LABELS) as [AdjustmentType, string][]).map(([k, v]) => (
                                    <SelectItem key={k} value={k}>
                                        {v}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="adjustment-quantity">
                            {type === "inventory_count" ? "Saldo final desejado" : "Quantidade"}
                        </Label>
                        <Input
                            id="adjustment-quantity"
                            type="number"
                            min={0}
                            step={step}
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            placeholder={type === "inventory_count" ? "Ex.: 10" : "Quantidade movimentada"}
                        />
                        {type === "inventory_count" && (
                            <p className="text-xs text-muted-foreground">
                                O sistema calcula a diferença até o saldo atual e registra como movimento de inventário.
                            </p>
                        )}
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="adjustment-reason">Motivo</Label>
                        <Input
                            id="adjustment-reason"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Ex.: recebimento NF 1234"
                            required
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="adjustment-notes">Observações (opcional)</Label>
                        <Textarea
                            id="adjustment-notes"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Anotações para auditoria"
                            rows={3}
                        />
                    </div>
                </div>

                <DialogFooter className="gap-2">
                    <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
                        Cancelar
                    </Button>
                    <Button type="button" onClick={handleSubmit} disabled={submitting}>
                        {submitting ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Aplicando...
                            </>
                        ) : (
                            "Aplicar ajuste"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
