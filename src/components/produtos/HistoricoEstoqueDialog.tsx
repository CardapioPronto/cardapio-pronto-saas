import { useEffect, useState } from "react";
import { Product, StockMovement, StockMovementType } from "@/types/product";
import { supabase } from "@/lib/supabase";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, History } from "lucide-react";
import { toast } from "@/components/ui/sonner-toast";

interface HistoricoEstoqueDialogProps {
    produto: Product;
    onClose: () => void;
}

const TYPE_LABEL: Record<StockMovementType, string> = {
    sale: "Venda",
    sale_revert: "Estorno (cancelamento)",
    adjustment_in: "Entrada manual",
    adjustment_out: "Saída manual",
    inventory_count: "Inventário",
    manual_negative_override: "Venda autorizada sem saldo",
};

const TYPE_BADGE_CLASS: Record<StockMovementType, string> = {
    sale: "border-sky-200 bg-sky-50 text-sky-700",
    sale_revert: "border-emerald-200 bg-emerald-50 text-emerald-700",
    adjustment_in: "border-emerald-200 bg-emerald-50 text-emerald-700",
    adjustment_out: "border-amber-200 bg-amber-50 text-amber-700",
    inventory_count: "border-violet-200 bg-violet-50 text-violet-700",
    manual_negative_override: "border-red-200 bg-red-50 text-red-700",
};

const formatDelta = (value: number, isFractional: boolean) => {
    const abs = Math.abs(value);
    const formatted = isFractional
        ? abs.toLocaleString("pt-BR", { maximumFractionDigits: 3 })
        : Math.round(abs).toLocaleString("pt-BR");
    return `${value < 0 ? "-" : "+"}${formatted}`;
};

const formatDate = (iso: string) =>
    new Date(iso).toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });

export const HistoricoEstoqueDialog = ({ produto, onClose }: HistoricoEstoqueDialogProps) => {
    const [movements, setMovements] = useState<StockMovement[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            setLoading(true);
            try {
                const { data, error } = await supabase
                    .from("stock_movements")
                    .select(
                        "id, restaurant_id, product_id, quantity_delta, movement_type, reason, notes, order_id, order_item_id, idempotency_key, created_at, created_by",
                    )
                    .eq("product_id", produto.id)
                    .order("created_at", { ascending: false })
                    .limit(50);
                if (error) {
                    throw error;
                }
                if (!cancelled) {
                    setMovements(
                        (data ?? []).map((row) => ({
                            ...row,
                            movement_type: row.movement_type as StockMovementType,
                        })),
                    );
                }
            } catch (err) {
                console.error("Erro ao carregar histórico de estoque:", err);
                if (!cancelled) {
                    toast.error("Não foi possível carregar o histórico de estoque.");
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };
        void load();
        return () => {
            cancelled = true;
        };
    }, [produto.id]);

    const isFractional = produto.stock_is_fractional ?? false;

    return (
        <Dialog open onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <History className="h-5 w-5" /> Histórico de estoque · {produto.name}
                    </DialogTitle>
                    <DialogDescription>
                        Últimos 50 movimentos. Saldo atual:{" "}
                        <span className="font-medium">
                            {(produto.stock_quantity ?? 0).toLocaleString("pt-BR", {
                                maximumFractionDigits: isFractional ? 3 : 0,
                            })}
                        </span>
                        .
                    </DialogDescription>
                </DialogHeader>

                <div className="max-h-[60vh] overflow-y-auto pr-1">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : movements.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-6 text-center">
                            Nenhum movimento registrado para este produto.
                        </p>
                    ) : (
                        <ul className="space-y-3">
                            {movements.map((m) => (
                                <li
                                    key={m.id}
                                    className="flex items-start justify-between gap-3 rounded-lg border border-border p-3"
                                >
                                    <div className="space-y-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <Badge variant="outline" className={TYPE_BADGE_CLASS[m.movement_type]}>
                                                {TYPE_LABEL[m.movement_type]}
                                            </Badge>
                                            <span className="text-xs text-muted-foreground">
                                                {formatDate(m.created_at)}
                                            </span>
                                        </div>
                                        {m.reason && (
                                            <p className="text-sm text-foreground/80 truncate">
                                                {m.reason}
                                            </p>
                                        )}
                                        {m.notes && (
                                            <p className="text-xs text-muted-foreground italic">{m.notes}</p>
                                        )}
                                        {m.order_id && (
                                            <p className="text-xs text-muted-foreground">
                                                Pedido: <span className="font-mono">{m.order_id.slice(0, 8)}</span>
                                            </p>
                                        )}
                                    </div>
                                    <span
                                        className={`text-sm font-semibold tabular-nums ${
                                            m.quantity_delta < 0 ? "text-red-600" : "text-emerald-700"
                                        }`}
                                    >
                                        {formatDelta(m.quantity_delta, isFractional)}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <DialogFooter>
                    <Button type="button" variant="outline" onClick={onClose}>
                        Fechar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
