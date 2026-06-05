import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/sonner-toast";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import {
  OnlinePaymentMethod,
  PaymentFulfillment,
  RestaurantPaymentSettings,
  restaurantPaymentService,
} from "@/services/restaurantPaymentService";
import {
  AccountType,
  RECIPIENT_STATUS_LABEL,
  RecipientStatus,
  restaurantRecipientService,
} from "@/services/restaurantRecipientService";
import { Banknote, CheckCircle2, Clock, Loader2, QrCode, RefreshCw, ShieldCheck } from "lucide-react";

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

interface RecipientForm {
  holder_name: string;
  holder_document: string;
  email: string;
  phone: string;
  bank_code: string;
  branch_number: string;
  branch_check_digit: string;
  account_number: string;
  account_check_digit: string;
  account_type: AccountType;
}

const EMPTY_RECIPIENT_FORM: RecipientForm = {
  holder_name: "",
  holder_document: "",
  email: "",
  phone: "",
  bank_code: "",
  branch_number: "",
  branch_check_digit: "",
  account_number: "",
  account_check_digit: "",
  account_type: "checking",
};

const recipientBadgeVariant = (status: RecipientStatus): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case "active":
      return "default";
    case "registration":
    case "affiliation":
      return "secondary";
    case "refused":
    case "suspended":
    case "blocked":
      return "destructive";
    default:
      return "outline";
  }
};

