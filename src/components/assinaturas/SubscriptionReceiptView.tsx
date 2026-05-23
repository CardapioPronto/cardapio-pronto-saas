import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, Copy, ExternalLink, FileText, QrCode, ArrowLeft } from "lucide-react";
import { toast } from "@/components/ui/sonner-toast";
import {
  getPagarmeReceipt,
  PagarmeReceipt,
  type ReceiptBillingPhase,
} from "@/services/pagarmeSubscriptionService";
import {
  getReceiptCardCopy,
  getReceiptStatusBadgeLabel,
  resolveReceiptBillingPhase,
  resolveReceiptScheduleDate,
} from "../../../supabase/functions/_shared/pagarme-receipt-display.ts";

interface Props {
  subscriptionId: string;
  onBack: () => void;
}

const formatDateTime = (value: string | null | undefined) => {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("pt-BR", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return "—"; }
};

const formatCurrency = (value: number | null | undefined) =>
  typeof value === "number"
    ? value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
    : "—";

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  paid: { label: "Pago", className: "bg-green text-white" },
  scheduled: { label: "Cobrança agendada", className: "bg-green/15 text-green border border-green/30" },
  authorized: { label: "Cartão validado", className: "bg-green/15 text-green border border-green/30" },
  pending: { label: "Pendente", className: "bg-orange/15 text-orange border border-orange/30" },
  processing: { label: "Processando", className: "bg-muted text-muted-foreground" },
  failed: { label: "Falhou", className: "bg-destructive text-destructive-foreground" },
  canceled: { label: "Cancelado", className: "bg-muted text-muted-foreground" },
  overpaid: { label: "Pago a maior", className: "bg-green text-white" },
  underpaid: { label: "Pago a menor", className: "bg-orange/15 text-orange border border-orange/30" },
};

const METHOD_LABEL: Record<string, string> = {
  credit_card: "Cartão de crédito",
  debit_card: "Cartão de débito",
  boleto: "Boleto",
  pix: "PIX",
};

