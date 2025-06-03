import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { supabase } from "@/lib/supabase";

const Demonstracao = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [stablishment, setStablishment] = useState("");
  const [message, setMessage] = useState("");
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [enviado, setEnviado] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Insere no banco
    const { error } = await supabase.from("demos").insert([
      {
        name,
        email,
        phone,
        stablishment,
        message,
        date: date ? date.toISOString() : null,
        created_at: new Date().toISOString(),
      },
    ]);

    if (error) {
      toast({
        title: "Erro ao enviar solicitação",
        description: "Tente novamente mais tarde.",
        variant: "destructive",
      });
      return;
    }

    // 2. Chama a Edge Function para enviar o e-mail
    const response = await fetch(
      "https://jyrfjvyeikhqpuwcvdff.supabase.co/functions/v1/send-email",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone,
          stablishment,
          date: date ? date.toISOString() : null,
          message,
        }),
      }
    );

    if (!response.ok) {
      toast({
        title: "Solicitação salva, mas houve erro ao enviar o e-mail",
        description: "Tente novamente mais tarde.",
        variant: "destructive",
      });
      return;
    }

    setEnviado(true);
    toast({
      title: "Solicitação enviada",
      description:
        "Entraremos em contato em breve para agendar sua demonstração!",
    });
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
              Veja em primeira mão como o CardápioPronto pode transformar o dia
              a dia do seu estabelecimento.
            </p>

            {!enviado ? (
              <Card>
                <CardHeader>
                  <CardTitle>Preencha seus dados</CardTitle>
                  <CardDescription>
                    Nossa equipe entrará em contato para confirmar o horário da
                    demonstração.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="name">Nome completo</Label>
                        <Input
                          id="name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
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
                        <Label htmlFor="phone">Telefone</Label>
                        <Input
                          id="phone"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="stablishment">
                          Nome do estabelecimento
                        </Label>
                        <Input
                          id="stablishment"
                          value={stablishment}
                          onChange={(e) => setStablishment(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Data preferencial</Label>
                      <div className="border rounded-md p-4">
                        <Calendar
                          mode="single"
                          selected={date}
                          onSelect={setDate}
                          className="mx-auto"
                          disabled={(date) => {
                            // Desabilita fins de semana e datas passadas
                            const day = date.getDay();
                            return (
                              date <
                                new Date(new Date().setHours(0, 0, 0, 0)) ||
                              day === 0 ||
                              day === 6
                            );
                          }}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="message">Mensagem (opcional)</Label>
                      <Textarea
                        id="message"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Conte-nos um pouco sobre seu estabelecimento e necessidades específicas..."
                        rows={4}
                      />
                    </div>

                    <div className="text-sm text-navy/60">
                      Ao enviar este formulário, você concorda com nossa
                      política de privacidade e termos de uso.
                    </div>

                    <Button
                      type="submit"
                      className="bg-green hover:bg-green-dark text-white w-full"
                    >
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
                    <h2 className="text-2xl font-bold text-navy">
                      Solicitação recebida
                    </h2>
                    <p className="text-navy/70">
                      Agradecemos seu interesse! Nossa equipe entrará em contato
                      em breve para confirmar os detalhes da sua demonstração.
                    </p>
                    <Separator className="my-6" />
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                      <Link to="/">
                        <Button variant="outline">
                          Voltar à página inicial
                        </Button>
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
