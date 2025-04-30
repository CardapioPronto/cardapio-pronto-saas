
import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, AlertCircle, Loader2, FileText, CreditCard } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { configurePaymentService, checkPaymentIntegrationStatus } from "@/services/paymentService";

const PagarmeConfig = () => {
  const [apiKey, setApiKey] = useState("");
  const [isLive, setIsLive] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState("");
  const [isTesting, setIsTesting] = useState(false);
  
  // Verificar configuração salva ao carregar
  useEffect(() => {
    const savedApiKey = localStorage.getItem("pagarme_api_key");
    const savedIsLive = localStorage.getItem("pagarme_is_live") === "true";
    
    if (savedApiKey) {
      setApiKey(savedApiKey);
      setIsLive(savedIsLive);
      setIsConfigured(true);
      
      // Configurar o serviço com as configurações salvas
      configurePaymentService(savedApiKey, savedIsLive);
    }
  }, []);

  // Salvar configurações
  const handleSaveConfig = () => {
    if (!apiKey.trim()) {
      toast.error("Chave de API é obrigatória");
      return;
    }
    
    try {
      // Salvar na configuração do serviço
      configurePaymentService(apiKey, isLive);
      
      // Salvar localmente para persistência
      localStorage.setItem("pagarme_api_key", apiKey);
      localStorage.setItem("pagarme_is_live", isLive.toString());
      
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
        <Tabs defaultValue="config" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="config" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              <span>Configurações</span>
            </TabsTrigger>
            <TabsTrigger value="docs" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span>Documentação</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="config">
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
                    <Label htmlFor="environment" className="flex items-center gap-1">
                      {isLive ? (
                        <>
                          <span className="text-red-500 font-medium">Produção</span>
                          <span className="text-sm text-muted-foreground">(cobrará clientes reais)</span>
                        </>
                      ) : (
                        <>
                          <span className="text-green font-medium">Homologação</span>
                          <span className="text-sm text-muted-foreground">(ambiente de testes)</span>
                        </>
                      )}
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
                <Button variant="outline" onClick={() => {
                  setApiKey("");
                  setIsLive(false);
                  setIsConfigured(false);
                  setStatus('idle');
                  localStorage.removeItem("pagarme_api_key");
                  localStorage.removeItem("pagarme_is_live");
                  toast.success("Configuração removida");
                }}>Limpar</Button>
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
            
            <Card className="mt-6">
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
          </TabsContent>
          
          <TabsContent value="docs">
            <Card>
              <CardHeader>
                <CardTitle>Documentação da integração</CardTitle>
                <CardDescription>
                  Guia prático para configurar o Pagar.me com nossa aplicação
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-2">Obter credenciais</h3>
                  <ol className="list-decimal ml-5 space-y-2">
                    <li>Acesse o <a href="https://dash.pagar.me/" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Dashboard do Pagar.me</a></li>
                    <li>Vá para Configurações &gt; Chaves de API</li>
                    <li>Copie sua chave de API para o ambiente desejado (teste ou produção)</li>
                    <li>Cole a chave no campo "Chave de API" nesta página</li>
                  </ol>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-2">Configurar Webhook</h3>
                  <ol className="list-decimal ml-5 space-y-2">
                    <li>No Dashboard do Pagar.me, vá para Configurações &gt; Webhooks</li>
                    <li>Adicione um novo webhook</li>
                    <li>Cole a URL do webhook fornecida nesta página</li>
                    <li>Selecione os eventos: subscription.created, subscription.canceled, invoice.paid, invoice.pending</li>
                    <li>Salve as configurações</li>
                  </ol>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-2">Testar a integração</h3>
                  <ol className="list-decimal ml-5 space-y-2">
                    <li>Configure sua chave de API no ambiente de homologação</li>
                    <li>Clique no botão "Testar conexão" para verificar se a chave está correta</li>
                    <li>Faça uma assinatura de teste para validar o fluxo completo</li>
                    <li>Verifique se os webhooks estão sendo recebidos corretamente</li>
                  </ol>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-2">Cartões de teste</h3>
                  <p className="mb-2">Para testes em ambiente de homologação, utilize os seguintes cartões:</p>
                  <div className="overflow-x-auto">
                    <table className="min-w-full border-collapse">
                      <thead>
                        <tr>
                          <th className="border px-4 py-2 bg-muted">Bandeira</th>
                          <th className="border px-4 py-2 bg-muted">Número</th>
                          <th className="border px-4 py-2 bg-muted">CVV</th>
                          <th className="border px-4 py-2 bg-muted">Data expiração</th>
                          <th className="border px-4 py-2 bg-muted">Resultado</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="border px-4 py-2">MasterCard</td>
                          <td className="border px-4 py-2 font-mono">5448280000000007</td>
                          <td className="border px-4 py-2">123</td>
                          <td className="border px-4 py-2">12/26</td>
                          <td className="border px-4 py-2">Aprovado</td>
                        </tr>
                        <tr>
                          <td className="border px-4 py-2">Visa</td>
                          <td className="border px-4 py-2 font-mono">4000000000000010</td>
                          <td className="border px-4 py-2">123</td>
                          <td className="border px-4 py-2">12/26</td>
                          <td className="border px-4 py-2">Recusado</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default PagarmeConfig;