const copyToClipboard = async (value: string, label: string) => {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copiado`);
  } catch {
    toast.error("Não foi possível copiar");
  }
};

const ReceiptCard = ({ r, title: titleOverride }: { r: PagarmeReceipt; title?: string }) => {
  const status = (r.status ?? "").toLowerCase();
  const phase: ReceiptBillingPhase = r.billing_phase ??
    resolveReceiptBillingPhase({ displayStatus: status, paidChargesCount: 0 });
  const scheduleDate = resolveReceiptScheduleDate({
    phase,
    subscriptionStartAt: r.subscription_start_at,
    nextBillingAt: r.next_billing_at,
    chargeDueAt: r.due_at,
  });
  const { title, note } = getReceiptCardCopy(phase, {
    amountFormatted: formatCurrency(r.amount),
    scheduleDate,
  });
  const badgeLabel = getReceiptStatusBadgeLabel(status, phase);
  const badgeClass =
    phase === "failed"
      ? STATUS_LABEL.failed.className
      : phase === "renewal_scheduled" || phase === "first_scheduled"
        ? STATUS_LABEL.scheduled.className
        : STATUS_LABEL[status]?.className ?? "bg-muted text-muted-foreground";
  const method = (r.payment_method ?? "").toLowerCase();
  const methodLabel = METHOD_LABEL[method] ?? method ?? "—";
  const showScheduledStyle =
    phase === "first_scheduled" || phase === "renewal_scheduled";
  const showFailedStyle = phase === "failed";

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">{titleOverride ?? title}</p>
          <p className="font-semibold">{methodLabel}</p>
        </div>
        <Badge className={badgeClass}>{badgeLabel}</Badge>
      </div>

      {note && showScheduledStyle && (
        <p className="text-sm text-muted-foreground rounded-md border border-green/30 bg-green/5 px-3 py-2">
          {note}
        </p>
      )}
      {note && showFailedStyle && (
        <p className="text-sm text-muted-foreground rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2">
          {note}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs text-muted-foreground">Valor</p>
          <p className="font-medium">{formatCurrency(r.amount)}</p>
        </div>
        {r.paid_amount != null && (
          <div>
            <p className="text-xs text-muted-foreground">Valor pago</p>
            <p className="font-medium">{formatCurrency(r.paid_amount)}</p>
          </div>
        )}
        <div>
          <p className="text-xs text-muted-foreground">Emissão</p>
          <p className="font-medium">{formatDateTime(r.created_at)}</p>
        </div>
        {r.paid_at && (
          <div>
            <p className="text-xs text-muted-foreground">Pago em</p>
            <p className="font-medium">{formatDateTime(r.paid_at)}</p>
          </div>
        )}
        {r.due_at && (
          <div>
            <p className="text-xs text-muted-foreground">Vencimento</p>
            <p className="font-medium">{formatDateTime(r.due_at)}</p>
          </div>
        )}
      </div>

      {/* Boleto */}
      {(r.boleto_url || r.boleto_barcode || r.boleto_line) && (
        <>
          <Separator />
          <div className="space-y-2">
            <p className="text-xs font-semibold flex items-center gap-2">
              <FileText className="h-3.5 w-3.5" /> Boleto
            </p>
            {r.boleto_url && (
              <Button
                size="sm" variant="outline" asChild className="w-full sm:w-auto"
              >
                <a href={r.boleto_url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Abrir boleto
                </a>
              </Button>
            )}
            {(r.boleto_line || r.boleto_barcode) && (
              <div className="rounded-md bg-muted p-2 flex items-start gap-2">
                <code className="text-xs break-all flex-1">
                  {r.boleto_line || r.boleto_barcode}
                </code>
                <Button
                  size="icon" variant="ghost" className="h-7 w-7 shrink-0"
                  onClick={() => copyToClipboard(r.boleto_line || r.boleto_barcode || "", "Código de barras")}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
        </>
      )}

      {/* PIX */}
      {(r.pix_qr_code || r.pix_qr_code_url) && (
        <>
          <Separator />
          <div className="space-y-2">
            <p className="text-xs font-semibold flex items-center gap-2">
              <QrCode className="h-3.5 w-3.5" /> PIX
            </p>
            {r.pix_qr_code_url && (
              <div className="flex justify-center">
                <img
                  src={r.pix_qr_code_url}
                  alt="QR Code PIX"
                  className="h-40 w-40 rounded-md border bg-white p-2"
                />
              </div>
            )}
            {r.pix_qr_code && (
              <div className="rounded-md bg-muted p-2 flex items-start gap-2">
                <code className="text-xs break-all flex-1">{r.pix_qr_code}</code>
                <Button
                  size="icon" variant="ghost" className="h-7 w-7 shrink-0"
                  onClick={() => copyToClipboard(r.pix_qr_code || "", "Código PIX")}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
            {r.pix_expires_at && (
              <p className="text-xs text-muted-foreground">
                Expira em {formatDateTime(r.pix_expires_at)}
              </p>
            )}
          </div>
        </>
      )}

      {/* Cartão */}
      {(r.card_brand || r.card_last_four) && (
        <>
          <Separator />
          <div className="text-sm">
            <p className="text-xs text-muted-foreground">Cartão</p>
            <p className="font-medium">
              {(r.card_brand ?? "").toUpperCase()} •••• {r.card_last_four ?? "----"}
            </p>
            {(r.acquirer_tid || r.acquirer_nsu) && (
              <p className="text-xs text-muted-foreground mt-1">
                {r.acquirer_tid && <>TID: {r.acquirer_tid} </>}
                {r.acquirer_nsu && <>NSU: {r.acquirer_nsu}</>}
              </p>
            )}
          </div>
        </>
      )}

      {r.charge_id && !showScheduledStyle && (
        <p className="text-[10px] text-muted-foreground pt-1">
          ID: <code>{r.charge_id}</code>
        </p>
      )}
    </div>
  );
};

const SubscriptionReceiptView = ({ subscriptionId, onBack }: Props) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [latest, setLatest] = useState<PagarmeReceipt | null>(null);
  const [lastPaid, setLastPaid] = useState<PagarmeReceipt | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getPagarmeReceipt(subscriptionId);
      setLatest(data.latest);
      setLastPaid(data.last_paid);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao buscar comprovante");
    } finally {
      setLoading(false);
    }
  }, [subscriptionId]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
        </Button>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Atualizar"}
        </Button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-10 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Buscando comprovante…
        </div>
      )}

      {!loading && error && (
        <div className="rounded-md bg-destructive/10 text-destructive p-3 text-sm">
          {error}
        </div>
      )}

      {!loading && !error && !latest && !lastPaid && (
        <div className="rounded-md bg-muted p-4 text-sm text-muted-foreground">
          Nenhum comprovante encontrado para esta assinatura ainda.
        </div>
      )}

      {!loading && !error && latest && <ReceiptCard r={latest} />}
      {!loading && !error && lastPaid && lastPaid.charge_id !== latest?.charge_id && (
        <ReceiptCard r={lastPaid} title="Último pagamento confirmado" />
      )}
    </div>
  );
};

export default SubscriptionReceiptView;
