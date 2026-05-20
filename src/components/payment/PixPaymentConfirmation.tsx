import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Copy, QrCode } from "lucide-react";
import { toast } from "@/components/ui/sonner-toast";

export type PixPaymentDetails = {
  pix_qr_code?: string | null;
  pix_qr_code_url?: string | null;
  pix_expires_at?: string | null;
};

interface PixPaymentConfirmationProps {
  planName: string;
  payment: PixPaymentDetails;
  onContinue: () => void;
}

const formatExpiresAt = (value: string | null | undefined) => {
  if (!value) return null;
  try {
    return new Date(value).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return null;
  }
};

const PixPaymentConfirmation = ({
  planName,
  payment,
  onContinue,
}: PixPaymentConfirmationProps) => {
  const qrCode = payment.pix_qr_code ?? null;
  const qrCodeUrl = payment.pix_qr_code_url ?? null;
  const expiresLabel = formatExpiresAt(payment.pix_expires_at);

  const copyPix = async () => {
    if (!qrCode) return;
    try {
      await navigator.clipboard.writeText(qrCode);
      toast.success("Código PIX copiado");
    } catch {
      toast.error("Não foi possível copiar");
    }
  };

  return (
    <div className="space-y-5 p-6">
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-orange/10 p-2">
          <QrCode className="h-5 w-5 text-orange" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">PIX gerado — {planName}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Sua assinatura ficará <strong>aguardando pagamento</strong> até a confirmação do PIX.
            No ambiente de teste, valores até R$ 500 são confirmados automaticamente em alguns segundos.
          </p>
          {expiresLabel && (
            <p className="mt-2 text-sm">
              Expira em: <span className="font-medium">{expiresLabel}</span>
            </p>
          )}
        </div>
      </div>

      {qrCodeUrl && (
        <div className="flex justify-center">
          <img
            src={qrCodeUrl}
            alt="QR Code PIX"
            className="h-48 w-48 rounded-lg border bg-white p-2"
          />
        </div>
      )}

      {qrCode && (
        <div className="space-y-2 rounded-lg border bg-muted/30 p-4">
          <Label className="text-xs text-muted-foreground">PIX copia e cola</Label>
          <textarea
            readOnly
            value={qrCode}
            rows={4}
            className="w-full resize-none rounded-md border bg-background p-2 font-mono text-xs"
          />
          <Button type="button" variant="outline" size="sm" onClick={copyPix}>
            <Copy className="mr-2 h-4 w-4" />
            Copiar código PIX
          </Button>
        </div>
      )}

      {!qrCode && !qrCodeUrl && (
        <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          O QR Code será disponibilizado em Assinaturas → Gerenciar assinatura em instantes.
          Você também receberá instruções por e-mail.
        </p>
      )}

      <Button type="button" variant="outline" className="w-full" onClick={onContinue}>
        Ir para minhas assinaturas
      </Button>
    </div>
  );
};

export default PixPaymentConfirmation;
