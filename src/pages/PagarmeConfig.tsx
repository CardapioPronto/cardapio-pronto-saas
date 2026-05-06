import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/sonner";
import { Copy, CreditCard, ShieldCheck } from "lucide-react";

const WEBHOOK_URL =
  "https://jyrfjvyeikhqpuwcvdff.supabase.co/functions/v1/pagarme-webhook";

const PagarmeConfig = () => {
  const copyWebhookUrl = async () => {
    await navigator.clipboard.writeText(WEBHOOK_URL);
    toast.success("URL do webhook copiada");
  };

  return (
    <DashboardLayout title="Integração Pagar.me">
      <div className="space-y-6">
        <Alert className="border-green/40 bg-green/5">
          <ShieldCheck className="h-4 w-4 text-green" />
          <AlertTitle>Configuração protegida no servidor</AlertTitle>
          <AlertDescription>
            As chaves do Pagar.me não são salvas no navegador. Em produção,
            configure as secrets das Edge Functions no Supabase.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Pagamentos de assinaturas
            </CardTitle>
            <CardDescription>
              O checkout usa as Edge Functions para criar clientes, cartões,
              assinaturas e receber eventos do Pagar.me.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-md border bg-muted/20 p-4">
                <p className="text-sm font-medium">Secret obrigatória</p>
                <p className="mt-1 font-mono text-sm">PAGARME_SECRET_KEY</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Use a chave de produção no ambiente de produção e a chave de
                  teste apenas em homologação.
                </p>
              </div>

              <div className="rounded-md border bg-muted/20 p-4">
                <p className="text-sm font-medium">Secret recomendada</p>
                <p className="mt-1 font-mono text-sm">PAGARME_WEBHOOK_SECRET</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Use a mesma chave/segredo configurado no webhook para validar
                  a assinatura dos eventos recebidos.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="webhook-url">URL do webhook</Label>
              <div className="flex gap-2">
                <Input id="webhook-url" value={WEBHOOK_URL} readOnly className="font-mono text-sm" />
                <Button type="button" variant="outline" onClick={copyWebhookUrl}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Configure esta URL no painel do Pagar.me e selecione eventos de
                assinatura, fatura e cobrança.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default PagarmeConfig;
