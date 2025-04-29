
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { Check, Mail, MessageCircle, Phone } from "lucide-react";
import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const Contato = () => {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [assunto, setAssunto] = useState("suporte");
  const [mensagem, setMensagem] = useState("");
  const [enviado, setEnviado] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Simulação de envio do formulário
    setTimeout(() => {
      setEnviado(true);
      toast({
        title: "Mensagem enviada",
        description: "Recebemos sua mensagem e responderemos em breve!",
      });
    }, 1000);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-grow bg-offwhite py-12">
        <div className="container px-6 mx-auto">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-3xl md:text-4xl font-bold text-navy mb-4">
                Entre em contato conosco
              </h1>
              <p className="text-lg text-navy/70 max-w-2xl mx-auto">
                Estamos prontos para ajudar com qualquer dúvida sobre nossos produtos e serviços
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <Card className="text-center">
                <CardContent className="pt-6">
                  <div className="bg-green/10 h-12 w-12 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Mail className="h-6 w-6 text-green" />
                  </div>
                  <h3 className="font-semibold text-navy mb-2">Email</h3>
                  <p className="text-navy/70 mb-4">contato@cardapiopronto.com.br</p>
                  <p className="text-sm text-navy/60">Resposta em até 24 horas</p>
                </CardContent>
              </Card>
              
              <Card className="text-center">
                <CardContent className="pt-6">
                  <div className="bg-green/10 h-12 w-12 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Phone className="h-6 w-6 text-green" />
                  </div>
                  <h3 className="font-semibold text-navy mb-2">Telefone</h3>
                  <p className="text-navy/70 mb-4">(11) 4321-1234</p>
                  <p className="text-sm text-navy/60">Seg-Sex: 9h às 18h</p>
                </CardContent>
              </Card>
              
              <Card className="text-center">
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
              <Card>
                <CardHeader>
                  <CardTitle>Envie uma mensagem</CardTitle>
                  <CardDescription>
                    Preencha o formulário abaixo e entraremos em contato o mais breve possível.
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
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="telefone">Telefone</Label>
                        <Input
                          id="telefone"
                          value={telefone}
                          onChange={(e) => setTelefone(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Assunto</Label>
                        <RadioGroup 
                          value={assunto} 
                          onValueChange={setAssunto}
                          className="flex space-x-4"
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
                        placeholder="Digite sua mensagem aqui..."
                        rows={5}
                        required
                      />
                    </div>

                    <div className="text-sm text-navy/60">
                      Ao enviar este formulário, você concorda com nossa política de privacidade.
                    </div>

                    <Button type="submit" className="bg-green hover:bg-green-dark text-white">
                      Enviar mensagem
                    </Button>
                  </form>
                </CardContent>
              </Card>
            ) : (
              <Card>
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
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Contato;
