
import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "@/components/ui/sonner-toast";
import { AlertCircle, CheckCircle, RefreshCw, ShieldCheck, Wifi } from "lucide-react";
import {
  IfoodCredentials,
  getIfoodIntegrationConfig,
  pollIfoodEvents,
  saveIfoodIntegrationConfig,
  setIfoodIntegrationStatus,
  testIfoodConnection,
  updateIfoodPollingSettings,
} from "@/services/ifoodService";
import { getCurrentRestaurantId } from "@/lib/supabase";
import { useCurrentUser } from "@/hooks/useCurrentUser";

function useRestaurantId(
  user: unknown,
  setRestaurantId: (id: string) => void,
  setIsLoading: (loading: boolean) => void
) {
  useEffect(() => {
    const loadRestaurantId = async () => {
      if (user) {
        try {
          const id = await getCurrentRestaurantId();
          if (id) {
            setRestaurantId(id);
          } else {
            toast.error("Restaurante não encontrado");
            setIsLoading(false);
          }
        } catch (error) {
          console.error("Erro ao obter ID do restaurante:", error);
          toast.error("Erro ao obter informações do restaurante");
          setIsLoading(false);
        }
      }
    };
    loadRestaurantId();
  }, [user, setRestaurantId, setIsLoading]);
}

interface IfoodIntegrationConfig {
  isEnabled: boolean;
  pollingEnabled: boolean;
  pollingInterval: number;
}

async function saveCredentialsHelper(
  restaurantId: string,
  credentials: IfoodCredentials,
  config: IfoodIntegrationConfig,
  hasStoredCredentials: boolean,
  setHasStoredCredentials: (value: boolean) => void,
  setIsConfiguring: (b: boolean) => void,
  toast: { success: (msg: string) => void; error: (msg: string) => void },
  setCredentials: React.Dispatch<React.SetStateAction<IfoodCredentials>>
) {
  setIsConfiguring(true);
  try {
    if (!credentials.clientId || (!credentials.clientSecret && !hasStoredCredentials) || !credentials.merchantId) {
      toast.error("Por favor, preencha todos os campos obrigatórios");
      return;
    }
    const result = await saveIfoodIntegrationConfig({
      restaurantId,
      clientId: credentials.clientId.trim(),
      clientSecret: credentials.clientSecret.trim() || undefined,
      merchantId: credentials.merchantId.trim(),
      restaurantIfoodId: credentials.restaurantId?.trim() || undefined,
      isEnabled: config.isEnabled,
      pollingEnabled: config.pollingEnabled,
      pollingInterval: config.pollingInterval,
    });

    setHasStoredCredentials(result.config.hasStoredCredentials);
    setCredentials((current) => ({ ...current, clientSecret: "" }));
    toast.success("Credenciais salvas com sucesso");
  } catch (error) {
    console.error("Erro ao salvar credenciais:", error);
    toast.error(error instanceof Error ? error.message : "Erro ao salvar credenciais");
  } finally {
    setIsConfiguring(false);
  }
}

async function testConnectionHelper(
  restaurantId: string,
  setIsLoading: (b: boolean) => void,
  setTestResult: (result: { success: boolean; message: string } | null) => void,
  toast: { success: (msg: string) => void; error: (msg: string) => void }
) {
  setIsLoading(true);
  setTestResult(null);
  try {
    const result = await testIfoodConnection(restaurantId);
    setTestResult({
      success: result.success,
      message: result.message || "Conexão estabelecida com sucesso!"
    });
    toast.success("Conexão com iFood validada");
  } catch (error) {
    console.error("Erro na conexão com iFood:", error);
    setTestResult({
      success: false,
      message: "Falha na conexão. Verifique suas credenciais."
    });
  } finally {
    setIsLoading(false);
  }
}

