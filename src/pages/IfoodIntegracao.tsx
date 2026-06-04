import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from "react";
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
import { AlertCircle, CheckCircle, RefreshCw, ShieldCheck, Store, Wifi } from "lucide-react";
import {
  IfoodCredentials,
  IfoodItemMapping,
  getIfoodIntegrationConfig,
  getIfoodItemMappings,
  pollIfoodEvents,
  saveIfoodIntegrationConfig,
  saveIfoodItemMapping,
  setIfoodIntegrationStatus,
  testIfoodConnection,
  updateIfoodPollingSettings,
} from "@/services/ifoodService";
import { getCurrentRestaurantId } from "@/lib/supabase";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";

interface IfoodIntegrationConfig {
  isEnabled: boolean;
  pollingEnabled: boolean;
  pollingInterval: number;
  hasSaasAppCredentials: boolean;
  notifyNewOrders: boolean;
  notifyStatusChanges: boolean;
}

interface IfoodProductOption {
  id: string;
  name: string;
  price: number;
  available: boolean;
}

function useRestaurantId(
  user: unknown,
  setRestaurantId: (id: string) => void,
  setIsLoading: (loading: boolean) => void
) {
  useEffect(() => {
    const loadRestaurantId = async () => {
      if (!user) return;

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
    };

    void loadRestaurantId();
  }, [user, setRestaurantId, setIsLoading]);
}

const applyConfig = (
  setConfig: Dispatch<SetStateAction<IfoodIntegrationConfig>>,
  data: Partial<IfoodIntegrationConfig>,
) => {
  setConfig((current) => ({
    ...current,
    isEnabled: data.isEnabled ?? current.isEnabled,
    pollingEnabled: data.pollingEnabled ?? current.pollingEnabled,
    pollingInterval: data.pollingInterval ?? current.pollingInterval,
    hasSaasAppCredentials: data.hasSaasAppCredentials ?? current.hasSaasAppCredentials,
    notifyNewOrders: data.notifyNewOrders ?? current.notifyNewOrders,
    notifyStatusChanges: data.notifyStatusChanges ?? current.notifyStatusChanges,
  }));
};

async function saveStoreConnectionHelper(
  restaurantId: string,
  credentials: IfoodCredentials,
  config: IfoodIntegrationConfig,
  setConfig: Dispatch<SetStateAction<IfoodIntegrationConfig>>,
  setSavedMerchantId: (value: string) => void,
  setIsConfiguring: (value: boolean) => void,
) {
  setIsConfiguring(true);
  try {
    if (!credentials.merchantId.trim()) {
      toast.error("Informe o Merchant ID da loja iFood.");
      return;
    }

    const result = await saveIfoodIntegrationConfig({
      restaurantId,
      merchantId: credentials.merchantId.trim(),
      restaurantIfoodId: credentials.restaurantId?.trim() || undefined,
      isEnabled: config.isEnabled,
      pollingEnabled: config.pollingEnabled,
      pollingInterval: config.pollingInterval,
      notifyNewOrders: config.notifyNewOrders,
      notifyStatusChanges: config.notifyStatusChanges,
    });

    applyConfig(setConfig, result.config);
    setSavedMerchantId(result.config.merchantId);
    toast.success("Loja iFood salva com sucesso");
  } catch (error) {
    console.error("Erro ao salvar loja iFood:", error);
    toast.error(error instanceof Error ? error.message : "Erro ao salvar loja iFood");
  } finally {
    setIsConfiguring(false);
  }
}

async function testConnectionHelper(
  restaurantId: string,
  setIsTesting: (value: boolean) => void,
  setTestResult: (result: { success: boolean; message: string } | null) => void,
) {
  setIsTesting(true);
  setTestResult(null);
  try {
    const result = await testIfoodConnection(restaurantId);
    setTestResult({
      success: result.success,
      message: result.message || "Conexão estabelecida com sucesso!",
    });
    toast.success("Conexão com iFood validada");
  } catch (error) {
    console.error("Erro na conexão com iFood:", error);
    const message = error instanceof Error ? error.message : "Falha na conexão. Verifique a loja iFood e o app SaaS.";
    setTestResult({ success: false, message });
    toast.error(message);
  } finally {
    setIsTesting(false);
  }
}

