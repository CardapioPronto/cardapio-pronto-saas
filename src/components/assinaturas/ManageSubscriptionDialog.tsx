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
import { Loader2, XCircle, RefreshCw, ArrowLeftRight } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import {
  cancelPagarmeSubscription,
  changePagarmeSubscriptionCycle,
} from "@/services/pagarmeSubscriptionService";
import { MySubscription } from "@/hooks/useMySubscriptions";

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

const ManageSubscriptionDialog = ({
  open, subscription, onClose, onUpdated,
}: ManageSubscriptionDialogProps) => {
  const [actionLoading, setActionLoading] = useState<null | "cancel" | "cycle">(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [confirmCycle, setConfirmCycle] = useState(false);

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

  const handleCancel = async () => {
    setActionLoading("cancel");
    try {
      await cancelPagarmeSubscription(subscription.id);
      toast.success("Assinatura cancelada", {
        description: "Você terá acesso até o fim do período pago.",
      });
      onUpdated();
      onClose();
    } catch (err: any) {
      toast.error(err?.message ?? "Falha ao cancelar assinatura");
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
    } catch (err: any) {
      toast.error(err?.message ?? "Falha ao alterar ciclo");
    } finally {
      setActionLoading(null);
      setConfirmCycle(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              Gerenciar assinatura
              <Badge className={meta.className}>{meta.label}</Badge>
            </DialogTitle>
            <DialogDescription>
              {subscription.plan?.name ?? "Plano"} —{" "}
              {subscription.billing_cycle === "yearly" ? "Anual" : "Mensal"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Início</p>
                <p className="font-medium">{formatDate(subscription.start_date)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Período atual</p>
                <p className="font-medium">
                  {formatDate(subscription.current_period_start)} →{" "}
                  {formatDate(subscription.current_period_end)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  {status === "trialing" ? "Fim do teste" : "Próxima cobrança"}
                </p>
                <p className="font-medium">
                  {status === "trialing"
                    ? formatDate(subscription.trial_ends_at)
                    : formatDate(subscription.next_billing_at ?? subscription.current_period_end)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Valor atual</p>
                <p className="font-medium">
                  {formatCurrency(
                    subscription.billing_cycle === "yearly"
                      ? subscription.plan?.price_yearly
                      : subscription.plan?.price_monthly,
                  )}
                  {subscription.billing_cycle === "yearly" ? "/ano" : "/mês"}
                </p>
              </div>
              {subscription.last_payment_at && (
                <div>
                  <p className="text-xs text-muted-foreground">Último pagamento</p>
                  <p className="font-medium">
                    {formatDate(subscription.last_payment_at)}{" "}
                    {subscription.last_payment_status && (
                      <span className="text-xs text-muted-foreground">
                        ({subscription.last_payment_status})
                      </span>
                    )}
                  </p>
                </div>
              )}
              {subscription.pagarme_subscription_id && (
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">ID Pagar.me</p>
                  <code className="text-xs">{subscription.pagarme_subscription_id}</code>
                </div>
              )}
            </div>

            {!isCanceled && (
              <>
                <Separator />
                <div>
                  <p className="font-semibold mb-2">Ações disponíveis</p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      variant="outline"
                      className="justify-start"
                      onClick={() => setConfirmCycle(true)}
                      disabled={actionLoading !== null}
                    >
                      <ArrowLeftRight className="h-4 w-4 mr-2" />
                      Mudar para cobrança {targetCycleLabel.toLowerCase()}
                      {targetPrice != null && (
                        <span className="text-xs text-muted-foreground ml-2">
                          ({formatCurrency(targetPrice)}
                          {targetCycle === "yearly" ? "/ano" : "/mês"})
                        </span>
                      )}
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => setConfirmCancel(true)}
                      disabled={actionLoading !== null}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Cancelar assinatura
                    </Button>
                  </div>
                </div>
              </>
            )}

            {isCanceled && (
              <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
                Esta assinatura está cancelada. Para voltar a usar o Pubfy,
                contrate um novo plano na aba "Planos disponíveis".
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={onClose} disabled={actionLoading !== null}>
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
              A cobrança será interrompida no Pagar.me. Você manterá o acesso
              até o fim do período já pago ({formatDate(subscription.current_period_end)}).
              Esta ação não pode ser desfeita.
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