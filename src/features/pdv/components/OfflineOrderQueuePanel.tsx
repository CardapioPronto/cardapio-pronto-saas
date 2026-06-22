import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  CloudUpload,
  Laptop,
  Loader2,
  Trash2,
  UserRound,
} from "lucide-react";
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

const formatDateTime = (value: string | null | undefined) => {
  if (!value) return "Sem tentativa";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sem tentativa";
  return date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
};

const getOperatorLabel = (order: PDVOfflineOrder) =>
  order.operatorName || order.operatorEmail || "Operador nao registrado";

const statusLabel: Record<PDVOfflineOrder["status"], string> = {
  pending: "Aguardando conexão",
  syncing: "Sincronizando",
  review: "Revisar mesa",
  error: "Revisar",
};

export function OfflineOrderQueuePanel({
  orders,
  isOnline,
  isChecking,
  isSyncing,
  onSync,
  onRetry,
  onConfirmReview,
  onRemove,
}: {
  orders: PDVOfflineOrder[];
  isOnline: boolean;
  isChecking: boolean;
  isSyncing: boolean;
  onSync: () => void;
  onRetry: (clientOrderId: string) => void;
  onConfirmReview: (clientOrderId: string) => void;
  onRemove: (clientOrderId: string) => void;
}) {
  const [removeId, setRemoveId] = useState<string | null>(null);
  const [reviewId, setReviewId] = useState<string | null>(null);

  if (!orders.length) return null;

  const errorCount = orders.filter((order) => order.status === "error").length;
  const reviewCount = orders.filter((order) => order.status === "review").length;
  const orderToRemove = orders.find((order) => order.clientOrderId === removeId);
  const orderToReview = orders.find((order) => order.clientOrderId === reviewId);

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
                {errorCount > 0 ? ` ${errorCount} precisa${errorCount === 1 ? "" : "m"} de revisao.` : ""}
                {reviewCount > 0 ? ` ${reviewCount} pedido${reviewCount === 1 ? "" : "s"} de mesa aguarda${reviewCount === 1 ? "" : "m"} confirmacao.` : ""}
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
                  <p className="font-medium">
                    {order.orderType === "mesa" ? `Mesa ${order.table?.number}` : "Balcao"} · {formatCurrency(order.total)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(order.createdAt).toLocaleString("pt-BR")} · {order.items.length} item{order.items.length === 1 ? "" : "s"}
                  </p>
                </div>
                <Badge variant={order.status === "error" ? "destructive" : order.status === "review" ? "outline" : "secondary"}>
                  {order.status === "syncing" && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                  {order.status === "pending" && <CheckCircle2 className="mr-1 h-3 w-3" />}
                  {order.status === "review" && <AlertTriangle className="mr-1 h-3 w-3" />}
                  {statusLabel[order.status]}
                </Badge>
              </div>

              {order.lastError && (
                <p className="mt-2 text-xs text-destructive">{order.lastError}</p>
              )}

              {order.tableConflict && (
                <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs text-amber-900">
                  {order.tableConflict.reason}
                </p>
              )}

              <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
                <span className="flex min-w-0 items-center gap-1.5">
                  <Laptop className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{order.deviceLabel || "Dispositivo sem ID"}</span>
                </span>
                <span className="flex min-w-0 items-center gap-1.5">
                  <UserRound className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{getOperatorLabel(order)}</span>
                </span>
                <span className="flex min-w-0 items-center gap-1.5">
                  <Clock3 className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">
                    {order.attempts > 0
                      ? `${order.attempts} tentativa${order.attempts === 1 ? "" : "s"}`
                      : "Sem tentativa"}
                    {order.lastAttemptAt ? ` · ${formatDateTime(order.lastAttemptAt)}` : ""}
                  </span>
                </span>
              </div>

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
                {order.status === "review" && order.tableConflict?.canConfirm && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setReviewId(order.clientOrderId)}
                    disabled={!isOnline || isChecking}
                  >
                    Revisar e sincronizar
                  </Button>
                )}
                {order.status === "review" && !order.tableConflict?.canConfirm && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onRetry(order.clientOrderId)}
                    disabled={!isOnline || isChecking}
                  >
                    Validar novamente
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

      <AlertDialog open={Boolean(reviewId)} onOpenChange={(open) => !open && setReviewId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sincronizar pedido da Mesa {orderToReview?.table?.number}?</AlertDialogTitle>
            <AlertDialogDescription>
              {orderToReview?.tableConflict?.reason} Ao confirmar, o pedido sera criado na situacao atual da mesa e o estoque sera validado novamente pelo servidor.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (reviewId) onConfirmReview(reviewId);
                setReviewId(null);
              }}
            >
              Confirmar sincronizacao
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
