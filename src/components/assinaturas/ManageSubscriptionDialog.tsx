import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  AlertTriangle,
  ArrowLeftRight,
  Calendar,
  CreditCard,
  Loader2,
  Receipt,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { toast } from "@/components/ui/sonner-toast";
import {
  cancelPagarmeSubscription,
  changePagarmeSubscriptionCycle,
} from "@/services/pagarmeSubscriptionService";
import { MySubscription } from "@/hooks/useMySubscriptions";
import SubscriptionReceiptView from "./SubscriptionReceiptView";

interface ManageSubscriptionDialogProps {
  open: boolean;
  subscription: MySubscription | null;
  onClose: () => void;
  onUpdated: () => void;
}

const formatDate = (value: string | null | undefined) => {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString("pt-BR", {
      day: "2-digit", month: "2-digit", year: "numeric",
    });
  } catch { return "—"; }
};

const formatCurrency = (value: number | null | undefined) =>
  typeof value === "number"
    ? value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
    : "—";

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  active: { label: "Ativa", className: "bg-green text-white" },
  trialing: { label: "Em teste", className: "bg-orange/15 text-orange border border-orange/30" },
  past_due: { label: "Em atraso", className: "bg-destructive text-destructive-foreground" },
  canceled: { label: "Cancelada", className: "bg-muted text-muted-foreground" },
};

const DetailItem = ({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper?: string;
}) => (
  <div className="min-w-0 rounded-md border bg-muted/20 p-3">
    <p className="text-xs font-medium text-muted-foreground">{label}</p>
    <p className="mt-1 truncate font-semibold text-foreground">{value}</p>
    {helper && <p className="mt-1 text-xs text-muted-foreground">{helper}</p>}
  </div>
);

