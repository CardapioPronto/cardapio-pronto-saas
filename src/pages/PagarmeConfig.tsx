import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/sonner-toast";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import {
  OnlinePaymentMethod,
  PaymentFulfillment,
  RestaurantPaymentSettings,
  restaurantPaymentService,
} from "@/services/restaurantPaymentService";
import { CheckCircle2, Clock, Loader2, QrCode, ShieldCheck } from "lucide-react";

const METHOD_OPTIONS: Array<{ value: OnlinePaymentMethod; label: string; disabled?: boolean }> = [
  { value: "pix", label: "PIX online" },
  { value: "credit_card", label: "Cartão online", disabled: true },
];

const FULFILLMENT_OPTIONS: Array<{
  value: PaymentFulfillment;
  label: string;
  field: keyof Pick<RestaurantPaymentSettings, "allow_delivery" | "allow_pickup" | "allow_table" | "allow_counter">;
}> = [
  { value: "delivery", label: "Delivery", field: "allow_delivery" },
  { value: "pickup", label: "Retirada", field: "allow_pickup" },
  { value: "table", label: "Mesa por QR Code", field: "allow_table" },
  { value: "counter", label: "Balcão", field: "allow_counter" },
];

const statusLabel: Record<RestaurantPaymentSettings["onboarding_status"], string> = {
  not_started: "Não solicitado",
  pending: "Em análise",
  approved: "Aprovado",
  rejected: "Reprovado",
};