async function pollNowHelper(
  restaurantId: string,
  setIsPollingNow: (b: boolean) => void,
  setLastPollResult: (result: string | null) => void,
) {
  setIsPollingNow(true);
  try {
    const result = await pollIfoodEvents(restaurantId);
    const message = `${result.eventsReceived} evento(s), ${result.eventsStored} armazenado(s), ${result.eventsAcknowledged} confirmado(s), ${result.ordersImported} pedido(s) importado(s).`;
    setLastPollResult(message);
    toast.success("Consulta ao iFood concluída");
  } catch (error) {
    console.error("Erro ao consultar eventos do iFood:", error);
    const message = error instanceof Error ? error.message : "Falha ao consultar eventos do iFood";
    setLastPollResult(message);
    toast.error(message);
  } finally {
    setIsPollingNow(false);
  }
}

// Helper to toggle integration enabled/disabled
async function toggleIntegrationHelper(
  enabled: boolean,
  restaurantId: string,
  setConfig: React.Dispatch<React.SetStateAction<IfoodIntegrationConfig>>,
  toast: { success: (msg: string) => void; error: (msg: string) => void }
) {
  try {
    const result = await setIfoodIntegrationStatus(restaurantId, enabled);
    setConfig((prev: IfoodIntegrationConfig) => ({
      ...prev,
      isEnabled: result.config.isEnabled,
      pollingEnabled: result.config.pollingEnabled,
      pollingInterval: result.config.pollingInterval,
    }));
    toast.success(`Integração ${enabled ? 'ativada' : 'desativada'} com sucesso`);
  } catch (error) {
    console.error("Erro ao alterar status da integração:", error);
    toast.error(error instanceof Error ? error.message : "Erro ao alterar status da integração");
  }
}

// Helper to update polling settings
async function updatePollingSettingsHelper(
  pollingEnabled: boolean,
  interval: number | undefined,
  restaurantId: string,
  setConfig: React.Dispatch<React.SetStateAction<IfoodIntegrationConfig>>,
  toast: { success: (msg: string) => void; error: (msg: string) => void }
) {
  try {
    const result = await updateIfoodPollingSettings(
      restaurantId,
      pollingEnabled,
      interval
    );
    setConfig((prev: IfoodIntegrationConfig) => ({
      ...prev,
      pollingEnabled: result.config.pollingEnabled,
      pollingInterval: result.config.pollingInterval
    }));
    toast.success("Configurações de sincronização atualizadas");
  } catch (error) {
    console.error("Erro ao atualizar configurações de sincronização:", error);
    toast.error(error instanceof Error ? error.message : "Erro ao atualizar configurações");
  }
}

