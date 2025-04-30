
import { useState, useEffect } from "react";
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
import { toast } from "@/components/ui/sonner";
import { AlertCircle, CheckCircle } from "lucide-react";
import { IfoodCredentials, hasIfoodCredentials, loadIfoodConfig, configureIfoodCredentials, testIfoodConnection, setIfoodIntegrationEnabled, configureIfoodPolling } from "@/services/ifoodService";
import { supabase } from "@/lib/supabase";
import { getCurrentRestaurantId } from "@/lib/supabase";

const IfoodIntegracao = () => {
  const [activeTab, setActiveTab] = useState("geral");
  const [isLoading, setIsLoading] = useState(false);
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  
  const [credentials, setCredentials] = useState<IfoodCredentials>({
    clientId: "",
    clientSecret: "",
    merchantId: "",
    restaurantId: ""
  });
  
  const [config, setConfig] = useState({
    isEnabled: false,
    pollingEnabled: true,
    pollingInterval: 60
  });

  useEffect(() => {
    const loadExistingConfig = async () => {
      setIsLoading(true);
      try {
        // Obter ID do restaurante atual
        const restaurantId = await getCurrentRestaurantId();
        if (!restaurantId) {
          toast.error("Erro ao carregar configuração: Restaurante não encontrado");
          setIsLoading(false);
          return;
        }
        
        // Buscar configuração do iFood do Supabase
        const { data, error } = await supabase
          .from('ifood_integration')
          .select('*')
          .eq('restaurant_id', restaurantId)
          .single();
          
        if (error && error.code !== 'PGRST116') { // PGRST116 é "não encontrado"
          console.error("Erro ao carregar configuração do iFood:", error);
        }
        
        if (data) {
          // Carregar dados do banco
          setCredentials({
            clientId: data.client_id,
            clientSecret: data.client_secret,
            merchantId: data.merchant_id,
            restaurantId: data.restaurant_ifood_id || ""
          });
          
          setConfig({
            isEnabled: data.is_enabled,
            pollingEnabled: data.polling_enabled,
            pollingInterval: data.polling_interval
          });
        } else {
          // Carregar dados do localStorage como fallback
          const localConfig = loadIfoodConfig();
          if (localConfig.credentials) {
            setCredentials({
              clientId: localConfig.credentials.clientId || "",
              clientSecret: localConfig.credentials.clientSecret || "",
              merchantId: localConfig.credentials.merchantId || "",
              restaurantId: localConfig.credentials.restaurantId || ""
            });
            
            setConfig({
              isEnabled: localConfig.isEnabled,
              pollingEnabled: localConfig.pollingEnabled,
              pollingInterval: localConfig.pollingInterval
            });
          }
        }
      } catch (error) {
        console.error("Erro ao carregar configurações:", error);
        toast.error("Erro ao carregar configurações");
      } finally {
        setIsLoading(false);
      }
    };
    
    loadExistingConfig();
  }, []);

  const handleSaveCredentials = async () => {
    setIsConfiguring(true);
    
    try {
      // Validar se todos os campos obrigatórios estão preenchidos
      if (!credentials.clientId || !credentials.clientSecret || !credentials.merchantId) {
        toast.error("Por favor, preencha todos os campos obrigatórios");
        return;
      }
      
      // Salvar no Supabase
      const restaurantId = await getCurrentRestaurantId();
      if (!restaurantId) {
        toast.error("Restaurante não encontrado");
        return;
      }
      
      // Verificar se já existe configuração
      const { data: existingConfig } = await supabase
        .from('ifood_integration')
        .select('restaurant_id')
        .eq('restaurant_id', restaurantId)
        .single();
        
      // Salvar ou atualizar no Supabase
      const supabaseOperation = existingConfig 
        ? supabase
            .from('ifood_integration')
            .update({
              client_id: credentials.clientId,
              client_secret: credentials.clientSecret,
              merchant_id: credentials.merchantId,
              restaurant_ifood_id: credentials.restaurantId || null,
              updated_at: new Date().toISOString()
            })
            .eq('restaurant_id', restaurantId)
        : supabase
            .from('ifood_integration')
            .insert({
              restaurant_id: restaurantId,
              client_id: credentials.clientId,
              client_secret: credentials.clientSecret,
              merchant_id: credentials.merchantId,
              restaurant_ifood_id: credentials.restaurantId || null,
              is_enabled: config.isEnabled,
              polling_enabled: config.pollingEnabled,
              polling_interval: config.pollingInterval
            });
            
      const { error } = await supabaseOperation;
      
      if (error) {
        throw error;
      }
      
      // Salvar também no localStorage como backup
      configureIfoodCredentials({
        clientId: credentials.clientId,
        clientSecret: credentials.clientSecret,
        merchantId: credentials.merchantId,
        restaurantId: credentials.restaurantId
      });
      
      toast.success("Credenciais salvas com sucesso");
    } catch (error) {
      console.error("Erro ao salvar credenciais:", error);
      toast.error("Erro ao salvar credenciais");
    } finally {
      setIsConfiguring(false);
    }
  };

  const handleTestConnection = async () => {
    setIsLoading(true);
    setTestResult(null);
    
    try {
      const result = await testIfoodConnection();
      setTestResult({
        success: true,
        message: "Conexão estabelecida com sucesso!"
      });
    } catch (error) {
      console.error("Erro na conexão com iFood:", error);
      setTestResult({
        success: false,
        message: "Falha na conexão. Verifique suas credenciais."
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleIntegration = async (enabled: boolean) => {
    try {
      const restaurantId = await getCurrentRestaurantId();
      if (!restaurantId) {
        toast.error("Restaurante não encontrado");
        return;
      }
      
      // Atualizar no Supabase
      const { error } = await supabase
        .from('ifood_integration')
        .update({
          is_enabled: enabled,
          updated_at: new Date().toISOString()
        })
        .eq('restaurant_id', restaurantId);
        
      if (error) {
        throw error;
      }
      
      // Atualizar no localStorage como backup
      setIfoodIntegrationEnabled(enabled);
      
      setConfig(prev => ({ ...prev, isEnabled: enabled }));
      
      toast.success(`Integração ${enabled ? 'ativada' : 'desativada'} com sucesso`);
    } catch (error) {
      console.error("Erro ao alterar status da integração:", error);
      toast.error("Erro ao alterar status da integração");
    }
  };

  const updatePollingSettings = async (pollingEnabled: boolean, interval?: number) => {
    try {
      const restaurantId = await getCurrentRestaurantId();
      if (!restaurantId) {
        toast.error("Restaurante não encontrado");
        return;
      }
      
      const updateData: Record<string, any> = {
        polling_enabled: pollingEnabled,
        updated_at: new Date().toISOString()
      };
      
      if (interval !== undefined) {
        updateData.polling_interval = interval;
      }
      
      // Atualizar no Supabase
      const { error } = await supabase
        .from('ifood_integration')
        .update(updateData)
        .eq('restaurant_id', restaurantId);
        
      if (error) {
        throw error;
      }
      
      // Atualizar no localStorage como backup
      configureIfoodPolling(
        pollingEnabled,
        interval !== undefined ? interval : config.pollingInterval
      );
      
      setConfig(prev => ({
        ...prev,
        pollingEnabled,
        pollingInterval: interval !== undefined ? interval : prev.pollingInterval
      }));
      
      toast.success("Configurações de sincronização atualizadas");
    } catch (error) {
      console.error("Erro ao atualizar configurações de sincronização:", error);
      toast.error("Erro ao atualizar configurações");
    }
  };

  return (
    <DashboardLayout title="Integração com iFood">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle className="text-xl flex items-center">
                  Status da Integração
                  <Badge 
                    className={`ml-2 ${config.isEnabled ? 'bg-green/80' : 'bg-gray-400'}`}
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
                  disabled={!hasIfoodCredentials() || isLoading}
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
                      diretamente no sistema CardápioPronto, sem precisar de equipamentos adicionais.
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
                        {hasIfoodCredentials() ? (
                          <CheckCircle className="h-5 w-5 text-green mr-2" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-orange mr-2" />
                        )}
                        <span>
                          Credenciais: {hasIfoodCredentials() ? "Configuradas" : "Não configuradas"}
                        </span>
                      </div>
                      
                      <div className="flex items-center">
                        {config.isEnabled ? (
                          <CheckCircle className="h-5 w-5 text-green mr-2" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-orange mr-2" />
                        )}
                        <span>
                          Status da integração: {config.isEnabled ? "Ativada" : "Desativada"}
                        </span>
                      </div>
                      
                      <div className="flex items-center">
                        {config.pollingEnabled ? (
                          <CheckCircle className="h-5 w-5 text-green mr-2" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-orange mr-2" />
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
                        placeholder="Seu Client Secret do iFood"
                        value={credentials.clientSecret}
                        onChange={(e) => setCredentials({...credentials, clientSecret: e.target.value})}
                      />
                      <p className="text-sm text-muted-foreground">
                        Chave secreta fornecida pelo iFood
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
                        value={credentials.restaurantId || ""}
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
                        disabled={!hasIfoodCredentials() || isLoading}
                      >
                        {isLoading ? "Testando..." : "Testar Conexão"}
                      </Button>
                    </div>
                    
                    {testResult && (
                      <div className={`p-4 mt-4 rounded-md ${
                        testResult.success ? 'bg-green/10 border border-green/20' : 'bg-red-500/10 border border-red-500/20'
                      }`}>
                        <div className="flex items-center">
                          {testResult.success ? (
                            <CheckCircle className="h-5 w-5 text-green mr-2" />
                          ) : (
                            <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                          )}
                          <span className={testResult.success ? 'text-green' : 'text-red-500'}>
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
                        disabled={!hasIfoodCredentials() || !config.isEnabled || isLoading}
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
