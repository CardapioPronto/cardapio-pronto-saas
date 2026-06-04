import { useState } from "react";
import { AlertTriangle, CheckCircle2, CloudUpload, Loader2, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { PDVOfflineOrder } from "../services/pdvOfflineOrderQueueService";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const statusLabel: Record<PDVOfflineOrder["status"], string> = {
  pending: "Aguardando conexão",
  syncing: "Sincronizando",
  error: "Revisar",
};

export function OfflineOrderQueuePanel({
  orders,
  isOnline,
  isChecking,
  isSyncing,
  onSync,
  onRetry,
  onRemove,
}: {
  orders: PDVOfflineOrder[];
  isOnline: boolean;
  isChecking: boolean;
  isSyncing: boolean;
  onSync: () => void;
  onRetry: (clientOrderId: string) => void;
  onRemove: (clientOrderId: string) => void;
}) {
  const [removeId, setRemoveId] = useState<string | null>(null);

  if (!orders.length) return null;

  const errorCount = orders.filter((order) => order.status === "error").length;
  const orderToRemove = orders.find((order) => order.clientOrderId === removeId);

  return (
    <>
      <section className="mb-4 rounded-md border border-amber-200 bg-amber-50/70 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            {errorCount > 0
              ? <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
              : <CloudUpload className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />}
            <div>
              <h2 className="font-semibold text-amber-950">Pedidos aguardando sincronização</h2>
              <p className="text-sm text-amber-900/80">
                {orders.length} pedido{orders.length === 1 ? "" : "s"} salvo{orders.length === 1 ? "" : "s"} neste dispositivo.
                {errorCount > 0 ? ` ${errorCount} precisa${errorCount === 1 ? "" : "m"} de revisão.` : ""}
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onSync}
            disabled={!isOnline || isChecking || isSyncing}
          >
            {isSyncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CloudUpload className="mr-2 h-4 w-4" />}
            Sincronizar agora
          </Button>
        </div>

        <div className="mt-4 grid gap-2 lg:grid-cols-2">
          {orders.map((order) => (
            <div key={order.clientOrderId} className="rounded-md border bg-background px-3 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium">Balcão · {formatCurrency(order.total)}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(order.createdAt).toLocaleString("pt-BR")} · {order.items.length} item{order.items.length === 1 ? "" : "s"}
                  </p>
                </div>
                <Badge variant={order.status === "error" ? "destructive" : "secondary"}>
                  {order.status === "syncing" && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                  {order.status === "pending" && <CheckCircle2 className="mr-1 h-3 w-3" />}
                  {statusLabel[order.status]}
                </Badge>
              </div>

              {order.lastError && (
                <p className="mt-2 text-xs text-destructive">{order.lastError}</p>
              )}

              <div className="mt-3 flex justify-end gap-2">
                {order.status === "error" && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onRetry(order.clientOrderId)}
                    disabled={!isOnline || isChecking}
                  >
                    Tentar novamente
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setRemoveId(order.clientOrderId)}
                  disabled={order.status === "syncing"}
                  aria-label="Remover pedido da fila"
                  title="Remover pedido da fila"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <AlertDialog open={Boolean(removeId)} onOpenChange={(open) => !open && setRemoveId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover pedido da fila?</AlertDialogTitle>
            <AlertDialogDescription>
              Este pedido de {orderToRemove ? formatCurrency(orderToRemove.total) : "balcão"} ainda não foi confirmado no servidor.
              Removê-lo pode causar perda da venda.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (removeId) onRemove(removeId);
                setRemoveId(null);
              }}
            >
              Remover da fila
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
