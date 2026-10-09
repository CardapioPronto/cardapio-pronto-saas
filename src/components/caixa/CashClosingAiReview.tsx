import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { formatarMoeda } from "@/utils/dashboardUtils";
import { Loader2, Sparkles } from "lucide-react";

export interface CashAiReview {
  readable: boolean;
  extracted: {
    provider: string | null;
    batch: string | null;
    credit: number | null;
    debit: number | null;
    voucher: number | null;
    pix: number | null;
    total: number | null;
    transactions_count: number | null;
  };
  divergences: {
    field: string;
    declared: number | null;
    found: number | null;
    difference: number | null;
    comment: string;
  }[];
  probable_causes: { cause: string; likelihood: "alta" | "media" | "baixa"; how_to_check: string }[];
  summary: string;
  risk_level: "ok" | "atencao" | "critico";
}

interface Props {
  sessionId: string;
  declared: Record<string, number | string>;
  initialReview: CashAiReview | null;
  onApplyExtracted: (values: CashAiReview["extracted"]) => void;
}

const RISK_LABEL = { ok: "Sem divergências relevantes", atencao: "Atenção", critico: "Divergência crítica" };
const money = (value: number | null) => (value === null ? "—" : formatarMoeda(value));

/** Reduz a foto para no máximo 1600px em JPEG para enviar mais rápido. */
const compressImage = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Não foi possível ler a foto."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Arquivo não é uma imagem válida."));
      img.onload = () => {
        const scale = Math.min(1, 1600 / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });

const CashClosingAiReview = ({ sessionId, declared, initialReview, onApplyExtracted }: Props) => {
  const [image, setImage] = useState<string | null>(null);
  const [review, setReview] = useState<CashAiReview | null>(initialReview);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File | undefined) => {
    setError(null);
    if (!file) return;
    try {
      setImage(await compressImage(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Foto inválida.");
    }
  };

  const analyze = async () => {
    if (!image) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("cash-closing-ai-review", {
        body: { sessionId, image, declared },
      });
      if (fnError) {
        let message = fnError.message;
        try {
          const ctx = (fnError as { context?: Response }).context;
          const payload = ctx ? await ctx.json() : null;
          if (payload?.error) message = payload.error;
        } catch {
          // mantém mensagem original
        }
        throw new Error(message);
      }
      if (data?.error) throw new Error(data.error);
      setReview(data.review as CashAiReview);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível analisar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" /> Conferência com IA
        </CardTitle>
        <CardDescription>
          Preencha os totais acima, envie a foto do relatório da maquininha e a IA aponta divergências
          com as vendas do turno e as causas mais prováveis. Disponível para donos e gerentes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="caixa-foto">Foto do relatório da maquininha</Label>
            <Input
              id="caixa-foto"
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(event) => void handleFile(event.target.files?.[0])}
            />
          </div>
          <Button onClick={() => void analyze()} disabled={!image || loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            {loading ? "Analisando..." : "Analisar com IA"}
          </Button>
        </div>

        {image ? (
          <img src={image} alt="Relatório da maquininha enviado" className="max-h-56 rounded-md border object-contain" />
        ) : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        {review ? (
          <div className="space-y-4 rounded-md border p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={review.risk_level === "critico" ? "destructive" : review.risk_level === "atencao" ? "outline" : "secondary"}>
                {RISK_LABEL[review.risk_level]}
              </Badge>
              {!review.readable ? <Badge variant="destructive">Foto ilegível</Badge> : null}
            </div>
            <p className="text-sm">{review.summary}</p>

            {review.readable ? (
              <div className="space-y-2">
                <p className="text-sm font-medium">Lido na foto</p>
                <div className="grid gap-2 text-sm sm:grid-cols-3">
                  <span>Crédito: {money(review.extracted.credit)}</span>
                  <span>Débito: {money(review.extracted.debit)}</span>
                  <span>Voucher: {money(review.extracted.voucher)}</span>
                  <span>PIX: {money(review.extracted.pix)}</span>
                  <span>Total: {money(review.extracted.total)}</span>
                  <span>Transações: {review.extracted.transactions_count ?? "—"}</span>
                  <span>Maquininha: {review.extracted.provider ?? "—"}</span>
                  <span>Lote: {review.extracted.batch ?? "—"}</span>
                </div>
                <Button size="sm" variant="outline" onClick={() => onApplyExtracted(review.extracted)}>
                  Usar valores lidos no fechamento
                </Button>
              </div>
            ) : null}

            {review.divergences.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm font-medium">Divergências</p>
                <ul className="space-y-1 text-sm">
                  {review.divergences.map((item, index) => (
                    <li key={index}>
                      <strong>{item.field}</strong>: declarado {money(item.declared)} · encontrado {money(item.found)}
                      {item.difference !== null ? ` · diferença ${money(item.difference)}` : ""} — {item.comment}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {review.probable_causes.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm font-medium">Causas prováveis</p>
                <ul className="space-y-2 text-sm">
                  {review.probable_causes.map((item, index) => (
                    <li key={index}>
                      <Badge variant="outline" className="mr-2">{item.likelihood}</Badge>
                      {item.cause}
                      <p className="text-muted-foreground">Como conferir: {item.how_to_check}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <p className="text-xs text-muted-foreground">
              Sugestões geradas por IA — confira antes de fechar o caixa.
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
};

export default CashClosingAiReview;