const PagarmeConfig = () => {
  const { user } = useCurrentUser();
  const restaurantId = user?.restaurant_id || "";
  const queryClient = useQueryClient();
  const [form, setForm] = useState<RestaurantPaymentSettings | null>(null);
  const [recipientForm, setRecipientForm] = useState<RecipientForm>(EMPTY_RECIPIENT_FORM);

  const { data: settings, isLoading } = useQuery({
    queryKey: ["restaurant-payment-settings", restaurantId],
    queryFn: () => restaurantPaymentService.getSettings(restaurantId),
    enabled: !!restaurantId,
  });

  const { data: recipient, isLoading: recipientLoading } = useQuery({
    queryKey: ["restaurant-recipient-account", restaurantId],
    queryFn: () => restaurantRecipientService.getAccount(restaurantId),
    enabled: !!restaurantId,
  });

  useEffect(() => {
    if (settings) setForm(settings);
  }, [settings]);

  useEffect(() => {
    if (recipient?.exists) {
      setRecipientForm(prev => ({
        ...prev,
        holder_name: prev.holder_name || recipient.holder_name || "",
        bank_code: prev.bank_code || recipient.bank_code || "",
        account_type: recipient.account_type || prev.account_type,
      }));
    }
  }, [recipient]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form) throw new Error("Configuração não carregada");
      if (form.is_enabled && form.onboarding_status !== "approved") {
        throw new Error("O recebedor precisa estar ativo antes de ligar o PIX online.");
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

  const submitRecipientMutation = useMutation({
    mutationFn: async () => {
      const f = recipientForm;
      return restaurantRecipientService.submit({
        holder_name: f.holder_name,
        holder_document: f.holder_document,
        email: f.email,
        phone: f.phone || undefined,
        bank_account: {
          bank_code: f.bank_code,
          branch_number: f.branch_number,
          branch_check_digit: f.branch_check_digit || undefined,
          account_number: f.account_number,
          account_check_digit: f.account_check_digit,
          account_type: f.account_type,
        },
      });
    },
    onSuccess: async (data) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["restaurant-recipient-account", restaurantId] }),
        queryClient.invalidateQueries({ queryKey: ["restaurant-payment-settings", restaurantId] }),
      ]);
      toast.success(
        data.recipient_status === "active"
          ? "Recebedor ativo! Você já pode ligar o PIX online."
          : "Recebedor enviado. Aguardando validação do Pagar.me.",
      );
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao enviar dados do recebedor");
    },
  });

  const syncMutation = useMutation({
    mutationFn: async () => restaurantRecipientService.syncStatus(),
    onSuccess: async (data) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["restaurant-recipient-account", restaurantId] }),
        queryClient.invalidateQueries({ queryKey: ["restaurant-payment-settings", restaurantId] }),
      ]);
      toast.success(`Status atualizado: ${RECIPIENT_STATUS_LABEL[data.recipient_status]}`);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao sincronizar status");
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

  const recipientStatus: RecipientStatus = recipient?.recipient_status || "not_created";
  const recipientActive = recipientStatus === "active";
  const recipientCreated = Boolean(recipient?.recipient_id);

  const recipientFormValid = useMemo(() => {
    const f = recipientForm;
    const doc = f.holder_document.replace(/\D/g, "");
    return (
      f.holder_name.trim().length > 1 &&
      (doc.length === 11 || doc.length === 14) &&
      f.email.includes("@") &&
      f.bank_code.trim().length > 0 &&
      f.branch_number.trim().length > 0 &&
      f.account_number.trim().length > 0 &&
      f.account_check_digit.trim().length > 0
    );
  }, [recipientForm]);

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

  const canUseOnline = recipientActive && form.is_enabled;
  const updateRecipient = (patch: Partial<RecipientForm>) =>
    setRecipientForm(prev => ({ ...prev, ...patch }));

  return (
    <DashboardLayout title="Recebimentos Online">
      <div className="space-y-6">
        <Alert className="border-green/30 bg-green/5">
          <ShieldCheck className="h-4 w-4 text-green" />
          <AlertTitle>Repasse direto para a sua conta</AlertTitle>
          <AlertDescription>
            Você informa apenas os dados bancários do restaurante. O Pagar.me cria seu recebedor e repassa
            automaticamente o valor de cada pedido pago via PIX para a sua conta. Nenhuma chave de API é solicitada.
          </AlertDescription>
        </Alert>

        {/* Onboarding do recebedor */}
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Banknote className="h-5 w-5" />
                  Conta para repasse (recebedor)
                </CardTitle>
                <CardDescription>
                  Dados da conta bancária que vai receber o dinheiro dos pedidos pagos com PIX.
                </CardDescription>
              </div>
              <Badge variant={recipientBadgeVariant(recipientStatus)}>
                {RECIPIENT_STATUS_LABEL[recipientStatus]}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {recipientCreated && (
              <div className="flex flex-col gap-3 rounded-md border bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1 text-sm">
                  <p className="font-medium">{recipient?.holder_name || "Recebedor cadastrado"}</p>
                  <p className="text-muted-foreground">
                    Banco {recipient?.bank_code} · conta final {recipient?.account_last_digits || "••••"} ·{" "}
                    {recipient?.account_type === "savings" ? "Poupança" : "Corrente"}
                  </p>
                  {recipient?.synced_at && (
                    <p className="text-xs text-muted-foreground">
                      Última sincronização: {new Date(recipient.synced_at).toLocaleString("pt-BR")}
                    </p>
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => syncMutation.mutate()}
                  disabled={syncMutation.isPending}
                >
                  {syncMutation.isPending
                    ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    : <RefreshCw className="mr-2 h-4 w-4" />}
                  Sincronizar status
                </Button>
              </div>
            )}

            {!recipientActive && (
              <Alert className="border-amber-300/40 bg-amber-50/40 dark:bg-amber-950/10">
                <Clock className="h-4 w-4" />
                <AlertTitle>
                  {recipientCreated ? "Recebedor em validação" : "Cadastre sua conta para começar"}
                </AlertTitle>
                <AlertDescription>
                  {recipientCreated
                    ? "O Pagar.me está validando os dados (KYC). Assim que o recebedor ficar ativo, você poderá ligar o PIX online. Use “Sincronizar status” para checar."
                    : "Preencha os dados abaixo. Após o envio, o Pagar.me valida o recebedor (pode levar alguns minutos a algumas horas)."}
                </AlertDescription>
              </Alert>
            )}

            {!recipientLoading && (
              <div className="space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="holder_name">Titular da conta (nome ou razão social)</Label>
                    <Input
                      id="holder_name"
                      value={recipientForm.holder_name}
                      onChange={e => updateRecipient({ holder_name: e.target.value })}
                      placeholder="Ex.: Restaurante Sabor Ltda"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="holder_document">CPF ou CNPJ do titular</Label>
                    <Input
                      id="holder_document"
                      value={recipientForm.holder_document}
                      onChange={e => updateRecipient({ holder_document: e.target.value })}
                      placeholder="Somente números"
                      inputMode="numeric"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="recipient_email">E-mail do recebedor</Label>
                    <Input
                      id="recipient_email"
                      type="email"
                      value={recipientForm.email}
                      onChange={e => updateRecipient({ email: e.target.value })}
                      placeholder="financeiro@restaurante.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="recipient_phone">Telefone (opcional)</Label>
                    <Input
                      id="recipient_phone"
                      value={recipientForm.phone}
                      onChange={e => updateRecipient({ phone: e.target.value })}
                      placeholder="DDD + número"
                      inputMode="numeric"
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-2">
                    <Label htmlFor="bank_code">Banco (código)</Label>
                    <Input
                      id="bank_code"
                      value={recipientForm.bank_code}
                      onChange={e => updateRecipient({ bank_code: e.target.value })}
                      placeholder="Ex.: 341"
                      inputMode="numeric"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="branch_number">Agência</Label>
                    <Input
                      id="branch_number"
                      value={recipientForm.branch_number}
                      onChange={e => updateRecipient({ branch_number: e.target.value })}
                      placeholder="0001"
                      inputMode="numeric"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="branch_check_digit">Dígito da agência (opcional)</Label>
                    <Input
                      id="branch_check_digit"
                      value={recipientForm.branch_check_digit}
                      onChange={e => updateRecipient({ branch_check_digit: e.target.value })}
                      placeholder="0"
                      inputMode="numeric"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo de conta</Label>
                    <Select
                      value={recipientForm.account_type}
                      onValueChange={value => updateRecipient({ account_type: value as AccountType })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="checking">Corrente</SelectItem>
                        <SelectItem value="savings">Poupança</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="account_number">Número da conta</Label>
                    <Input
                      id="account_number"
                      value={recipientForm.account_number}
                      onChange={e => updateRecipient({ account_number: e.target.value })}
                      placeholder="Somente números"
                      inputMode="numeric"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="account_check_digit">Dígito da conta</Label>
                    <Input
                      id="account_check_digit"
                      value={recipientForm.account_check_digit}
                      onChange={e => updateRecipient({ account_check_digit: e.target.value })}
                      placeholder="0"
                      inputMode="numeric"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    type="button"
                    onClick={() => submitRecipientMutation.mutate()}
                    disabled={submitRecipientMutation.isPending || !recipientFormValid}
                  >
                    {submitRecipientMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {recipientCreated ? "Atualizar conta bancária" : "Cadastrar recebedor"}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* PIX online no checkout */}
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <QrCode className="h-5 w-5" />
                  PIX online para pedidos
                </CardTitle>
                <CardDescription>
                  Receba pagamentos do cardápio digital. Disponível após o recebedor ficar ativo.
                </CardDescription>
              </div>
              <Badge variant={canUseOnline ? "default" : recipientActive ? "secondary" : "outline"}>
                {canUseOnline ? "Ativo" : recipientActive ? "Pronto" : "Aguardando recebedor"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {!recipientActive ? (
              <div className="rounded-md border bg-muted/20 p-4 text-sm text-muted-foreground">
                Conclua o cadastro do recebedor acima e aguarde a ativação para liberar o PIX online no checkout.
              </div>
            ) : (
              <div className="flex items-center justify-between rounded-md border p-4">
                <div>
                  <Label className="text-sm font-medium">Oferecer PIX online no checkout</Label>
                  <p className="text-sm text-muted-foreground">
                    Quando ligado, o pedido entra como aguardando pagamento até o webhook confirmar.
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
                    className={`flex items-center gap-3 rounded-md border p-3 ${option.disabled || !recipientActive ? "opacity-60" : "cursor-pointer"}`}
                  >
                    <Checkbox
                      checked={form.enabled_methods.includes(option.value)}
                      disabled={option.disabled || !recipientActive}
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
                  <label key={option.value} className={`flex items-center gap-3 rounded-md border p-3 ${!recipientActive ? "opacity-60" : ""}`}>
                    <Checkbox
                      checked={Boolean(form[option.field])}
                      disabled={!recipientActive}
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

            {recipientActive && (
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
              Como funciona o repasse
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm text-muted-foreground md:grid-cols-4">
            <p>1. Você cadastra a conta bancária do restaurante (recebedor).</p>
            <p>2. O cliente paga o pedido via PIX no cardápio.</p>
            <p>3. O Pagar.me confirma e o pedido entra no painel da loja.</p>
            <p>4. O valor é liquidado automaticamente na sua conta pelo Pagar.me.</p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default PagarmeConfig;
