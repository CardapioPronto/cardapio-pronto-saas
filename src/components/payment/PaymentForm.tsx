
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createSubscription } from "@/services/paymentService";
import { Loader2, CreditCard, QrCode, FileText } from "lucide-react";
import { toast } from "@/components/ui/sonner";

interface PaymentFormProps {
  planId: string;
  planName: string;
  planPrice: number;
  onSuccess: (subscriptionData: any) => void;
  onCancel: () => void;
}

const paymentFormSchema = z.object({
  name: z.string().min(3, { message: "Nome completo é obrigatório" }),
  email: z.string().email({ message: "Email inválido" }),
  document: z.string().min(11, { message: "CPF/CNPJ inválido" }),
  phone: z.string().min(10, { message: "Telefone inválido" }),
  paymentMethod: z.enum(["credit_card", "boleto", "pix"]),
  billingType: z.enum(["monthly", "yearly"]),
  
  // Credit card fields (conditional)
  cardNumber: z.string().optional(),
  cardName: z.string().optional(),
  cardExpiry: z.string().optional(),
  cardCvc: z.string().optional(),
});

const PaymentForm: React.FC<PaymentFormProps> = ({
  planId,
  planName,
  planPrice,
  onSuccess,
  onCancel
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("credit_card");
  
  const form = useForm<z.infer<typeof paymentFormSchema>>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      name: "",
      email: "",
      document: "",
      phone: "",
      paymentMethod: "credit_card",
      billingType: "monthly",
      cardNumber: "",
      cardName: "",
      cardExpiry: "",
      cardCvc: "",
    },
  });

  const handlePaymentMethodChange = (value: string) => {
    setSelectedPaymentMethod(value);
    form.setValue("paymentMethod", value as "credit_card" | "boleto" | "pix");
  };

  async function onSubmit(values: z.infer<typeof paymentFormSchema>) {
    setIsSubmitting(true);
    
    try {
      const subscriptionRequest = {
        planId,
        customer: {
          name: values.name,
          email: values.email,
          document: values.document,
          phone: values.phone,
        },
        paymentMethod: {
          type: values.paymentMethod,
          ...(values.paymentMethod === "credit_card" && {
            cardDetails: {
              number: values.cardNumber || "",
              name: values.cardName || "",
              expiry: values.cardExpiry || "",
              cvc: values.cardCvc || "",
            }
          })
        },
        billingType: values.billingType,
      };

      const response = await createSubscription(subscriptionRequest);
      toast.success(`Assinatura ${planName} criada com sucesso!`);
      onSuccess(response);
    } catch (error) {
      console.error("Error creating subscription:", error);
      toast.error("Erro ao processar pagamento. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // Fix: Updated to render the billing price based on current state rather than using a function
  const displayPrice = form.watch("billingType") === "yearly" 
    ? <><span className="font-semibold">R$ {(planPrice * 10).toFixed(2)}</span> <span className="text-green text-sm">(2 meses grátis)</span></>
    : <><span className="font-semibold">R$ {planPrice.toFixed(2)}</span></>;

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <CardTitle>Assinar plano {planName}</CardTitle>
        <CardDescription>
          {form.watch("billingType") === "yearly" ? (
            <>Cobrança anual: <span className="font-semibold">R$ {(planPrice * 10).toFixed(2)}</span> <span className="text-green text-sm">(2 meses grátis)</span></>
          ) : (
            <>Cobrança mensal: <span className="font-semibold">R$ {planPrice.toFixed(2)}</span></>
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
                  defaultValue="credit_card" 
                  onValueChange={handlePaymentMethodChange}
                >
                  <TabsList className="grid grid-cols-3 mb-4">
                    <TabsTrigger value="credit_card" className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      <span>Cartão</span>
                    </TabsTrigger>
                    <TabsTrigger value="boleto" className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      <span>Boleto</span>
                    </TabsTrigger>
                    <TabsTrigger value="pix" className="flex items-center gap-2">
                      <QrCode className="h-4 w-4" />
                      <span>PIX</span>
                    </TabsTrigger>
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
                  
                  <TabsContent value="pix">
                    <div className="bg-muted p-4 rounded-md text-center">
                      <p>Você receberá o QR Code do PIX por email após confirmar a assinatura.</p>
                      <p className="text-sm text-muted-foreground mt-2">O acesso será liberado imediatamente após a confirmação do pagamento.</p>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
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
