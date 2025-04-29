
import React, { useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { configurePaymentService, checkPaymentIntegrationStatus } from "@/services/paymentService";

const PagarmeConfig = () => {
  const [apiKey, setApiKey] = useState("");
  const [isLive, setIsLive] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState("");
  const [isTesting, setIsTesting] = useState(false);

  // Salvar configurações
  const handleSaveConfig = () => {
    if (!apiKey.trim()) {
      toast.error("Chave de API é obrigatória");
      return;
    }
    
    try {
      configurePaymentService(apiKey, isLive);
      setIsConfigured(true);
      toast.success("Configuração salva com sucesso!");
      
      // Verificar status da integração automaticamente
      handleTestIntegration();
    } catch (error) {
      toast.error("Erro ao salvar configuração");
      console.error(error);
    }
  };

  // Testar integração
  const handleTestIntegration = async () => {
    if (!isConfigured) {
      toast.error("Configure a integração antes de testar");
      return;
    }
    
    setIsTesting(true);
    setStatus('loading');
    
    try {
      const result = await checkPaymentIntegrationStatus();
      setStatus(result.status === 'ok' ? 'success' : 'error');
      setStatusMessage(result.message);
      
      if (result.status === 'ok') {
        toast.success("Integração verificada com sucesso!");
      } else {
        toast.error("Falha ao verificar integração");
      }
    } catch (error) {
      setStatus('error');
      setStatusMessage("Erro ao testar integração: " + (error instanceof Error ? error.message : "Erro desconhecido"));
      toast.error("Erro ao testar integração");
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <DashboardLayout title="Integração Pagar.me">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Configuração do Pagar.me</CardTitle>
            <CardDescription>
              Configure as credenciais da API do Pagar.me para processar pagamentos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="api-key">Chave de API</Label>
                <Input
                  id="api-key"
                  placeholder="Insira sua chave de API do Pagar.me"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  type="password"
                />
                <p className="text-sm text-muted-foreground">
                  Encontre suas chaves de API no painel do Pagar.me em Configurações &gt; Chaves de API
                </p>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="environment"
                  checked={isLive}
                  onCheckedChange={setIsLive}
                />
                <Label htmlFor="environment">
                  {isLive ? "Produção (cobrará clientes reais)" : "Homologação (ambiente de testes)"}
                </Label>
              </div>
            </div>
            
            {status !== 'idle' && (
              <Alert variant={status === 'success' ? "default" : "destructive"}>
                {status === 'loading' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : status === 'success' ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <AlertTitle>
                  {status === 'loading' 
                    ? "Testando integração..." 
                    : status === 'success' 
                      ? "Integração ativa" 
                      : "Falha na integração"}
                </AlertTitle>
                <AlertDescription>
                  {statusMessage}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline">Cancelar</Button>
            <div className="flex space-x-2">
              <Button 
                variant="outline"
                onClick={handleTestIntegration}
                disabled={!isConfigured || isTesting}
              >
                {isTesting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Testar conexão
              </Button>
              <Button onClick={handleSaveConfig} className="bg-green hover:bg-green-dark">
                Salvar configuração
              </Button>
            </div>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Webhook de pagamentos</CardTitle>
            <CardDescription>
              Configure seu webhook para receber atualizações de pagamento
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="webhook-url">URL do Webhook</Label>
              <Input
                id="webhook-url"
                value={`${window.location.origin}/api/webhooks/pagarme`}
                readOnly
              />
              <p className="text-sm text-muted-foreground">
                Configure esta URL no seu painel do Pagar.me para receber callbacks de pagamento
              </p>
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="w-full" onClick={() => {
              navigator.clipboard.writeText(`${window.location.origin}/api/webhooks/pagarme`);
              toast.success("URL copiada para clipboard!");
            }}>
              Copiar URL
            </Button>
          </CardFooter>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default PagarmeConfig;
