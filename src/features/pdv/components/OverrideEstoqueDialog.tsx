import { useEffect, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

interface OverrideEstoqueDialogProps {
    open: boolean;
    /** Mensagem original vinda da RPC (ex.: 'Estoque insuficiente para "X": disponível 0, solicitado 2.'). */
    errorMessage: string;
    /** Quando false, o botão de confirmar fica oculto e o usuário só pode cancelar. */
    canOverride: boolean;
    onCancel: () => void;
    /** Resolve com true quando a venda foi confirmada com sucesso. */
    onConfirm: (reason: string) => Promise<boolean | void> | void;
}

/**
 * Diálogo de "vender mesmo assim". Aparece quando `create_pos_order`
 * recusa o pedido por falta de saldo. Só pode ser confirmado por usuário
 * com `products_manage`; a RPC valida no servidor (defesa em profundidade).
 */
export const OverrideEstoqueDialog = ({
    open,
    errorMessage,
    canOverride,
    onCancel,
    onConfirm,
}: OverrideEstoqueDialogProps) => {
    const [reason, setReason] = useState("");
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (open) {
            setReason("");
            setSubmitting(false);
        }
    }, [open]);

    const handleConfirm = async () => {
        const trimmed = reason.trim();
        if (!trimmed) {
            return;
        }
        setSubmitting(true);
        try {
            await onConfirm(trimmed);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(next) => !next && !submitting && onCancel()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-amber-600" />
                        Estoque insuficiente
                    </DialogTitle>
                    <DialogDescription>{errorMessage}</DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {!canOverride ? (
                        <Alert variant="destructive">
                            <AlertDescription>
                                Sem permissão para forçar a venda. Peça a um gestor com permissão de{" "}
                                <strong>gerenciar produtos</strong> para concluir o pedido, ou repor o estoque
                                primeiro.
                            </AlertDescription>
                        </Alert>
                    ) : (
                        <>
                            <Alert className="bg-amber-50 border-amber-200">
                                <AlertDescription className="text-sm text-amber-900">
                                    Vender mesmo assim registra um movimento de estoque do tipo{" "}
                                    <strong>“venda autorizada sem saldo”</strong>, deixando o saldo negativo. Use
                                    apenas em situações excepcionais — sempre com motivo registrado.
                                </AlertDescription>
                            </Alert>

                            <div className="grid gap-2">
                                <Label htmlFor="override-reason">Motivo da venda sem saldo</Label>
                                <Textarea
                                    id="override-reason"
                                    rows={3}
                                    placeholder="Ex.: pedido prioritário; reposição confirmada para hoje à tarde."
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    autoFocus
                                />
                            </div>
                        </>
                    )}
                </div>

                <DialogFooter className="gap-2">
                    <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
                        Cancelar
                    </Button>
                    {canOverride && (
                        <Button
                            type="button"
                            onClick={handleConfirm}
                            disabled={submitting || reason.trim().length === 0}
                        >
                            {submitting ? "Aplicando..." : "Vender mesmo assim"}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
