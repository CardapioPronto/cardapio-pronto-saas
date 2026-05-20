
import React, { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  createPagarmeSubscription,
  createPagarmeBoletoPix,
} from "@/services/pagarmeSubscriptionService";
import { Loader2, CreditCard, FileText, QrCode } from "lucide-react";
import { toast } from "@/components/ui/sonner-toast";
import { PagarmePaymentMethod } from "@/types/plano";
import BoletoPaymentConfirmation, {
  type BoletoPaymentDetails,
} from "@/components/payment/BoletoPaymentConfirmation";
import PixPaymentConfirmation, {
  type PixPaymentDetails,
} from "@/components/payment/PixPaymentConfirmation";
import {
  getLocalSubscriptionStatus,
  isPendingPaymentSubscription,
} from "@/lib/subscriptionStatusUi";
import {
  digitsOnly,
  formatCardExpiryInput,
  formatCardNumberInput,
  formatPhoneInput,
} from "@/lib/paymentInputFormatters";

type CheckoutPaymentMethod = "credit_card" | "boleto" | "pix";

type OfflineConfirmation =
  | { kind: "boleto"; result: PaymentSuccessData; payment: BoletoPaymentDetails }
  | { kind: "pix"; result: PaymentSuccessData; payment: PixPaymentDetails };

export type PaymentSuccessData = {
  success: boolean;
  subscription?: unknown;
  period_credit_days?: number;
  payment?: Record<string, unknown>;
  pagarme?: {
    subscription_id?: string;
    customer_id?: string;
    status?: string;
  };
};

interface PaymentFormProps {
  planId: string;
  planName: string;
  planPriceMonthly: number;
  planPriceYearly: number;
  initialBillingType?: "monthly" | "yearly";
  allowedPaymentMethods?: PagarmePaymentMethod[];
  onSuccess: (subscriptionData: PaymentSuccessData) => void;
  onCancel: () => void;
}

const paymentFormSchema = z.object({
  name: z.string().min(3, { message: "Nome completo é obrigatório" }),
  email: z.string().email({ message: "Email inválido" }),
  document: z
    .string()
    .min(1, { message: "CPF/CNPJ é obrigatório" })
    .refine((v) => digitsOnly(v).length >= 11, { message: "CPF/CNPJ inválido" }),
  phone: z
    .string()
    .min(1, { message: "Telefone é obrigatório" })
    .refine((v) => digitsOnly(v).length >= 10, { message: "Telefone inválido" }),
  paymentMethod: z.enum(["credit_card", "boleto", "pix"]),
  billingType: z.enum(["monthly", "yearly"]),

  cardNumber: z.string().optional(),
  cardName: z.string().optional(),
  cardExpiry: z.string().optional(),
  cardCvc: z.string().optional(),
}).superRefine((values, ctx) => {
  const method = values.paymentMethod;
  if (method !== "credit_card") return;

  if (!values.cardNumber || values.cardNumber.replace(/\D/g, "").length < 13) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["cardNumber"], message: "Número do cartão inválido" });
  }
  if (!values.cardName || values.cardName.length < 3) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["cardName"], message: "Nome no cartão é obrigatório" });
  }
  if (!values.cardExpiry || !/^\d{2}\/\d{2}$/.test(values.cardExpiry)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["cardExpiry"], message: "Informe a validade no formato MM/AA" });
  }
  if (!values.cardCvc || values.cardCvc.replace(/\D/g, "").length < 3) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["cardCvc"], message: "CVV inválido" });
  }
});

