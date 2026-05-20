import { Button } from "@/components/ui/button";
import { ExternalLink, Copy, FileText } from "lucide-react";
import { toast } from "@/components/ui/sonner-toast";

export type BoletoPaymentDetails = {
  boleto_url?: string | null;
  boleto_barcode?: string | null;
  boleto_line?: string | null;
  due_at?: string | null;
};

interface BoletoPaymentConfirmationProps {
  planName: string;
  payment: BoletoPaymentDetails;
  onContinue: () => void;
}

const formatDueDate = (value: string | null | undefined) => {
  if (!value) return null;
  try {
    return new Date(value).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return null;
  }
};

const copyText = async (value: string, label: string) => {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copiado`);
  } catch {
    toast.error("Não foi possível copiar");
  }
};

const BoletoPaymentConfirmation = ({
  planName,
  payment,
  onContinue,
}: BoletoPaymentConfirmationProps) => {
  const dueLabel = formatDueDate(payment.due_at);
  const boletoUrl = payment.boleto_url ?? null;
  const digitableLine = payment.boleto_line ?? null;

  return (
    <div className="space-y-5 p-6">
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-orange/10 p-2">
          <FileText className="h-5 w-5 text-orange" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Boleto gerado — {planName}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Sua assinatura ficará <strong>aguardando pagamento</strong> até a confirmação do boleto.
            O acesso completo ao Pubfy é liberado após a compensação (geralmente em até 3 dias úteis).
          </p>
          {dueLabel && (
            <p className="mt-2 text-sm">
              Vencimento: <span className="font-medium">{dueLabel}</span>
            </p>
          )}
        </div>
      </div>

      {digitableLine && (
        <div className="space-y-2 rounded-lg border bg-muted/30 p-4">
          <p className="text-xs font-medium text-muted-foreground">Linha digitável</p>
          <p className="break-all font-mono text-sm">{digitableLine}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => copyText(digitableLine, "Linha digitável")}
          >
            <Copy className="mr-2 h-4 w-4" />
            Copiar linha digitável
          </Button>
        </div>
      )}

      {boletoUrl && (
        <Button type="button" className="w-full bg-green hover:bg-green-dark" asChild>
          <a href={boletoUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="mr-2 h-4 w-4" />
            Abrir boleto (PDF)
          </a>
        </Button>
      )}

      {!boletoUrl && !digitableLine && (
        <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          O boleto será enviado para o e-mail informado. Você também pode consultar o comprovante em
          Assinaturas → Gerenciar assinatura após alguns instantes.
        </p>
      )}

      <p className="text-xs text-muted-foreground">
        Enviamos um e-mail com os dados da assinatura. Se já pagou, a confirmação pode levar alguns
        minutos após o webhook do Pagar.me.
      </p>

      <Button type="button" variant="outline" className="w-full" onClick={onContinue}>
        Ir para minhas assinaturas
      </Button>
    </div>
  );
};

export default BoletoPaymentConfirmation;
