
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { Calendar as CalendarIcon, Check } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const Demonstracao = () => {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [estabelecimento, setEstabelecimento] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [data, setData] = useState<Date | undefined>(undefined);
  const [enviado, setEnviado] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Simulação de envio do formulário
    setTimeout(() => {
      setEnviado(true);
      toast({
        title: "Solicitação enviada",
        description: "Entraremos em contato em breve para agendar sua demonstração!",
      });
    }, 1500);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-grow bg-offwhite py-12">
        <div className="container px-6 mx-auto">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl md:text-4xl font-bold text-navy mb-4">
              Agende uma demonstração gratuita
            </h1>
            <p className="text-lg text-navy/70 mb-8">
              Veja em primeira mão como o CardápioPronto pode transformar o dia a dia do seu estabelecimento.
            </p>

            {!enviado ? (
              <Card>
                <CardHeader>
                  <CardTitle>Preencha seus dados</CardTitle>
                  <CardDescription>
                    Nossa equipe entrará em contato para confirmar o horário da demonstração.
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
                        <Label htmlFor="estabelecimento">Nome do estabelecimento</Label>
                        <Input
                          id="estabelecimento"
                          value={estabelecimento}
                          onChange={(e) => setEstabelecimento(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Data preferencial</Label>
                      <div className="border rounded-md p-4">
                        <Calendar
                          mode="single"
                          selected={data}
                          onSelect={setData}
                          className="mx-auto"
                          disabled={(date) => {
                            // Desabilita fins de semana e datas passadas
                            const day = date.getDay();
                            return (
                              date < new Date(new Date().setHours(0, 0, 0, 0)) ||
                              day === 0 ||
                              day === 6
                            );
                          }}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="mensagem">Mensagem (opcional)</Label>
                      <Textarea
                        id="mensagem"
                        value={mensagem}
                        onChange={(e) => setMensagem(e.target.value)}
                        placeholder="Conte-nos um pouco sobre seu estabelecimento e necessidades específicas..."
                        rows={4}
                      />
                    </div>

                    <div className="text-sm text-navy/60">
                      Ao enviar este formulário, você concorda com nossa política de privacidade
                      e termos de uso.
                    </div>

                    <Button type="submit" className="bg-green hover:bg-green-dark text-white w-full">
                      Solicitar demonstração
                    </Button>
                  </form>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center space-y-4 py-8">
                    <div className="bg-green/10 h-20 w-20 rounded-full flex items-center justify-center mx-auto">
                      <Check className="h-10 w-10 text-green" />
                    </div>
                    <h2 className="text-2xl font-bold text-navy">Solicitação recebida</h2>
                    <p className="text-navy/70">
                      Agradecemos seu interesse! Nossa equipe entrará em contato em breve para confirmar os detalhes da sua demonstração.
                    </p>
                    <Separator className="my-6" />
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                      <Link to="/">
                        <Button variant="outline">Voltar à página inicial</Button>
                      </Link>
                      <Link to="/teste-gratis">
                        <Button className="bg-green hover:bg-green-dark text-white">
                          Iniciar teste grátis agora
                        </Button>
                      </Link>
                    </div>
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

export default Demonstracao;
