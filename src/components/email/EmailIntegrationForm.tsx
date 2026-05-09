import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle, ExternalLink, Loader2, Mail, Send, Settings } from "lucide-react";
import { toast } from "@/components/ui/sonner-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  EmailIntegrationScope,
  getEmailIntegrationSettings,
  saveEmailIntegrationSettings,
  sendEmailIntegrationTest,
} from "@/services/emailIntegrationService";

interface EmailIntegrationFormProps {
  scope: EmailIntegrationScope;
}

export function EmailIntegrationForm({ scope }: EmailIntegrationFormProps) {
  const [apiKey, setApiKey] = useState("");
  const [fromName, setFromName] = useState(scope === "system" ? "Pubfy" : "");
  const [fromEmail, setFromEmail] = useState(scope === "system" ? "contato@mail.pubfy.com.br" : "");
  const [replyTo, setReplyTo] = useState(scope === "system" ? "contato@pubfy.com.br" : "");
  const [isEnabled, setIsEnabled] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [apiKeyPreview, setApiKeyPreview] = useState<string | null>(null);
  const [testEmail, setTestEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadSettings() {
      setLoading(true);
      try {
        const settings = await getEmailIntegrationSettings(scope);
        if (!mounted || !settings) return;

        setFromName(settings.fromName || (scope === "system" ? "Pubfy" : ""));
        setFromEmail(settings.fromEmail || (scope === "system" ? "contato@mail.pubfy.com.br" : ""));
        setReplyTo(settings.replyTo || (scope === "system" ? "contato@pubfy.com.br" : ""));
        setIsEnabled(settings.isEnabled);
        setHasApiKey(settings.hasApiKey);
        setApiKeyPreview(settings.apiKeyPreview);
      } catch (error) {
        console.error("Erro ao carregar configuração de e-mail:", error);
        toast.error("Erro ao carregar configuração de e-mail");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void loadSettings();

    return () => {
      mounted = false;
    };
  }, [scope]);

  const handleSave = async () => {
    if (!fromName.trim() || !fromEmail.trim()) {
      toast.error("Informe nome e e-mail do remetente");
      return;
    }

    if (!apiKey.trim() && !hasApiKey) {
      toast.error("Informe a chave de API do Resend");
      return;
    }

    setSaving(true);
    try {
      const settings = await saveEmailIntegrationSettings({
        scope,
        apiKey: apiKey.trim() || undefined,
        fromName,
        fromEmail,
        replyTo,
        isEnabled,
      });

      setApiKey("");
      setHasApiKey(!!settings?.hasApiKey);
      setApiKeyPreview(settings?.apiKeyPreview || null);
      toast.success("Configuração de e-mail salva com sucesso");
    } catch (error) {
      console.error("Erro ao salvar configuração de e-mail:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao salvar configuração de e-mail");
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!testEmail.trim()) {
      toast.error("Informe um e-mail para teste");
      return;
    }

    setTesting(true);
    try {
      await sendEmailIntegrationTest(scope, testEmail);
      toast.success("E-mail de teste enviado");
    } catch (error) {
      console.error("Erro ao enviar e-mail de teste:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao enviar e-mail de teste");
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            <CardTitle>Resend</CardTitle>
          </div>
          <CardDescription>
            {scope === "system"
              ? "Configuração global usada por e-mails do Pubfy, como o formulário de contato."
              : "Configuração do restaurante para enviar e-mails usando uma conta própria do Resend."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert variant={isEnabled && hasApiKey ? "default" : "destructive"}>
            {isEnabled && hasApiKey ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            <AlertTitle>{isEnabled && hasApiKey ? "Integração ativa" : "Integração pendente"}</AlertTitle>
            <AlertDescription>
              {hasApiKey
                ? `Chave cadastrada: ${apiKeyPreview}`
                : "Cadastre uma chave de API do Resend para habilitar o envio."}
            </AlertDescription>
          </Alert>

          <div className="flex items-center justify-between gap-4">
            <div>
              <Label htmlFor="email-enabled">Habilitar envio por Resend</Label>
              <p className="text-sm text-muted-foreground">
                Desative para manter a configuração salva sem realizar disparos.
              </p>
            </div>
            <Switch id="email-enabled" checked={isEnabled} onCheckedChange={setIsEnabled} />
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <h3 className="text-base font-medium">Credenciais e remetente</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open("https://resend.com/api-keys", "_blank")}
                className="ml-auto"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Resend
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="resend-api-key">API key</Label>
                <Input
                  id="resend-api-key"
                  type="password"
                  value={apiKey}
                  onChange={(event) => setApiKey(event.target.value)}
                  placeholder={hasApiKey ? "Preencha apenas para trocar a chave" : "re_..."}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="from-name">Nome do remetente</Label>
                <Input
                  id="from-name"
                  value={fromName}
                  onChange={(event) => setFromName(event.target.value)}
                  placeholder="Pubfy"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="from-email">E-mail do remetente</Label>
                <Input
                  id="from-email"
                  type="email"
                  value={fromEmail}
                  onChange={(event) => setFromEmail(event.target.value)}
                  placeholder="contato@mail.pubfy.com.br"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reply-to">Responder para</Label>
                <Input
                  id="reply-to"
                  type="email"
                  value={replyTo}
                  onChange={(event) => setReplyTo(event.target.value)}
                  placeholder="contato@pubfy.com.br"
                />
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar configuração
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Teste de envio</CardTitle>
          <CardDescription>Envie uma mensagem simples para validar a chave, domínio e remetente.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              type="email"
              value={testEmail}
              onChange={(event) => setTestEmail(event.target.value)}
              placeholder="email@exemplo.com"
            />
            <Button variant="outline" onClick={handleTest} disabled={testing || !isEnabled || !hasApiKey}>
              {testing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Enviar teste
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