async function pollNowHelper(
  restaurantId: string,
  setIsPollingNow: (value: boolean) => void,
  setLastPollResult: (result: string | null) => void,
  reloadMappings?: () => Promise<void>,
) {
  setIsPollingNow(true);
  try {
    const result = await pollIfoodEvents(restaurantId);
    const message = `${result.eventsReceived} evento(s), ${result.eventsStored} armazenado(s), ${result.eventsAcknowledged} confirmado(s), ${result.ordersImported} pedido(s) importado(s).`;
    setLastPollResult(message);
    await reloadMappings?.();
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

async function toggleIntegrationHelper(
  enabled: boolean,
  restaurantId: string,
  setConfig: Dispatch<SetStateAction<IfoodIntegrationConfig>>,
) {
  try {
    const result = await setIfoodIntegrationStatus(restaurantId, enabled);
    applyConfig(setConfig, result.config);
    toast.success(`Integração ${enabled ? "ativada" : "desativada"} com sucesso`);
  } catch (error) {
    console.error("Erro ao alterar status da integração:", error);
    toast.error(error instanceof Error ? error.message : "Erro ao alterar status da integração");
  }
}

async function updatePollingSettingsHelper(
  pollingEnabled: boolean,
  interval: number | undefined,
  restaurantId: string,
  setConfig: Dispatch<SetStateAction<IfoodIntegrationConfig>>,
) {
  try {
    const result = await updateIfoodPollingSettings(restaurantId, pollingEnabled, interval);
    applyConfig(setConfig, result.config);
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
  const [isTesting, setIsTesting] = useState(false);
  const [isPollingNow, setIsPollingNow] = useState(false);
  const [isMappingsLoading, setIsMappingsLoading] = useState(false);
  const [isSavingMappingId, setIsSavingMappingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [lastPollResult, setLastPollResult] = useState<string | null>(null);
  const [restaurantId, setRestaurantId] = useState<string>("");
  const [savedMerchantId, setSavedMerchantId] = useState("");
  const [itemMappings, setItemMappings] = useState<IfoodItemMapping[]>([]);
  const [productOptions, setProductOptions] = useState<IfoodProductOption[]>([]);

  const [credentials, setCredentials] = useState<IfoodCredentials>({
    merchantId: "",
    restaurantId: "",
  });
  const [config, setConfig] = useState<IfoodIntegrationConfig>({
    isEnabled: false,
    pollingEnabled: true,
    pollingInterval: 60,
    hasSaasAppCredentials: false,
    notifyNewOrders: true,
    notifyStatusChanges: true,
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
          merchantId: data.merchantId,
          restaurantId: data.restaurantIfoodId ?? "",
        });
        setSavedMerchantId(data.merchantId);
        applyConfig(setConfig, data);
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
      void loadExistingConfig();
    }
  }, [restaurantId, loadExistingConfig]);

  const loadMappingData = useCallback(async () => {
    if (!restaurantId) return;

    setIsMappingsLoading(true);
    try {
      const [mappingsResult, productsResult] = await Promise.all([
        getIfoodItemMappings(restaurantId),
        supabase
          .from("products")
          .select("id, name, price, available")
          .eq("restaurant_id", restaurantId)
          .order("name", { ascending: true }),
      ]);

      if (productsResult.error) throw productsResult.error;

      setItemMappings(mappingsResult.mappings);
      setProductOptions((productsResult.data ?? []).map((product) => ({
        id: String(product.id),
        name: String(product.name),
        price: Number(product.price || 0),
        available: Boolean(product.available),
      })));
    } catch (error) {
      console.error("Erro ao carregar mapeamentos iFood:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao carregar mapeamentos iFood");
    } finally {
      setIsMappingsLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    if (activeTab === "mapeamento") {
      void loadMappingData();
    }
  }, [activeTab, loadMappingData]);

  const storeConfigured = Boolean(savedMerchantId.trim());
  const canUseIntegration = storeConfigured && config.hasSaasAppCredentials;
  const unmappedItemsCount = itemMappings.filter((mapping) => !mapping.productId).length;
  const mappedItemsCount = itemMappings.length - unmappedItemsCount;

  const handleSaveStoreConnection = async () => {
    if (!restaurantId) {
      toast.error("ID do restaurante não encontrado");
      return;
    }
    await saveStoreConnectionHelper(
      restaurantId,
      credentials,
      config,
      setConfig,
      setSavedMerchantId,
      setIsConfiguring,
    );
  };

  const handleTestConnection = async () => {
    await testConnectionHelper(restaurantId, setIsTesting, setTestResult);
  };

  const handlePollNow = async () => {
    await pollNowHelper(restaurantId, setIsPollingNow, setLastPollResult, loadMappingData);
  };

  const handleSaveItemMapping = async (mappingId: string, productId: string | null) => {
    setIsSavingMappingId(mappingId);
    try {
      const result = await saveIfoodItemMapping(restaurantId, mappingId, productId);
      setItemMappings(result.mappings);
      toast.success(productId ? "Item iFood vinculado ao produto" : "Vinculo removido");
    } catch (error) {
      console.error("Erro ao salvar mapeamento iFood:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao salvar mapeamento");
    } finally {
      setIsSavingMappingId(null);
    }
  };

  const toggleIntegration = async (enabled: boolean) => {
    if (!restaurantId) {
      toast.error("ID do restaurante não encontrado");
      return;
    }
    await toggleIntegrationHelper(enabled, restaurantId, setConfig);
  };

  const updatePollingSettings = async (pollingEnabled: boolean, interval?: number) => {
    if (!restaurantId) {
      toast.error("ID do restaurante não encontrado");
      return;
    }
    await updatePollingSettingsHelper(pollingEnabled, interval, restaurantId, setConfig);
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Integração com iFood">
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-muted-foreground">Carregando configurações...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!restaurantId) {
    return (
      <DashboardLayout title="Integração com iFood">
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-destructive">Erro: Restaurante não encontrado</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Integração com iFood">
      <div className="space-y-6">
        <Alert className="border-emerald-200 bg-emerald-50 text-emerald-950">
          <ShieldCheck className="h-4 w-4 text-emerald-700" />
          <AlertTitle>Modelo centralizado SaaS</AlertTitle>
          <AlertDescription>
            O aplicativo iFood do Pubfy é configurado pelo Super Admin. Nesta tela o restaurante informa apenas a loja autorizada no iFood.
          </AlertDescription>
        </Alert>

        {!config.hasSaasAppCredentials && (
          <Alert className="border-amber-200 bg-amber-50 text-amber-950">
            <AlertCircle className="h-4 w-4 text-amber-700" />
            <AlertTitle>Aplicativo iFood pendente no Super Admin</AlertTitle>
            <AlertDescription>
              Cadastre o Client ID e Client Secret do app SaaS antes de testar ou ativar lojas de restaurantes.
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle className="flex items-center text-xl">
                  Status da Integração
                  <Badge
                    variant="outline"
                    className={`ml-2 ${
                      config.isEnabled
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-slate-200 bg-slate-50 text-slate-700"
                    }`}
                  >
                    {config.isEnabled ? "Ativada" : "Desativada"}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  {config.isEnabled
                    ? "Pedidos do iFood podem ser sincronizados com o Pubfy"
                    : "Conecte a loja e ative a integração para receber pedidos do iFood"}
                </CardDescription>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="integration-status"
                  checked={config.isEnabled}
                  onCheckedChange={toggleIntegration}
                  disabled={!canUseIntegration || isTesting}
                />
                <Label htmlFor="integration-status">
                  {config.isEnabled ? "Ativada" : "Desativada"}
                </Label>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid h-auto w-full grid-cols-2 md:inline-flex md:w-auto">
            <TabsTrigger value="geral">Geral</TabsTrigger>
            <TabsTrigger value="loja">Loja iFood</TabsTrigger>
            <TabsTrigger value="mapeamento">Mapeamento</TabsTrigger>
            <TabsTrigger value="sincronizacao">Sincronização</TabsTrigger>
          </TabsList>

          <div className="mt-6">
            <TabsContent value="geral">
              <Card>
                <CardHeader>
                  <CardTitle>Integração com iFood</CardTitle>
                  <CardDescription>
                    Receba pedidos do iFood diretamente no Pubfy usando o app SaaS centralizado.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="rounded-lg border p-4">
                      <h4 className="mb-2 font-medium">1. App Pubfy iFood</h4>
                      <p className="text-sm text-muted-foreground">
                        Credenciais globais ficam protegidas no Super Admin.
                      </p>
                    </div>

                    <div className="rounded-lg border p-4">
                      <h4 className="mb-2 font-medium">2. Loja do restaurante</h4>
                      <p className="text-sm text-muted-foreground">
                        Informe o Merchant ID da loja autorizada no iFood.
                      </p>
                    </div>

                    <div className="rounded-lg border p-4">
                      <h4 className="mb-2 font-medium">3. Sincronização</h4>
                      <p className="text-sm text-muted-foreground">
                        Teste a conexão, ative a integração e acompanhe os pedidos.
                      </p>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="mb-4 text-lg font-medium">Status da configuração</h3>
                    <div className="space-y-3">
                      <div className="flex items-center">
                        {config.hasSaasAppCredentials ? (
                          <CheckCircle className="mr-2 h-5 w-5 text-emerald-700" />
                        ) : (
                          <AlertCircle className="mr-2 h-5 w-5 text-amber-700" />
                        )}
                        <span>
                          App SaaS do Pubfy: {config.hasSaasAppCredentials ? "Configurado" : "Pendente no Super Admin"}
                        </span>
                      </div>

                      <div className="flex items-center">
                        {storeConfigured ? (
                          <CheckCircle className="mr-2 h-5 w-5 text-emerald-700" />
                        ) : (
                          <AlertCircle className="mr-2 h-5 w-5 text-amber-700" />
                        )}
                        <span>
                          Loja iFood: {storeConfigured ? "Conectada" : "Merchant ID pendente"}
                        </span>
                      </div>

                      <div className="flex items-center">
                        {config.pollingEnabled ? (
                          <CheckCircle className="mr-2 h-5 w-5 text-emerald-700" />
                        ) : (
                          <AlertCircle className="mr-2 h-5 w-5 text-amber-700" />
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

            <TabsContent value="loja">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Store className="h-5 w-5" />
                    Loja iFood
                  </CardTitle>
                  <CardDescription>
                    Configure a loja do restaurante. As credenciais do aplicativo Pubfy iFood ficam no Super Admin.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="merchant-id">Merchant ID *</Label>
                      <Input
                        id="merchant-id"
                        placeholder="ID de comerciante/loja no iFood"
                        value={credentials.merchantId}
                        onChange={(event) => setCredentials({ ...credentials, merchantId: event.target.value })}
                      />
                      <p className="text-sm text-muted-foreground">
                        Identificador da loja que autorizou o app Pubfy iFood.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="restaurant-id">ID do Restaurante iFood (opcional)</Label>
                      <Input
                        id="restaurant-id"
                        placeholder="Use apenas se o iFood fornecer um ID separado"
                        value={credentials.restaurantId ?? ""}
                        onChange={(event) => setCredentials({ ...credentials, restaurantId: event.target.value })}
                      />
                      <p className="text-sm text-muted-foreground">
                        Campo auxiliar para cenários com múltiplas lojas ou identificação adicional.
                      </p>
                    </div>

                    <div className="flex flex-col gap-2 pt-4 sm:flex-row">
                      <Button onClick={handleSaveStoreConnection} disabled={isConfiguring}>
                        {isConfiguring ? "Salvando..." : "Salvar loja iFood"}
                      </Button>

                      <Button
                        variant="outline"
                        onClick={handleTestConnection}
                        disabled={!canUseIntegration || isTesting}
                      >
                        {isTesting ? "Testando..." : "Testar conexão"}
                      </Button>
                    </div>

                    {testResult && (
                      <div className={`mt-4 rounded-md p-4 ${
                        testResult.success ? "border border-emerald-200 bg-emerald-50" : "border border-rose-200 bg-rose-50"
                      }`}>
                        <div className="flex items-center">
                          {testResult.success ? (
                            <CheckCircle className="mr-2 h-5 w-5 text-emerald-700" />
                          ) : (
                            <AlertCircle className="mr-2 h-5 w-5 text-rose-700" />
                          )}
                          <span className={testResult.success ? "text-emerald-800" : "text-rose-800"}>
                            {testResult.message}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="mapeamento">
              <Card>
                <CardHeader>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <CardTitle>Mapeamento de itens iFood</CardTitle>
                      <CardDescription>
                        Vincule itens recebidos do marketplace aos produtos internos para preparar baixa de estoque e relatórios por produto.
                      </CardDescription>
                    </div>
                    <Button variant="outline" onClick={loadMappingData} disabled={isMappingsLoading}>
                      {isMappingsLoading ? (
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="mr-2 h-4 w-4" />
                      )}
                      Atualizar
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="rounded-md border p-4">
                      <p className="text-sm text-muted-foreground">Itens observados</p>
                      <p className="text-2xl font-semibold">{itemMappings.length}</p>
                    </div>
                    <div className="rounded-md border p-4">
                      <p className="text-sm text-muted-foreground">Mapeados</p>
                      <p className="text-2xl font-semibold text-emerald-700">{mappedItemsCount}</p>
                    </div>
                    <div className="rounded-md border p-4">
                      <p className="text-sm text-muted-foreground">Pendentes</p>
                      <p className="text-2xl font-semibold text-amber-700">{unmappedItemsCount}</p>
                    </div>
                  </div>

                  {isMappingsLoading ? (
                    <div className="rounded-md border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
                      Carregando mapeamentos...
                    </div>
                  ) : itemMappings.length === 0 ? (
                    <div className="rounded-md border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
                      Nenhum item iFood observado ainda. Use a consulta manual ou aguarde a importação de pedidos para popular esta lista.
                    </div>
                  ) : (
                    <div className="overflow-hidden rounded-md border">
                      <div className="grid grid-cols-[1.5fr_0.8fr_1.4fr] gap-3 border-b bg-muted/40 px-4 py-3 text-sm font-medium text-muted-foreground">
                        <span>Item iFood</span>
                        <span>Ocorrências</span>
                        <span>Produto interno</span>
                      </div>
                      <div className="divide-y">
                        {itemMappings.map((mapping) => (
                          <div
                            key={mapping.id}
                            className="grid grid-cols-1 gap-3 px-4 py-4 md:grid-cols-[1.5fr_0.8fr_1.4fr] md:items-center"
                          >
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="truncate font-medium">{mapping.externalItemName}</p>
                                <Badge
                                  variant="outline"
                                  className={
                                    mapping.productId
                                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                      : "border-amber-200 bg-amber-50 text-amber-700"
                                  }
                                >
                                  {mapping.productId ? "Mapeado" : "Pendente"}
                                </Badge>
                              </div>
                              <p className="mt-1 truncate text-xs text-muted-foreground">
                                ID externo: {mapping.externalItemId}
                              </p>
                            </div>

                            <div className="text-sm text-muted-foreground">
                              <p>{mapping.timesSeen} vez(s)</p>
                              {mapping.lastSeenAt && (
                                <p className="text-xs">
                                  Ultima vez: {new Date(mapping.lastSeenAt).toLocaleString("pt-BR")}
                                </p>
                              )}
                            </div>

                            <div className="flex gap-2">
                              <select
                                className="h-10 min-w-0 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                value={mapping.productId ?? ""}
                                disabled={isSavingMappingId === mapping.id}
                                onChange={(event) => {
                                  void handleSaveItemMapping(mapping.id, event.target.value || null);
                                }}
                              >
                                <option value="">Sem vinculo</option>
                                {productOptions.map((product) => (
                                  <option key={product.id} value={product.id}>
                                    {product.name}{product.available ? "" : " (indisponivel)"}
                                  </option>
                                ))}
                              </select>
                              {isSavingMappingId === mapping.id && (
                                <RefreshCw className="mt-2 h-4 w-4 animate-spin text-muted-foreground" />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="sincronizacao">
              <Card>
                <CardHeader>
                  <CardTitle>Configurações de Sincronização</CardTitle>
                  <CardDescription>
                    Defina como os pedidos do iFood serão sincronizados com o sistema.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="space-y-0.5">
                        <h3 className="font-medium">Sincronização automática</h3>
                        <p className="text-sm text-muted-foreground">
                          Buscar novos pedidos automaticamente em intervalos regulares.
                        </p>
                      </div>
                      <Switch
                        checked={config.pollingEnabled}
                        onCheckedChange={(checked) => updatePollingSettings(checked)}
                        disabled={!canUseIntegration || !config.isEnabled}
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
                        disabled={!config.pollingEnabled || !canUseIntegration || !config.isEnabled}
                      />
                      <p className="text-xs text-muted-foreground">
                        Tempo entre cada verificação de novos pedidos (30 a 300 segundos).
                      </p>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="space-y-0.5">
                        <h3 className="font-medium">Consulta manual</h3>
                        <p className="text-sm text-muted-foreground">
                          Consulte eventos pendentes e importe pedidos disponíveis sem depender do agendamento.
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        onClick={handlePollNow}
                        disabled={!canUseIntegration || !config.isEnabled || isPollingNow}
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
                        <Switch id="notify-new-orders" checked={config.notifyNewOrders} disabled />
                        <Label htmlFor="notify-new-orders">Notificar novos pedidos</Label>
                      </div>
                      <p className="pl-7 text-xs text-muted-foreground">
                        Receba uma notificação no sistema quando novos pedidos forem recebidos do iFood.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Switch id="notify-status-changes" checked={config.notifyStatusChanges} disabled />
                        <Label htmlFor="notify-status-changes">Notificar alterações de status</Label>
                      </div>
                      <p className="pl-7 text-xs text-muted-foreground">
                        Receba notificações quando o status de um pedido for alterado no iFood.
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
