import { useEffect, useState } from "react";
import { supabase, supabaseUrl } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RefreshCw, Copy, Check } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface WebhookEvent {
  id: string;
  event_id: string | null;
  event_type: string;
  pagarme_subscription_id: string | null;
  pagarme_order_id: string | null;
  order_id: string | null;
  pagarme_customer_id: string | null;
  payload: unknown;
  processed: boolean;
  processing_error: string | null;
  signature_valid: boolean | null;
  created_at: string;
  processed_at: string | null;
}

const WEBHOOK_URL = `${supabaseUrl.replace(/\/+$/, "")}/functions/v1/pagarme-webhook`;

export const PagarmeWebhooksPanel = () => {
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<WebhookEvent | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchEvents = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("pagarme_webhook_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) {
      toast({ title: "Erro ao carregar eventos", description: error.message, variant: "destructive" });
    } else {
      setEvents((data ?? []) as WebhookEvent[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const filtered = events.filter((e) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      e.event_type.toLowerCase().includes(s) ||
      (e.pagarme_subscription_id ?? "").toLowerCase().includes(s) ||
      (e.event_id ?? "").toLowerCase().includes(s)
    );
  });

  const copyUrl = async () => {
    await navigator.clipboard.writeText(WEBHOOK_URL);
    setCopied(true);
    toast({ title: "URL copiada!" });
    setTimeout(() => setCopied(false), 2000);
  };

  const statusBadge = (e: WebhookEvent) => {
    if (!e.signature_valid) return <Badge variant="destructive">Assinatura inválida</Badge>;
    if (e.processing_error) return <Badge variant="destructive">Erro</Badge>;
    if (e.processed) return <Badge className="bg-green-600">Processado</Badge>;
    return <Badge variant="secondary">Pendente</Badge>;
  };

  return (
    <>
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">URL do Webhook</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-2 items-center">
            <Input value={WEBHOOK_URL} readOnly className="font-mono text-sm" />
            <Button variant="outline" onClick={copyUrl}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <CardTitle className="text-base">Eventos recebidos ({filtered.length})</CardTitle>
            <div className="flex gap-2">
              <Input
                placeholder="Filtrar por tipo, sub_id, event_id..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-72"
              />
              <Button variant="outline" onClick={fetchEvents} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                Atualizar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Subscription ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Carregando...
                    </TableCell>
                  </TableRow>
                )}
                {!loading && filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Nenhum evento recebido ainda.
                    </TableCell>
                  </TableRow>
                )}
                {filtered.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="text-sm">
                      {new Date(e.created_at).toLocaleString("pt-BR")}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{e.event_type}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {e.pagarme_subscription_id ?? "—"}
                    </TableCell>
                    <TableCell>{statusBadge(e)}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => setSelected(e)}>
                        Ver
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{selected?.event_type}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              <div><span className="text-muted-foreground">Event ID:</span> <span className="font-mono">{selected.event_id ?? "—"}</span></div>
              <div><span className="text-muted-foreground">Subscription:</span> <span className="font-mono">{selected.pagarme_subscription_id ?? "—"}</span></div>
              <div><span className="text-muted-foreground">Customer:</span> <span className="font-mono">{selected.pagarme_customer_id ?? "—"}</span></div>
              <div><span className="text-muted-foreground">Recebido em:</span> {new Date(selected.created_at).toLocaleString("pt-BR")}</div>
              {selected.processed_at && (
                <div><span className="text-muted-foreground">Processado em:</span> {new Date(selected.processed_at).toLocaleString("pt-BR")}</div>
              )}
              {selected.processing_error && (
                <div className="text-destructive"><strong>Erro:</strong> {selected.processing_error}</div>
              )}
              <div>
                <div className="text-muted-foreground mb-1">Payload:</div>
                <pre className="bg-muted p-3 rounded text-xs overflow-auto max-h-96">
                  {JSON.stringify(selected.payload, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PagarmeWebhooksPanel;
