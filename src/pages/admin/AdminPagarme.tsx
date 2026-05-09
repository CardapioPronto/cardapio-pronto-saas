import { useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/admin/AdminLayout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  OnlinePaymentMethod,
  RestaurantPaymentSettings,
  restaurantPaymentService,
} from "@/services/restaurantPaymentService";
import { CheckCircle, Copy, CreditCard, Loader2, Search, ShieldCheck } from "lucide-react";

const WEBHOOK_URL =
  "https://jyrfjvyeikhqpuwcvdff.supabase.co/functions/v1/pagarme-webhook";

type RestaurantRow = {
  id: string;
  name: string;
  owner_id: string | null;
};

const emptySettings = (restaurantId: string): RestaurantPaymentSettings => ({
  restaurant_id: restaurantId,
  provider: "pagarme",
  marketplace_mode: "split",
  is_enabled: false,
  onboarding_status: "not_started",
  recipient_id: null,
  enabled_methods: ["pix"],
  allow_delivery: true,
  allow_pickup: true,
  allow_table: false,
  allow_counter: false,
  commission_type: "none",
  commission_value: 0,
  notes: null,
  metadata: {},
});

const AdminPagarme = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string>("");
  const [draft, setDraft] = useState<RestaurantPaymentSettings | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-pagarme-restaurants"],
    queryFn: async () => {
      const [{ data: restaurants, error: restaurantsError }, { data: settings, error: settingsError }] =
        await Promise.all([
          supabase
            .from("restaurants")
            .select("id, name, owner_id")
            .order("name", { ascending: true }),
          supabase
            .from("restaurant_payment_settings")
            .select("*"),
        ]);

      if (restaurantsError) throw restaurantsError;
      if (settingsError) throw settingsError;

      return {
        restaurants: (restaurants || []) as RestaurantRow[],
        settings: (settings || []) as RestaurantPaymentSettings[],
      };
    },
  });

  const filteredRestaurants = useMemo(() => {
    const term = search.trim().toLowerCase();
    const restaurants = data?.restaurants || [];
    if (!term) return restaurants;
    return restaurants.filter(restaurant =>
      restaurant.name.toLowerCase().includes(term) || restaurant.id.toLowerCase().includes(term),
    );
  }, [data?.restaurants, search]);

  const selectedRestaurant = data?.restaurants.find(restaurant => restaurant.id === selectedRestaurantId);
  const settingsMap = useMemo(() => {
    const map = new Map<string, RestaurantPaymentSettings>();
    for (const setting of data?.settings || []) map.set(setting.restaurant_id, setting);
    return map;
  }, [data?.settings]);

  const selectRestaurant = (restaurant: RestaurantRow) => {
    setSelectedRestaurantId(restaurant.id);
    setDraft(settingsMap.get(restaurant.id) || emptySettings(restaurant.id));
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!draft) throw new Error("Selecione um restaurante");
      if (draft.is_enabled && draft.onboarding_status !== "approved") {
        throw new Error("A integração só pode ficar ativa com onboarding aprovado.");
      }
      if (draft.is_enabled && draft.marketplace_mode === "split" && !draft.recipient_id?.trim()) {
        throw new Error("Informe o recipient_id do restaurante.");
      }
      if (draft.commission_type !== "none" && Number(draft.commission_value || 0) <= 0) {
        throw new Error("Informe uma comissão maior que zero.");
      }
      return restaurantPaymentService.saveSettings(draft);
    },
    onSuccess: async (saved) => {
      await queryClient.invalidateQueries({ queryKey: ["admin-pagarme-restaurants"] });
      setDraft(saved);
      toast.success("Recebimentos do restaurante atualizados");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao salvar");
    },
  });

  const copyWebhookUrl = async () => {
    await navigator.clipboard.writeText(WEBHOOK_URL);
    toast.success("URL do webhook copiada");
  };

  const toggleMethod = (method: OnlinePaymentMethod) => {
    setDraft(prev => {
      if (!prev) return prev;
      const exists = prev.enabled_methods.includes(method);
      return {
        ...prev,
        enabled_methods: exists
          ? prev.enabled_methods.filter(item => item !== method)
          : [...prev.enabled_methods, method],
      };
    });
  };

  return (
    <AdminLayout title="Configuração Pagar.me">
      <div className="space-y-6">
        <Alert className="border-green/40 bg-green/5">
          <ShieldCheck className="h-4 w-4 text-green" />
          <AlertTitle>Conta Pagar.me da plataforma</AlertTitle>
          <AlertDescription>
            As chaves ficam em Supabase Secrets. Restaurantes não informam API key; você cria/aprova o recebedor e define o split aqui.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Checklist da integração
            </CardTitle>
            <CardDescription>
              Configure estes itens antes de aceitar pagamentos reais.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 md:grid-cols-3">
              <InfoBox title="Secret de API" value="PAGARME_SECRET_KEY" />
              <InfoBox title="Webhook" value="PAGARME_WEBHOOK_SECRET" />
              <InfoBox title="Recebedor da plataforma" value="PAGARME_PLATFORM_RECIPIENT_ID" />
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
                Inclua eventos de assinatura e de pedidos/cobranças: charge.paid, charge.payment_failed, order.paid e order.payment_failed.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 xl:grid-cols-[360px,1fr]">
          <Card>
            <CardHeader>
              <CardTitle>Restaurantes</CardTitle>
              <CardDescription>Selecione um restaurante para configurar recebedor, aprovação e comissão.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={event => setSearch(event.target.value)}
                  placeholder="Buscar restaurante"
                  className="pl-9"
                />
              </div>

              <div className="max-h-[520px] space-y-2 overflow-y-auto pr-1">
                {isLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Carregando...
                  </div>
                ) : filteredRestaurants.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum restaurante encontrado.</p>
                ) : (
                  filteredRestaurants.map(restaurant => {
                    const setting = settingsMap.get(restaurant.id);
                    const active = selectedRestaurantId === restaurant.id;
                    return (
                      <button
                        key={restaurant.id}
                        type="button"
                        onClick={() => selectRestaurant(restaurant)}
                        className={`w-full rounded-md border p-3 text-left transition-colors ${
                          active ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{restaurant.name}</p>
                            <p className="truncate font-mono text-xs text-muted-foreground">{restaurant.id}</p>
                          </div>
                          <Badge variant={setting?.is_enabled ? "default" : "outline"}>
                            {setting?.is_enabled ? "Ativo" : setting?.onboarding_status || "novo"}
                          </Badge>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{selectedRestaurant?.name || "Configuração de recebimentos"}</CardTitle>
              <CardDescription>
                Defina o recipient do restaurante e como a comissão da plataforma será aplicada em cada pedido.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!draft ? (
                <p className="text-sm text-muted-foreground">Selecione um restaurante para editar.</p>
              ) : (
                <div className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Status de aprovação</Label>
                      <Select
                        value={draft.onboarding_status}
                        onValueChange={value => setDraft(prev => prev ? {
                          ...prev,
                          onboarding_status: value as RestaurantPaymentSettings["onboarding_status"],
                        } : prev)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="not_started">Não iniciado</SelectItem>
                          <SelectItem value="pending">Em análise</SelectItem>
                          <SelectItem value="approved">Aprovado</SelectItem>
                          <SelectItem value="rejected">Reprovado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="recipient-id">Recipient ID do restaurante</Label>
                      <Input
                        id="recipient-id"
                        value={draft.recipient_id || ""}
                        onChange={event => setDraft(prev => prev ? { ...prev, recipient_id: event.target.value } : prev)}
                        placeholder="rp_..."
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-md border p-4">
                    <div>
                      <Label className="text-sm font-medium">Ativar recebimentos online</Label>
                      <p className="text-sm text-muted-foreground">
                        Exibe PIX online no checkout dos canais permitidos.
                      </p>
                    </div>
                    <Switch
                      checked={draft.is_enabled}
                      onCheckedChange={checked => setDraft(prev => prev ? { ...prev, is_enabled: checked } : prev)}
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Modelo de comissão</Label>
                      <Select
                        value={draft.commission_type}
                        onValueChange={value => setDraft(prev => prev ? {
                          ...prev,
                          commission_type: value as RestaurantPaymentSettings["commission_type"],
                        } : prev)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sem comissão</SelectItem>
                          <SelectItem value="percentage">Percentual</SelectItem>
                          <SelectItem value="flat">Valor fixo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="commission-value">
                        {draft.commission_type === "percentage" ? "Percentual (%)" : "Valor (R$)"}
                      </Label>
                      <Input
                        id="commission-value"
                        type="number"
                        min="0"
                        step="0.01"
                        value={draft.commission_value}
                        onChange={event => setDraft(prev => prev ? {
                          ...prev,
                          commission_value: Number(event.target.value || 0),
                        } : prev)}
                        disabled={draft.commission_type === "none"}
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-3">
                      <Label>Meios online</Label>
                      <label className="flex items-center gap-3 rounded-md border p-3">
                        <Checkbox
                          checked={draft.enabled_methods.includes("pix")}
                          onCheckedChange={() => toggleMethod("pix")}
                        />
                        <span className="text-sm font-medium">PIX online</span>
                      </label>
                      <label className="flex items-center gap-3 rounded-md border p-3 opacity-60">
                        <Checkbox checked={draft.enabled_methods.includes("credit_card")} disabled />
                        <span className="text-sm font-medium">Cartão online</span>
                        <Badge variant="outline">Próxima etapa</Badge>
                      </label>
                    </div>

                    <div className="space-y-3">
                      <Label>Canais permitidos</Label>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <ChannelCheck label="Delivery" field="allow_delivery" draft={draft} setDraft={setDraft} />
                        <ChannelCheck label="Retirada" field="allow_pickup" draft={draft} setDraft={setDraft} />
                        <ChannelCheck label="Mesa QR" field="allow_table" draft={draft} setDraft={setDraft} />
                        <ChannelCheck label="Balcão" field="allow_counter" draft={draft} setDraft={setDraft} />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Observações internas</Label>
                    <Textarea
                      id="notes"
                      value={draft.notes || ""}
                      onChange={event => setDraft(prev => prev ? { ...prev, notes: event.target.value } : prev)}
                      placeholder="Contrato, dados bancários, análise, responsável..."
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                      {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Salvar configuração
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

const InfoBox = ({ title, value }: { title: string; value: string }) => (
  <div className="rounded-md border bg-muted/20 p-4">
    <div className="flex items-center gap-2 font-medium">
      <CheckCircle className="h-4 w-4 text-green" />
      {title}
    </div>
    <p className="mt-2 font-mono text-sm">{value}</p>
  </div>
);

const ChannelCheck = ({
  label,
  field,
  draft,
  setDraft,
}: {
  label: string;
  field: keyof Pick<RestaurantPaymentSettings, "allow_delivery" | "allow_pickup" | "allow_table" | "allow_counter">;
  draft: RestaurantPaymentSettings;
  setDraft: Dispatch<SetStateAction<RestaurantPaymentSettings | null>>;
}) => (
  <label className="flex items-center gap-2 rounded-md border p-3">
    <Checkbox
      checked={Boolean(draft[field])}
      onCheckedChange={checked => setDraft(prev => prev ? { ...prev, [field]: Boolean(checked) } : prev)}
    />
    <span className="text-sm font-medium">{label}</span>
  </label>
);

export default AdminPagarme;
