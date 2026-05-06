import AdminLayout from "@/components/admin/AdminLayout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/sonner";
import { CheckCircle, Copy, CreditCard, ShieldCheck } from "lucide-react";

const WEBHOOK_URL =
  "https://jyrfjvyeikhqpuwcvdff.supabase.co/functions/v1/pagarme-webhook";

const AdminPagarme = () => {
  const copyWebhookUrl = async () => {
    await navigator.clipboard.writeText(WEBHOOK_URL);
    toast.success("URL do webhook copiada");
  };

  return (
    <AdminLayout title="Configuração Pagar.me">
      <div className="space-y-6">
        <Alert className="border-green/40 bg-green/5">
          <ShieldCheck className="h-4 w-4 text-green" />
          <AlertTitle>Credenciais configuradas via Supabase Secrets</AlertTitle>
          <AlertDescription>
            Para produção, configure as chaves no ambiente das Edge Functions.
            Elas não devem ser salvas no navegador nem em telas administrativas.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Checklist da integração
            </CardTitle>
            <CardDescription>
              Itens que precisam estar prontos antes de aceitar pagamentos reais.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-md border bg-muted/20 p-4">
                <div className="flex items-center gap-2 font-medium">
                  <CheckCircle className="h-4 w-4 text-green" />
                  Secret de API
                </div>
                <p className="mt-2 font-mono text-sm">PAGARME_SECRET_KEY</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Deve ser a chave do ambiente correto: teste para homologação,
                  produção para cobrança real.
                </p>
              </div>

              <div className="rounded-md border bg-muted/20 p-4">
                <div className="flex items-center gap-2 font-medium">
                  <CheckCircle className="h-4 w-4 text-green" />
                  Assinatura de webhook
                </div>
                <p className="mt-2 font-mono text-sm">PAGARME_WEBHOOK_SECRET</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Use o segredo/chave esperado pelo webhook para validar os
                  eventos recebidos.
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
                Eventos recomendados: subscription.created, subscription.updated,
                subscription.canceled, invoice.paid, invoice.payment_failed,
                charge.paid, charge.payment_failed e charge.pending.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminPagarme;