const IfoodIntegracao = () => {
  const { user } = useCurrentUser();
  const [activeTab, setActiveTab] = useState("geral");
  const [isLoading, setIsLoading] = useState(true);
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [isPollingNow, setIsPollingNow] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [lastPollResult, setLastPollResult] = useState<string | null>(null);
  const [hasStoredCredentials, setHasStoredCredentials] = useState(false);
  const [restaurantId, setRestaurantId] = useState<string>("");

  const [credentials, setCredentials] = useState<IfoodCredentials>({
    clientId: "",
    clientSecret: "",
    merchantId: "",
    restaurantId: ""
  });
  const [config, setConfig] = useState<IfoodIntegrationConfig>({
    isEnabled: false,
    pollingEnabled: true,
    pollingInterval: 60
  });

  useRestaurantId(user, setRestaurantId, setIsLoading);

  const loadExistingConfig = useCallback(async () => {
    if (!restaurantId) return;

    setIsLoading(true);
    try {
      const result = await getIfoodIntegrationConfig(restaurantId);
      const data = result.config;
      if (data) {
        setCredentials({
          clientId: data.clientId,
          clientSecret: "",
          merchantId: data.merchantId,
          restaurantId: data.restaurantIfoodId ?? ""
        });
        setHasStoredCredentials(data.hasStoredCredentials);

        setConfig({
          isEnabled: data.isEnabled,
          pollingEnabled: data.pollingEnabled,
          pollingInterval: data.pollingInterval
        });
      }
    } catch (error) {
      console.error("Erro ao carregar configurações:", error);
      toast.error("Erro ao carregar configurações");
    } finally {
      setIsLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    if (restaurantId) {
      loadExistingConfig();
    }
  }, [restaurantId, loadExistingConfig]);

  const handleSaveCredentials = async () => {
    if (!restaurantId) {
      toast.error("ID do restaurante não encontrado");
      return;
    }
    await saveCredentialsHelper(restaurantId, credentials, config, hasStoredCredentials, setHasStoredCredentials, setIsConfiguring, toast, setCredentials);
  };

  const handleTestConnection = async () => {
    await testConnectionHelper(restaurantId, setIsLoading, setTestResult, toast);
  };

  const handlePollNow = async () => {
    await pollNowHelper(restaurantId, setIsPollingNow, setLastPollResult);
  };

  const toggleIntegration = async (enabled: boolean) => {
    if (!restaurantId) {
      toast.error("ID do restaurante não encontrado");
      return;
    }
    await toggleIntegrationHelper(enabled, restaurantId, setConfig, toast);
  };

  const updatePollingSettings = async (pollingEnabled: boolean, interval?: number) => {
    if (!restaurantId) {
      toast.error("ID do restaurante não encontrado");
      return;
    }
    await updatePollingSettingsHelper(pollingEnabled, interval, restaurantId, setConfig, toast);
  };

  const credentialsConfigured = Boolean(credentials.clientId && (credentials.clientSecret || hasStoredCredentials) && credentials.merchantId);

  if (isLoading) {
    return (
      <DashboardLayout title="Integração com iFood">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-muted-foreground">Carregando configurações...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!restaurantId) {
    return (
      <DashboardLayout title="Integração com iFood">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-destructive">Erro: Restaurante não encontrado</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Integração com iFood">
      <div className="space-y-6">
        <Alert className="border-amber-200 bg-amber-50 text-amber-950">
          <ShieldCheck className="h-4 w-4 text-amber-700" />
          <AlertTitle>Integração preparada para homologação</AlertTitle>
          <AlertDescription>
            As chamadas sensíveis agora passam por Edge Function. O polling usa os endpoints atuais do iFood e registra eventos antes do ACK.
            Para uso contínuo em produção, agende a função a cada 30 segundos no Supabase após validar as credenciais.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle className="text-xl flex items-center">
                  Status da Integração
                  <Badge
                    variant="outline"
                    className={`ml-2 ${
                      config.isEnabled
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border-slate-200 bg-slate-50 text-slate-700'
                    }`}
                  >
                    {config.isEnabled ? 'Ativada' : 'Desativada'}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  {config.isEnabled 
                    ? 'Sua integração com iFood está ativa e funcionando'
                    : 'Ative a integração para começar a receber pedidos do iFood'}
                </CardDescription>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="integration-status"
                  checked={config.isEnabled}
                  onCheckedChange={toggleIntegration}
                  disabled={!credentialsConfigured || isLoading}
                />
                <Label htmlFor="integration-status">
                  {config.isEnabled ? 'Ativada' : 'Desativada'}
                </Label>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full md:w-auto grid-cols-3 md:inline-flex">
            <TabsTrigger value="geral">Geral</TabsTrigger>
            <TabsTrigger value="credenciais">Credenciais</TabsTrigger>
            <TabsTrigger value="sincronizacao">Sincronização</TabsTrigger>
          </TabsList>
          
          <div className="mt-6">
            <TabsContent value="geral">
              <Card>
                <CardHeader>
                  <CardTitle>Integração com iFood</CardTitle>
                  <CardDescription>
                    Conecte seu estabelecimento com o iFood para receber pedidos diretamente no sistema
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Como funciona</h3>
                    <p className="text-muted-foreground">
                      A integração com o iFood permite que você receba pedidos feitos no aplicativo
                      diretamente no sistema Pubfy, sem precisar de equipamentos adicionais.
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                      <div className="border rounded-lg p-4">
                        <h4 className="font-medium mb-2">1. Configure suas credenciais</h4>
                        <p className="text-sm text-muted-foreground">
                          Adicione suas credenciais do iFood na aba "Credenciais"
                        </p>
                      </div>
                      
                      <div className="border rounded-lg p-4">
                        <h4 className="font-medium mb-2">2. Teste a conexão</h4>
                        <p className="text-sm text-muted-foreground">
                          Verifique se suas credenciais estão funcionando corretamente
                        </p>
                      </div>
                      
                      <div className="border rounded-lg p-4">
                        <h4 className="font-medium mb-2">3. Ative a integração</h4>
                        <p className="text-sm text-muted-foreground">
                          Ative a integração para começar a receber pedidos automaticamente
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h3 className="text-lg font-medium mb-4">Status da configuração</h3>
                    <div className="space-y-2">
                      <div className="flex items-center">
                        {credentialsConfigured ? (
                          <CheckCircle className="h-5 w-5 text-emerald-700 mr-2" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-amber-700 mr-2" />
                        )}
                        <span>
                          Credenciais: {credentialsConfigured ? "Configuradas" : "Não configuradas"}
                        </span>
                      </div>
                      
                      <div className="flex items-center">
                        {config.isEnabled ? (
                          <CheckCircle className="h-5 w-5 text-emerald-700 mr-2" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-amber-700 mr-2" />
                        )}
                        <span>
                          Status da integração: {config.isEnabled ? "Ativada" : "Desativada"}
                        </span>
                      </div>
                      
                      <div className="flex items-center">
                        {config.pollingEnabled ? (
                          <CheckCircle className="h-5 w-5 text-emerald-700 mr-2" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-amber-700 mr-2" />
                        )}
                        <span>
                          Sincronização automática: {config.pollingEnabled ? "Ativada" : "Desativada"}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="credenciais">
              <Card>
                <CardHeader>
                  <CardTitle>Credenciais do iFood</CardTitle>
                  <CardDescription>
                    Configure suas credenciais para conexão com a API do iFood
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="client-id">Client ID *</Label>
                      <Input 
                        id="client-id" 
                        placeholder="Seu Client ID do iFood"
                        value={credentials.clientId}
                        onChange={(e) => setCredentials({...credentials, clientId: e.target.value})}
                      />
                      <p className="text-sm text-muted-foreground">
                        Client ID fornecido pelo iFood para autenticação
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="client-secret">Client Secret *</Label>
                      <Input 
                        id="client-secret" 
                        type="password"
                        placeholder={hasStoredCredentials ? "Secret já salvo. Preencha apenas para trocar." : "Seu Client Secret do iFood"}
                        value={credentials.clientSecret}
                        onChange={(e) => setCredentials({...credentials, clientSecret: e.target.value})}
                      />
                      <p className="text-sm text-muted-foreground">
                        {hasStoredCredentials
                          ? "Por segurança, o secret salvo não é exibido."
                          : "Chave secreta fornecida pelo iFood"}
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="merchant-id">Merchant ID *</Label>
                      <Input 
                        id="merchant-id" 
                        placeholder="Seu ID de comerciante no iFood"
                        value={credentials.merchantId}
                        onChange={(e) => setCredentials({...credentials, merchantId: e.target.value})}
                      />
                      <p className="text-sm text-muted-foreground">
                        Identificador único do seu estabelecimento no iFood
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="restaurant-id">ID do Restaurante (opcional)</Label>
                      <Input 
                        id="restaurant-id" 
                        placeholder="ID do restaurante específico (se aplicável)"
                        value={credentials.restaurantId ?? ""}
                        onChange={(e) => setCredentials({...credentials, restaurantId: e.target.value})}
                      />
                      <p className="text-sm text-muted-foreground">
                        Se você tem múltiplos restaurantes no mesmo Merchant ID
                      </p>
                    </div>
                    
                    <div className="pt-4 space-x-2">
                      <Button 
                        onClick={handleSaveCredentials}
                        disabled={isConfiguring}
                      >
                        {isConfiguring ? "Salvando..." : "Salvar Credenciais"}
                      </Button>
                      
                      <Button 
                        variant="outline" 
                        onClick={handleTestConnection}
                        disabled={!credentialsConfigured || isLoading}
                      >
                        {isLoading ? "Testando..." : "Testar conexão"}
                      </Button>
                    </div>
                    
                    {testResult && (
                      <div className={`p-4 mt-4 rounded-md ${
                        testResult.success ? 'border border-emerald-200 bg-emerald-50' : 'border border-rose-200 bg-rose-50'
                      }`}>
                        <div className="flex items-center">
                          {testResult.success ? (
                            <CheckCircle className="h-5 w-5 text-emerald-700 mr-2" />
                          ) : (
                            <AlertCircle className="h-5 w-5 text-rose-700 mr-2" />
                          )}
                          <span className={testResult.success ? 'text-emerald-800' : 'text-rose-800'}>
                            {testResult.message}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="sincronizacao">
              <Card>
                <CardHeader>
                  <CardTitle>Configurações de Sincronização</CardTitle>
                  <CardDescription>
                    Defina como os pedidos do iFood serão sincronizados com o sistema
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <h3 className="font-medium">Sincronização automática</h3>
                        <p className="text-sm text-muted-foreground">
                          Buscar novos pedidos automaticamente em intervalos regulares
                        </p>
                      </div>
                      <Switch
                        checked={config.pollingEnabled}
                        onCheckedChange={(checked) => updatePollingSettings(checked)}
                        disabled={!credentialsConfigured || !config.isEnabled || isLoading}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="polling-interval">Intervalo de verificação</Label>
                        <span className="text-sm text-muted-foreground">
                          {config.pollingInterval} segundos
                        </span>
                      </div>
                      <Slider
                        id="polling-interval"
                        min={30}
                        max={300}
                        step={30}
                        value={[config.pollingInterval]}
                        onValueChange={(values) => updatePollingSettings(config.pollingEnabled, values[0])}
                        disabled={!config.pollingEnabled || isLoading}
                      />
                      <p className="text-xs text-muted-foreground">
                        Tempo entre cada verificação de novos pedidos (30 a 300 segundos)
                      </p>
                    </div>
                  </div>
                  
                  <Separator />

                  <div className="space-y-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="space-y-0.5">
                        <h3 className="font-medium">Consulta manual</h3>
                        <p className="text-sm text-muted-foreground">
                          Valide o token, consulte eventos pendentes e importe pedidos disponíveis sem depender do agendamento.
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        onClick={handlePollNow}
                        disabled={!credentialsConfigured || !config.isEnabled || isPollingNow}
                        className="w-full sm:w-auto"
                      >
                        {isPollingNow ? (
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Wifi className="mr-2 h-4 w-4" />
                        )}
                        Consultar agora
                      </Button>
                    </div>
                    {lastPollResult && (
                      <div className="rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
                        {lastPollResult}
                      </div>
                    )}
                  </div>

                  <Separator />
                  
                  <div className="space-y-4">
                    <h3 className="font-medium">Notificações de pedidos</h3>
                    
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Switch id="notify-new-orders" checked disabled />
                        <Label htmlFor="notify-new-orders">Notificar novos pedidos</Label>
                      </div>
                      <p className="text-xs text-muted-foreground pl-7">
                        Receba uma notificação no sistema quando novos pedidos forem recebidos do iFood
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Switch id="notify-status-changes" checked disabled />
                        <Label htmlFor="notify-status-changes">Notificar alterações de status</Label>
                      </div>
                      <p className="text-xs text-muted-foreground pl-7">
                        Receba notificações quando o status de um pedido for alterado no iFood
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default IfoodIntegracao;