const ManageSubscriptionDialog = ({
  open, subscription, onClose, onUpdated,
}: ManageSubscriptionDialogProps) => {
  const [actionLoading, setActionLoading] = useState<null | "cancel" | "cycle">(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [confirmCycle, setConfirmCycle] = useState(false);
  const [view, setView] = useState<"details" | "receipt">("details");

  if (!subscription) return null;

  const status = subscription.status;
  const isCanceled = status === "canceled";
  const meta = STATUS_LABEL[status] ?? { label: status, className: "" };
  const targetCycle = subscription.billing_cycle === "yearly" ? "monthly" : "yearly";
  const targetCycleLabel = targetCycle === "yearly" ? "Anual" : "Mensal";
  const targetPrice =
    targetCycle === "yearly"
      ? subscription.plan?.price_yearly
      : subscription.plan?.price_monthly;
  const currentPrice =
    subscription.billing_cycle === "yearly"
      ? subscription.plan?.price_yearly
      : subscription.plan?.price_monthly;
  const hasPagarmeSubscription = Boolean(subscription.pagarme_subscription_id);

  const handleCancel = async () => {
    setActionLoading("cancel");
    try {
      await cancelPagarmeSubscription(subscription.id);
      toast.success("Assinatura cancelada", {
        description: "O status foi atualizado após o cancelamento no Pagar.me.",
      });
      onUpdated();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao cancelar assinatura");
    } finally {
      setActionLoading(null);
      setConfirmCancel(false);
    }
  };

  const handleChangeCycle = async () => {
    setActionLoading("cycle");
    try {
      await changePagarmeSubscriptionCycle(subscription.id, targetCycle);
      toast.success(`Ciclo alterado para ${targetCycleLabel}`);
      onUpdated();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao alterar ciclo");
    } finally {
      setActionLoading(null);
      setConfirmCycle(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-h-[90vh] overflow-y-auto p-0 sm:max-w-[680px]">
          <DialogHeader>
            <div className="border-b px-6 py-5">
              <DialogTitle className="flex flex-wrap items-center gap-3 text-xl">
                {view === "receipt" ? "Comprovante" : "Gerenciar assinatura"}
                <Badge className={meta.className}>{meta.label}</Badge>
              </DialogTitle>
              <DialogDescription className="mt-1">
                {subscription.plan?.name ?? "Plano"} ·{" "}
                {subscription.billing_cycle === "yearly" ? "Cobrança anual" : "Cobrança mensal"}
              </DialogDescription>
            </div>
          </DialogHeader>

          {view === "receipt" ? (
            <div className="px-6 py-5">
              <SubscriptionReceiptView
                subscriptionId={subscription.id}
                onBack={() => setView("details")}
              />
            </div>
          ) : (
          <div className="space-y-5 px-6 py-5 text-sm">
            {!hasPagarmeSubscription && (
              <div className="flex gap-3 rounded-md border border-orange/30 bg-orange/5 p-3 text-orange">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="space-y-1">
                  <p className="font-medium">Assinatura criada manualmente</p>
                  <p className="text-xs text-orange/90">
                    Esta assinatura não possui ID do Pagar.me. Comprovante,
                    cancelamento e troca de ciclo precisam de uma assinatura criada pelo checkout.
                  </p>
                </div>
              </div>
            )}

            <div className="rounded-md border bg-background">
              <div className="flex items-center gap-2 border-b px-4 py-3">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <p className="font-semibold">Resumo do plano</p>
              </div>
              <div className="grid gap-3 p-4 sm:grid-cols-2">
                <DetailItem label="Plano" value={subscription.plan?.name ?? "Plano"} />
                <DetailItem
                  label="Valor atual"
                  value={`${formatCurrency(currentPrice)}${subscription.billing_cycle === "yearly" ? "/ano" : "/mês"}`}
                  helper={subscription.billing_cycle === "yearly" ? "Ciclo anual" : "Ciclo mensal"}
                />
                <DetailItem label="Início" value={formatDate(subscription.start_date)} />
                <DetailItem
                  label={status === "trialing" ? "Fim do teste" : "Próxima cobrança"}
                  value={
                    status === "trialing"
                      ? formatDate(subscription.trial_ends_at)
                      : formatDate(subscription.next_billing_at ?? subscription.current_period_end)
                  }
                />
              </div>
            </div>

            <div className="rounded-md border bg-background">
              <div className="flex items-center gap-2 border-b px-4 py-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <p className="font-semibold">Período e pagamento</p>
              </div>
              <div className="grid gap-3 p-4 sm:grid-cols-2">
                <DetailItem
                  label="Período atual"
                  value={`${formatDate(subscription.current_period_start)} até ${formatDate(subscription.current_period_end)}`}
                />
                <DetailItem
                  label="Último pagamento"
                  value={formatDate(subscription.last_payment_at)}
                  helper={subscription.last_payment_status ? `Status: ${subscription.last_payment_status}` : undefined}
                />
                <div className="min-w-0 rounded-md border bg-muted/20 p-3 sm:col-span-2">
                  <p className="text-xs font-medium text-muted-foreground">ID Pagar.me</p>
                  <p className="mt-1 truncate font-mono text-xs text-foreground">
                    {subscription.pagarme_subscription_id ?? "Sem ID vinculado"}
                  </p>
                </div>
              </div>
            </div>

            {!isCanceled && (
              <>
                <Separator />
                <div>
                  <p className="mb-2 font-semibold">Ações disponíveis</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Button
                      variant="outline"
                      className="justify-start"
                      onClick={() => setView("receipt")}
                      disabled={actionLoading !== null || !hasPagarmeSubscription}
                    >
                      <Receipt className="h-4 w-4 mr-2" />
                      Ver comprovante
                    </Button>
                    <Button
                      variant="outline"
                      className="justify-start"
                      onClick={() => setConfirmCycle(true)}
                      disabled={actionLoading !== null || !hasPagarmeSubscription}
                    >
                      <ArrowLeftRight className="h-4 w-4 mr-2" />
                      <span className="truncate">
                        Mudar para {targetCycleLabel.toLowerCase()}
                      </span>
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => setConfirmCancel(true)}
                      disabled={actionLoading !== null || !hasPagarmeSubscription}
                      className="justify-start sm:col-span-2"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Cancelar assinatura
                    </Button>
                  </div>
                  {targetPrice != null && hasPagarmeSubscription && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Ao mudar para {targetCycleLabel.toLowerCase()}, o valor será{" "}
                      {formatCurrency(targetPrice)}
                      {targetCycle === "yearly" ? "/ano" : "/mês"}.
                    </p>
                  )}
                </div>
              </>
            )}

            {isCanceled && (
              <>
                <Separator />
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setView("receipt")}
                    disabled={!subscription.pagarme_subscription_id}
                  >
                    <Receipt className="h-4 w-4 mr-2" />
                    Ver último comprovante
                  </Button>
                </div>
                <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
                  Esta assinatura está cancelada. Para voltar a usar o Pubfy,
                  contrate um novo plano na aba "Planos disponíveis".
                </div>
              </>
            )}
          </div>
          )}

          <DialogFooter className="border-t px-6 py-4">
            <Button
              variant="ghost"
              onClick={() => { setView("details"); onClose(); }}
              disabled={actionLoading !== null}
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar assinatura?</AlertDialogTitle>
            <AlertDialogDescription>
              A cobrança será interrompida no Pagar.me e a assinatura local será
              marcada como cancelada. Período atual: até {formatDate(subscription.current_period_end)}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading === "cancel"}>
              Voltar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleCancel(); }}
              disabled={actionLoading === "cancel"}
              className="bg-destructive hover:bg-destructive/90"
            >
              {actionLoading === "cancel" ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Cancelando…</>
              ) : "Confirmar cancelamento"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmCycle} onOpenChange={setConfirmCycle}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Mudar para cobrança {targetCycleLabel.toLowerCase()}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              A próxima cobrança passará a usar o ciclo {targetCycleLabel.toLowerCase()}
              {targetPrice != null && (
                <> no valor de <strong>{formatCurrency(targetPrice)}</strong>{" "}
                {targetCycle === "yearly" ? "por ano" : "por mês"}</>
              )}
              . O Pagar.me ajustará automaticamente o ciclo da assinatura.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading === "cycle"}>
              Voltar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleChangeCycle(); }}
              disabled={actionLoading === "cycle"}
            >
              {actionLoading === "cycle" ? (
                <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Alterando…</>
              ) : "Confirmar alteração"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ManageSubscriptionDialog;