const PaymentForm: React.FC<PaymentFormProps> = ({
  planId,
  planName,
  planPriceMonthly,
  planPriceYearly,
  initialBillingType = "monthly",
  allowedPaymentMethods = ["credit_card", "boleto"],
  onSuccess,
  onCancel,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [offlineConfirmation, setOfflineConfirmation] = useState<OfflineConfirmation | null>(null);

  const availablePaymentMethods = useMemo(
    () =>
      allowedPaymentMethods.filter(
        (method): method is CheckoutPaymentMethod =>
          method === "credit_card" || method === "boleto" || method === "pix",
      ),
    [allowedPaymentMethods],
  );
  const defaultPaymentMethod: CheckoutPaymentMethod = availablePaymentMethods.includes("credit_card")
    ? "credit_card"
    : availablePaymentMethods.includes("pix")
      ? "pix"
      : "boleto";
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<CheckoutPaymentMethod>(defaultPaymentMethod);

  const form = useForm<z.infer<typeof paymentFormSchema>>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      name: "",
      email: "",
      document: "",
      phone: "",
      paymentMethod: defaultPaymentMethod,
      billingType: initialBillingType,
      cardNumber: "",
      cardName: "",
      cardExpiry: "",
      cardCvc: "",
    },
  });

  useEffect(() => {
    if (!availablePaymentMethods.includes(selectedPaymentMethod)) {
      setSelectedPaymentMethod(defaultPaymentMethod);
      form.setValue("paymentMethod", defaultPaymentMethod);
    }
  }, [availablePaymentMethods, defaultPaymentMethod, form, selectedPaymentMethod]);

  const handlePaymentMethodChange = (value: string) => {
    const method = value as CheckoutPaymentMethod;
    setSelectedPaymentMethod(method);
    form.setValue("paymentMethod", method);
  };

  const finishWithSuccess = (result: PaymentSuccessData, options?: { immediateToast?: boolean }) => {
    const status = getLocalSubscriptionStatus(result.subscription as { status?: string });
    const creditDays = Math.max(0, Number(result.period_credit_days ?? 0));
    if (options?.immediateToast !== false && status === "active") {
      const creditNote =
        creditDays > 0
          ? ` Incluímos ${creditDays} ${creditDays === 1 ? "dia" : "dias"} restantes do seu período atual no novo ciclo.`
          : "";
      toast.success(`Assinatura ${planName} ativada com sucesso!${creditNote}`);
    } else if (status === "trialing") {
      toast.success(`Período de teste do plano ${planName} iniciado.`);
    } else if (creditDays > 0 && options?.immediateToast !== false) {
      toast.success(
        `Assinatura registrada. ${creditDays} ${creditDays === 1 ? "dia" : "dias"} do período anterior foram somados ao novo ciclo após a confirmação do pagamento.`,
      );
    }
    onSuccess(result);
  };

  const scrollToFirstError = () => {
    requestAnimationFrame(() => {
      const el = document.querySelector<HTMLElement>(
        '[data-payment-form] [aria-invalid="true"], [data-payment-form] .text-destructive',
      );
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  };

  const onInvalid = () => {
    const errors = form.formState.errors;
    const firstMessage =
      errors.name?.message ||
      errors.email?.message ||
      errors.document?.message ||
      errors.phone?.message ||
      errors.cardNumber?.message ||
      errors.cardName?.message ||
      errors.cardExpiry?.message ||
      errors.cardCvc?.message;
    toast.error(firstMessage?.toString() || "Revise os campos destacados antes de continuar.");
    scrollToFirstError();
  };

  async function onSubmit(values: z.infer<typeof paymentFormSchema>) {
    const paymentMethod = selectedPaymentMethod;
    setIsSubmitting(true);

    try {
      if (paymentMethod === "credit_card") {
        const expParts = (values.cardExpiry || "").split("/");
        const expMonth = expParts[0]?.padStart(2, "0") ?? "";
        const expYearRaw = expParts[1] ?? "";
        const result = await createPagarmeSubscription({
          local_plan_id: planId,
          billing_cycle: values.billingType,
          customer: {
            name: values.name,
            email: values.email,
            document: digitsOnly(values.document),
            phone: digitsOnly(values.phone),
          },
          card: {
            number: digitsOnly(values.cardNumber || ""),
            holder_name: values.cardName || values.name,
            exp_month: expMonth,
            exp_year: expYearRaw,
            cvv: digitsOnly(values.cardCvc || ""),
          },
        });
        finishWithSuccess(result);
        return;
      }

      const offlineMethod = paymentMethod === "pix" ? "pix" : "boleto";
      const result = await createPagarmeBoletoPix({
        local_plan_id: planId,
        billing_cycle: values.billingType,
        payment_method: offlineMethod,
        customer: {
          name: values.name,
          email: values.email,
          document: digitsOnly(values.document),
          phone: digitsOnly(values.phone),
        },
      });

      if (isPendingPaymentSubscription(result)) {
        if (offlineMethod === "pix") {
          setOfflineConfirmation({
            kind: "pix",
            result,
            payment: {
              pix_qr_code: (result.payment?.pix_qr_code as string) ?? null,
              pix_qr_code_url: (result.payment?.pix_qr_code_url as string) ?? null,
              pix_expires_at: (result.payment?.pix_expires_at as string) ?? null,
            },
          });
        } else {
          setOfflineConfirmation({
            kind: "boleto",
            result,
            payment: {
              boleto_url: (result.payment?.boleto_url as string) ?? null,
              boleto_barcode: (result.payment?.boleto_barcode as string) ?? null,
              boleto_line: (result.payment?.boleto_line as string) ?? null,
              due_at: (result.payment?.due_at as string) ?? null,
            },
          });
        }
        return;
      }

      finishWithSuccess(result);
    } catch (error) {
      console.error("Error creating subscription:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao processar pagamento. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (offlineConfirmation) {
    return (
      <Card className="w-full max-w-lg mx-auto border-0 shadow-none">
        {offlineConfirmation.kind === "pix" ? (
          <PixPaymentConfirmation
            planName={planName}
            payment={offlineConfirmation.payment}
            onContinue={() =>
              finishWithSuccess(offlineConfirmation.result, { immediateToast: false })}
          />
        ) : (
          <BoletoPaymentConfirmation
            planName={planName}
            payment={offlineConfirmation.payment}
            onContinue={() =>
              finishWithSuccess(offlineConfirmation.result, { immediateToast: false })}
          />
        )}
      </Card>
    );
  }

  const selectedBillingType = form.watch("billingType");
  const price = selectedBillingType === "yearly" ? planPriceYearly * 12 : planPriceMonthly;

  return (
    <Card className="mx-auto flex w-full max-w-lg max-h-[inherit] flex-col border-0 shadow-none" data-payment-form>
      <CardHeader className="shrink-0 border-b px-6 py-4">
        <CardTitle>Assinar plano {planName}</CardTitle>
        <CardDescription>
          {form.watch("billingType") === "yearly" ? (
            <>Cobrança anual: <span className="font-semibold">R$ {(planPriceYearly * 12).toFixed(2)}</span></>
          ) : (
            <>Cobrança mensal: <span className="font-semibold">R$ {planPriceMonthly.toFixed(2)}</span></>
          )}
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            form.setValue("paymentMethod", selectedPaymentMethod);
            void form.handleSubmit(onSubmit, onInvalid)(e);
          }}
          className="flex min-h-0 flex-1 flex-col"
        >
          <CardContent className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome completo</FormLabel>
                    <FormControl>
                      <Input placeholder="Seu nome completo" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="seu@email.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="document"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CPF/CNPJ</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Somente números"
                          inputMode="numeric"
                          {...field}
                          onChange={(e) => field.onChange(digitsOnly(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="(00) 00000-0000"
                          inputMode="tel"
                          {...field}
                          onChange={(e) => field.onChange(formatPhoneInput(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="billingType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Período de cobrança</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o período" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="monthly">Mensal</SelectItem>
                        <SelectItem value="yearly">Anual (2 meses grátis)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <FormLabel>Método de pagamento</FormLabel>
                <Tabs
                  value={selectedPaymentMethod}
                  onValueChange={handlePaymentMethodChange}
                >
                  <TabsList
                    className={`mb-4 grid ${
                      availablePaymentMethods.length >= 3
                        ? "grid-cols-3"
                        : availablePaymentMethods.length > 1
                          ? "grid-cols-2"
                          : "grid-cols-1"
                    }`}
                  >
                    {availablePaymentMethods.includes("credit_card") && (
                      <TabsTrigger value="credit_card" className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        <span>Cartão</span>
                      </TabsTrigger>
                    )}
                    {availablePaymentMethods.includes("boleto") && (
                      <TabsTrigger value="boleto" className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        <span>Boleto</span>
                      </TabsTrigger>
                    )}
                    {availablePaymentMethods.includes("pix") && (
                      <TabsTrigger value="pix" className="flex items-center gap-2">
                        <QrCode className="h-4 w-4" />
                        <span>PIX</span>
                      </TabsTrigger>
                    )}
                  </TabsList>

                  <TabsContent value="credit_card" className="space-y-4">
                    <FormField
                      control={form.control}
                      name="cardNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Número do cartão</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="0000 0000 0000 0000"
                              inputMode="numeric"
                              autoComplete="cc-number"
                              {...field}
                              onChange={(e) => field.onChange(formatCardNumberInput(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="cardName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome no cartão</FormLabel>
                          <FormControl>
                            <Input placeholder="Nome impresso no cartão" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="cardExpiry"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Validade</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="MM/AA"
                                inputMode="numeric"
                                autoComplete="cc-exp"
                                maxLength={5}
                                {...field}
                                onChange={(e) => field.onChange(formatCardExpiryInput(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="cardCvc"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>CVV</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="123"
                                inputMode="numeric"
                                autoComplete="cc-csc"
                                maxLength={4}
                                {...field}
                                onChange={(e) => field.onChange(digitsOnly(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="boleto">
                    <div className="rounded-md bg-muted p-4 text-center text-sm">
                      <p>Após confirmar, exibiremos o boleto para pagamento.</p>
                      <p className="mt-2 text-muted-foreground">
                        O plano só é ativado após a confirmação do pagamento pelo banco.
                      </p>
                    </div>
                  </TabsContent>

                  <TabsContent value="pix">
                    <div className="rounded-md bg-muted p-4 text-center text-sm">
                      <p>Após confirmar, exibiremos o QR Code PIX.</p>
                      <p className="mt-2 text-muted-foreground">
                        O plano é ativado assim que o pagamento for confirmado (no teste, valores até R$ 500
                        simulam sucesso automático).
                      </p>
                    </div>
                  </TabsContent>

                </Tabs>
              </div>
            </div>
          </CardContent>

          <div className="shrink-0 space-y-3 border-t bg-background px-6 py-4">
            <div className="rounded-md bg-muted/50 p-3 text-sm">
              Total: <span className="font-semibold">R$ {price.toFixed(2)}</span>
              {selectedBillingType === "yearly" ? " por ano" : " por mês"}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" type="button" onClick={onCancel} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-green hover:bg-green-dark">
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processando...
                  </>
                ) : selectedPaymentMethod === "boleto" ? (
                  "Gerar boleto"
                ) : selectedPaymentMethod === "pix" ? (
                  "Gerar PIX"
                ) : (
                  "Finalizar assinatura"
                )}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </Card>
  );
};

export default PaymentForm;
