
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
import { Loader2, CreditCard, FileText } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { PagarmePaymentMethod } from "@/types/plano";

export type PaymentSuccessData = {
  success: boolean;
  subscription?: unknown;
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
  document: z.string().min(11, { message: "CPF/CNPJ inválido" }),
  phone: z.string().min(10, { message: "Telefone inválido" }),
  paymentMethod: z.enum(["credit_card", "boleto"]),
  billingType: z.enum(["monthly", "yearly"]),
  
  // Credit card fields (conditional)
  cardNumber: z.string().optional(),
  cardName: z.string().optional(),
  cardExpiry: z.string().optional(),
  cardCvc: z.string().optional(),
}).superRefine((values, ctx) => {
  if (values.paymentMethod !== "credit_card") return;

  if (!values.cardNumber || values.cardNumber.replace(/\D/g, "").length < 13) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["cardNumber"], message: "Número do cartão inválido" });
  }
  if (!values.cardName || values.cardName.length < 3) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["cardName"], message: "Nome no cartão é obrigatório" });
  }
  if (!values.cardExpiry || !/^\d{2}\/\d{2,4}$/.test(values.cardExpiry)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["cardExpiry"], message: "Use MM/AA ou MM/AAAA" });
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
  onCancel
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const availablePaymentMethods = useMemo(
    () => allowedPaymentMethods.filter((method) => method === "credit_card" || method === "boleto"),
    [allowedPaymentMethods],
  );
  const defaultPaymentMethod = availablePaymentMethods.includes("credit_card")
    ? "credit_card"
    : "boleto";
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<"credit_card" | "boleto">(defaultPaymentMethod);
  
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
    const method = value as "credit_card" | "boleto";
    setSelectedPaymentMethod(method);
    form.setValue("paymentMethod", method);
  };

  async function onSubmit(values: z.infer<typeof paymentFormSchema>) {
    setIsSubmitting(true);

    try {
      // Cartão de crédito → fluxo via Edge Function (server-side, plano sincronizado no Pagar.me)
      if (values.paymentMethod === "credit_card") {
        const expParts = (values.cardExpiry || "").split("/");
        const expMonth = expParts[0]?.padStart(2, "0") ?? "";
        const expYearRaw = expParts[1] ?? "";
        const result = await createPagarmeSubscription({
          local_plan_id: planId,
          billing_cycle: values.billingType,
          customer: {
            name: values.name,
            email: values.email,
            document: values.document,
            phone: values.phone,
          },
          card: {
            number: values.cardNumber || "",
            holder_name: values.cardName || values.name,
            exp_month: expMonth,
            exp_year: expYearRaw,
            cvv: values.cardCvc || "",
          },
        });
        toast.success(`Assinatura ${planName} criada com sucesso!`);
        onSuccess(result);
        return;
      }

      // Boleto → Edge Function dedicada (server-side, plano sincronizado)
      const result = await createPagarmeBoletoPix({
        local_plan_id: planId,
        billing_cycle: values.billingType,
        payment_method: "boleto",
        customer: {
          name: values.name,
          email: values.email,
          document: values.document,
          phone: values.phone,
        },
      });
      toast.success(`Assinatura ${planName} criada com sucesso!`);
      onSuccess(result);
    } catch (error) {
      console.error("Error creating subscription:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao processar pagamento. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const selectedBillingType = form.watch("billingType");
  const price = selectedBillingType === "yearly" ? planPriceYearly * 12 : planPriceMonthly;

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <CardTitle>Assinar plano {planName}</CardTitle>
        <CardDescription>
          {form.watch("billingType") === "yearly" ? (
            <>Cobrança anual: <span className="font-semibold">R$ {(planPriceYearly * 12).toFixed(2)}</span></>
          ) : (
            <>Cobrança mensal: <span className="font-semibold">R$ {planPriceMonthly.toFixed(2)}</span></>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                        <Input placeholder="Somente números" {...field} />
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
                        <Input placeholder="(00) 00000-0000" {...field} />
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
                      availablePaymentMethods.length > 1 ? "grid-cols-2" : "grid-cols-1"
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
                  </TabsList>
                
                  <TabsContent value="credit_card" className="space-y-4">
                    <FormField
                      control={form.control}
                      name="cardNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Número do cartão</FormLabel>
                          <FormControl>
                            <Input placeholder="0000 0000 0000 0000" {...field} />
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
                              <Input placeholder="MM/AA" {...field} />
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
                              <Input placeholder="123" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="boleto">
                    <div className="bg-muted p-4 rounded-md text-center">
                      <p>Você receberá o boleto por email após confirmar a assinatura.</p>
                      <p className="text-sm text-muted-foreground mt-2">O acesso será liberado após a confirmação do pagamento.</p>
                    </div>
                  </TabsContent>
                  
                </Tabs>
              </div>
            </div>
            
            <div className="rounded-md bg-muted/50 p-3 text-sm">
              Total: <span className="font-semibold">R$ {price.toFixed(2)}</span>
              {selectedBillingType === "yearly" ? " por ano" : " por mês"}
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button variant="outline" type="button" onClick={onCancel}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-green hover:bg-green-dark">
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processando...
                  </>
                ) : (
                  "Finalizar assinatura"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default PaymentForm;
