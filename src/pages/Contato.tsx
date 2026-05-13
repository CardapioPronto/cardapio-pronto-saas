
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { ArrowRight, Check, Clock, Headphones, Mail, MessageCircle, Phone, ShieldCheck, Sparkles } from "lucide-react";
import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { PublicSeo } from "@/components/seo/PublicSeo";
import { Badge } from "@/components/ui/badge";
import { createLogger } from "@/lib/log";
import { TurnstileWidget } from "@/components/security/TurnstileWidget";

const log = createLogger("contato");

const Contato = () => {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [assunto, setAssunto] = useState("suporte");
  const [mensagem, setMensagem] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!captchaToken) {
      toast({
        title: "Verificação pendente",
        description: "Aguarde o captcha carregar antes de enviar.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { supabase } = await import("@/integrations/supabase/client");

      const { data, error } = await supabase.functions.invoke<{
        success?: boolean;
        error?: string;
        captcha_error_codes?: string[];
      }>("send-contact-email", {
        body: {
          name: nome,
          email,
          phone: telefone,
          subject: assunto,
          message: mensagem,
          captcha_token: captchaToken,
        },
      });

      let captchaErrorCodes: string[] | undefined = data?.captcha_error_codes;

      if (!captchaErrorCodes?.length && error) {
        const errCtx = (error as { context?: Response }).context;
        if (errCtx && typeof errCtx.clone === "function") {
          try {
            const parsed = (await errCtx.clone().json()) as {
              captcha_error_codes?: string[];
            };
            captchaErrorCodes = parsed?.captcha_error_codes;
          } catch {
            // body não-JSON, ignore
          }
        }
      }

      if (captchaErrorCodes?.length) {
        log.capture(new Error("turnstile rejected"), {
          action: "send_contact_message_captcha",
          captchaErrorCodes: captchaErrorCodes.join(","),
        });
        toast({
          title: "Captcha rejeitado",
          description: `Recarregue a página e tente novamente. (${captchaErrorCodes.join(", ")})`,
          variant: "destructive",
        });
        setCaptchaToken(null);
        return;
      }

      if (error) throw error;
      if (data?.error) throw new Error(String(data.error));

      setEnviado(true);
      toast({
        title: "Mensagem enviada",
        description: "Recebemos sua mensagem e responderemos em breve!",
      });

      setNome("");
      setEmail("");
      setTelefone("");
      setAssunto("suporte");
      setMensagem("");
      setCaptchaToken(null);
    } catch (error) {
      log.capture(error, { action: "send_contact_message", assunto, email });
      toast({
        title: "Erro ao enviar mensagem",
        description: "Ocorreu um erro ao enviar sua mensagem. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    <PublicSeo
      title="Contato | Pubfy"
      description="Fale com vendas, suporte ou produto. Tiramos dúvidas sobre planos, implantação e operações digitais."
      path="/contato"
    />
    <div className="flex flex-col min-h-screen bg-offwhite">
      <Navbar />
      <main className="flex-grow pt-24">
        <section className="relative overflow-hidden bg-gradient-to-br from-navy via-navy to-green/90 text-white">
          <div className="absolute -right-24 top-12 h-72 w-72 rounded-full bg-orange/25 blur-3xl" />
          <div className="container relative mx-auto grid gap-12 px-6 py-16 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
            <div>
              <Badge className="mb-5 border-white/20 bg-white/10 text-white hover:bg-white/15">
                Fale com especialistas
              </Badge>
              <h1 className="text-4xl font-bold tracking-tight md:text-6xl">
                Vamos entender sua operação e indicar o melhor caminho.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/75">
                Tire dúvidas sobre planos, implantação, cardápio digital, PDV,
                integrações ou suporte. Sua mensagem chega ao time certo.
              </p>
              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {[
                  { icon: Clock, title: "24h úteis", text: "tempo médio de retorno" },
                  { icon: ShieldCheck, title: "Sem spam", text: "uso responsável dos dados" },
                  { icon: Headphones, title: "Time direto", text: "vendas, suporte ou produto" },
                ].map((item) => (
                  <div key={item.title} className="rounded-2xl border border-white/10 bg-white/10 p-4">
                    <item.icon className="mb-2 h-5 w-5 text-orange" />
                    <p className="font-semibold">{item.title}</p>
                    <p className="text-xs text-white/65">{item.text}</p>
                  </div>
                ))}
              </div>
            </div>

            <Card className="border-white/15 bg-white text-navy shadow-2xl">
              <CardContent className="p-6 md:p-8">
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green/10 text-green">
                    <Sparkles className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm text-navy/60">Canal recomendado</p>
                    <h2 className="text-2xl font-semibold">Envie uma mensagem</h2>
                  </div>
                </div>
                <p className="text-navy/65">
                  Quanto mais contexto você trouxer, melhor conseguimos orientar:
                  tipo de estabelecimento, volume de pedidos, canais de venda e
                  o que deseja melhorar primeiro.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="container px-6 mx-auto py-12">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <Card className="text-center border-beige bg-white shadow-sm">
                <CardContent className="pt-6">
                  <div className="bg-green/10 h-12 w-12 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Mail className="h-6 w-6 text-green" />
                  </div>
                  <h3 className="font-semibold text-navy mb-2">Email</h3>
                  <p className="text-navy/70 mb-4">contato@pubfy.com.br</p>
                  <p className="text-sm text-navy/60">Resposta em até 24 horas</p>
                </CardContent>
              </Card>
              
              <Card className="text-center border-beige bg-white shadow-sm">
                <CardContent className="pt-6">
                  <div className="bg-green/10 h-12 w-12 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Phone className="h-6 w-6 text-green" />
                  </div>
                  <h3 className="font-semibold text-navy mb-2">Telefone</h3>
                  <p className="text-navy/70 mb-4">(11) 4321-1234</p>
                  <p className="text-sm text-navy/60">Seg-Sex: 9h às 18h</p>
                </CardContent>
              </Card>
              
              <Card className="text-center border-beige bg-white shadow-sm">
                <CardContent className="pt-6">
                  <div className="bg-green/10 h-12 w-12 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MessageCircle className="h-6 w-6 text-green" />
                  </div>
                  <h3 className="font-semibold text-navy mb-2">Chat ao Vivo</h3>
                  <p className="text-navy/70 mb-4">Atendimento online</p>
                  <p className="text-sm text-navy/60">Disponível para clientes</p>
                </CardContent>
              </Card>
            </div>

            {!enviado ? (
              <Card className="border-beige bg-white shadow-xl">
                <CardHeader>
                  <CardTitle className="text-2xl text-navy">Conte um pouco sobre sua necessidade</CardTitle>
                  <CardDescription>
                    O formulário direciona sua solicitação para o time correto.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="nome">Nome completo</Label>
                        <Input
                          id="nome"
                          value={nome}
                          onChange={(e) => setNome(e.target.value)}
                          placeholder="Seu nome"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="voce@empresa.com"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="telefone">Telefone</Label>
                        <Input
                          id="telefone"
                          value={telefone}
                          onChange={(e) => setTelefone(e.target.value)}
                          placeholder="(11) 99999-9999"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Assunto</Label>
                        <RadioGroup 
                          value={assunto} 
                          onValueChange={setAssunto}
                          className="flex flex-wrap gap-4"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="suporte" id="suporte" />
                            <Label htmlFor="suporte">Suporte</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="vendas" id="vendas" />
                            <Label htmlFor="vendas">Vendas</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="outro" id="outro" />
                            <Label htmlFor="outro">Outro</Label>
                          </div>
                        </RadioGroup>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="mensagem">Mensagem</Label>
                      <Textarea
                        id="mensagem"
                        value={mensagem}
                        onChange={(e) => setMensagem(e.target.value)}
                        placeholder="Ex.: Tenho um restaurante com delivery e salão. Quero entender como organizar cardápio, pedidos e pagamentos em um único lugar..."
                        rows={5}
                        required
                      />
                    </div>

                    <div className="text-sm text-navy/60">
                      Ao enviar este formulário, você concorda com nossa{" "}
                      <a href="/privacidade" className="text-green underline-offset-4 hover:underline">
                        política de privacidade
                      </a>
                      .
                    </div>

                    <TurnstileWidget
                      action="contact_form"
                      onToken={setCaptchaToken}
                      className="min-h-[65px]"
                    />

                    <Button
                      type="submit"
                      className="bg-green hover:bg-green-dark text-white"
                      disabled={loading || !captchaToken}
                    >
                      {loading ? "Enviando..." : "Enviar mensagem"}
                      {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-beige bg-white shadow-xl">
                <CardContent className="pt-6">
                  <div className="text-center space-y-4 py-12">
                    <div className="bg-green/10 h-20 w-20 rounded-full flex items-center justify-center mx-auto">
                      <Check className="h-10 w-10 text-green" />
                    </div>
                    <h2 className="text-2xl font-bold text-navy">Mensagem enviada com sucesso!</h2>
                    <p className="text-navy/70 max-w-lg mx-auto">
                      Agradecemos o seu contato. Nossa equipe analisará sua mensagem e responderá o mais breve possível.
                    </p>
                    <Button 
                      onClick={() => setEnviado(false)} 
                      variant="outline" 
                      className="mt-6"
                    >
                      Enviar nova mensagem
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
    </>
  );
};

export default Contato;