const PagarmeConfig = () => {
  const { user } = useCurrentUser();
  const restaurantId = user?.restaurant_id || "";
  const queryClient = useQueryClient();
  const [form, setForm] = useState<RestaurantPaymentSettings | null>(null);

  const { data: settings, isLoading } = useQuery({
    queryKey: ["restaurant-payment-settings", restaurantId],
    queryFn: () => restaurantPaymentService.getSettings(restaurantId),
    enabled: !!restaurantId,
  });

  useEffect(() => {
    if (settings) setForm(settings);
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form) throw new Error("Configuração não carregada");
      if (form.is_enabled && form.onboarding_status !== "approved") {
        throw new Error("A integração precisa ser aprovada pela Pubfy antes da ativação.");
      }
      return restaurantPaymentService.saveSettings({
        ...form,
        recipient_id: settings?.recipient_id || null,
        marketplace_mode: settings?.marketplace_mode || "split",
        onboarding_status: settings?.onboarding_status || "not_started",
        commission_type: settings?.commission_type || "none",
        commission_value: Number(settings?.commission_value || 0),
        notes: settings?.notes || null,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["restaurant-payment-settings", restaurantId] });
      toast.success("Preferências de recebimento salvas");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao salvar configuração");
    },
  });

  const requestMutation = useMutation({
    mutationFn: async () => {
      const current = form || restaurantPaymentService.toPublic(null);
      return restaurantPaymentService.saveSettings({
        ...(settings || {
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
        }),
        ...current,
        restaurant_id: restaurantId,
        is_enabled: false,
        onboarding_status: "pending",
      } as RestaurantPaymentSettings);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["restaurant-payment-settings", restaurantId] });
      toast.success("Solicitação enviada para análise");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao solicitar ativação");
    },
  });

  const toggleMethod = (method: OnlinePaymentMethod) => {
    if (method === "credit_card") return;
    setForm(prev => {
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

  if (!restaurantId) {
    return (
      <DashboardLayout title="Recebimentos Online">
        <Alert variant="destructive">
          <AlertTitle>Restaurante não encontrado</AlertTitle>
          <AlertDescription>Não foi possível localizar o restaurante vinculado à sua conta.</AlertDescription>
        </Alert>
      </DashboardLayout>
    );
  }

  if (isLoading || !form) {
    return (
      <DashboardLayout title="Recebimentos Online">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando configuração...
        </div>
      </DashboardLayout>
    );
  }

  const approved = form.onboarding_status === "approved" && !!form.recipient_id;
  const canUseOnline = approved && form.is_enabled;

  return (
    <DashboardLayout title="Recebimentos Online">
      <div className="space-y-6">
        <Alert className="border-green/30 bg-green/5">
          <ShieldCheck className="h-4 w-4 text-green" />
          <AlertTitle>Nenhuma chave Pagar.me é solicitada aqui</AlertTitle>
          <AlertDescription>
            Os pagamentos passam pela conta da plataforma Pubfy. O restaurante só precisa solicitar aprovação para receber via PIX online.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <QrCode className="h-5 w-5" />
                  PIX online para pedidos
                </CardTitle>
                <CardDescription>
                  Receba pagamentos do cardápio digital sem informar credenciais do Pagar.me.
                </CardDescription>
              </div>
              <Badge variant={canUseOnline ? "default" : approved ? "secondary" : "outline"}>
                {canUseOnline ? "Ativo" : approved ? "Aprovado" : statusLabel[form.onboarding_status]}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {!approved ? (
              <div className="rounded-md border bg-muted/20 p-4">
                <div className="flex items-start gap-3">
                  <Clock className="mt-0.5 h-5 w-5 text-muted-foreground" />
                  <div className="space-y-2">
                    <p className="font-medium">Ativação sujeita à análise</p>
                    <p className="text-sm text-muted-foreground">
                      A Pubfy precisa validar os dados do restaurante e liberar o recebedor antes de exibir PIX online no checkout.
                    </p>
                    <Button
                      type="button"
                      onClick={() => requestMutation.mutate()}
                      disabled={requestMutation.isPending || form.onboarding_status === "pending"}
                    >
                      {requestMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {form.onboarding_status === "pending" ? "Solicitação em análise" : "Solicitar ativação"}
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between rounded-md border p-4">
                <div>
                  <Label className="text-sm font-medium">Oferecer PIX online no checkout</Label>
                  <p className="text-sm text-muted-foreground">
                    Quando ligado, o pedido pode entrar como aguardando pagamento até o webhook confirmar.
                  </p>
                </div>
                <Switch
                  checked={form.is_enabled}
                  onCheckedChange={checked => setForm(prev => prev ? { ...prev, is_enabled: checked } : prev)}
                />
              </div>
            )}

            <div className="space-y-3">
              <Label>Meios online disponíveis</Label>
              <div className="grid gap-3 sm:grid-cols-2">
                {METHOD_OPTIONS.map(option => (
                  <label
                    key={option.value}
                    className={`flex items-center gap-3 rounded-md border p-3 ${option.disabled || !approved ? "opacity-60" : "cursor-pointer"}`}
                  >
                    <Checkbox
                      checked={form.enabled_methods.includes(option.value)}
                      disabled={option.disabled || !approved}
                      onCheckedChange={() => toggleMethod(option.value)}
                    />
                    <span className="text-sm font-medium">{option.label}</span>
                    {option.disabled && <Badge variant="outline">Próxima etapa</Badge>}
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label>Onde oferecer pagamento online</Label>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {FULFILLMENT_OPTIONS.map(option => (
                  <label key={option.value} className={`flex items-center gap-3 rounded-md border p-3 ${!approved ? "opacity-60" : ""}`}>
                    <Checkbox
                      checked={Boolean(form[option.field])}
                      disabled={!approved}
                      onCheckedChange={checked => setForm(prev => prev ? {
                        ...prev,
                        [option.field]: Boolean(checked),
                      } : prev)}
                    />
                    <span className="text-sm font-medium">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {approved && (
              <div className="flex justify-end">
                <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                  {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Salvar preferências
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              Como funciona no dia a dia
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm text-muted-foreground md:grid-cols-3">
            <p>O cliente escolhe PIX online no cardápio.</p>
            <p>O pedido fica aguardando pagamento até a confirmação.</p>
            <p>Após o pagamento, o pedido entra no painel da loja.</p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default PagarmeConfig;
