import { Link } from "react-router-dom";
import { ArrowRight, BarChart3, CheckCircle2, HeartHandshake, ShieldCheck, Sparkles, Utensils } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { PublicSeo } from "@/components/seo/PublicSeo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const principles = [
  {
    icon: Utensils,
    title: "Feito para a rotina real",
    description: "Desenhamos cada fluxo pensando no balcão cheio, na cozinha em movimento e no cliente esperando pelo pedido.",
  },
  {
    icon: ShieldCheck,
    title: "Operação confiável",
    description: "Segurança, permissões, rastreabilidade e consistência de dados são tratados como parte do produto, não como detalhe técnico.",
  },
  {
    icon: BarChart3,
    title: "Gestão que vira ação",
    description: "Relatórios, pedidos, cardápio e atendimento precisam ajudar o restaurante a decidir mais rápido e vender melhor.",
  },
];

const milestones = [
  "Cardápio digital com identidade visual do restaurante",
  "PDV, cozinha e pedidos públicos trabalhando no mesmo fluxo",
  "Integrações com pagamento, e-mail, WhatsApp e iFood em evolução contínua",
  "Base operacional com runbook, QA e monitoramento para go-live",
];

export default function Sobre() {
  return (
    <>
    <PublicSeo
      title="Sobre | Pubfy"
      description="Tecnologia pensada para a rotina de restaurantes: QR Code na mesa, fluxo de pedidos até a cozinha e decisões mais rápidas no dia a dia."
      path="/sobre"
    />
    <div className="flex min-h-screen flex-col bg-offwhite">
      <Navbar />
      <main className="flex-1 pt-24">
        <section className="relative overflow-hidden border-b border-beige bg-gradient-to-br from-navy via-navy to-green/90 text-white">
          <div className="absolute -right-24 top-10 h-72 w-72 rounded-full bg-orange/25 blur-3xl" />
          <div className="absolute -left-24 bottom-0 h-80 w-80 rounded-full bg-green/25 blur-3xl" />
          <div className="container relative mx-auto grid gap-12 px-6 py-20 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              <Badge className="mb-5 border-white/20 bg-white/10 text-white hover:bg-white/15">
                Sobre a Pubfy
              </Badge>
              <h1 className="max-w-3xl text-4xl font-bold tracking-tight md:text-6xl">
                Tecnologia para restaurantes operarem com mais clareza, velocidade e controle.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/80">
                A Pubfy nasceu para simplificar a gestão diária de bares,
                restaurantes e lanchonetes: do QR Code na mesa ao pedido na
                cozinha, do pagamento ao relatório que ajuda a tomar decisão.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link to="/demonstracao">
                  <Button size="lg" className="bg-orange text-white hover:bg-orange/90">
                    Agendar demonstração
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/funcionalidades">
                  <Button size="lg" variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20">
                    Ver funcionalidades
                  </Button>
                </Link>
              </div>
            </div>

            <Card className="border-white/15 bg-white/10 text-white shadow-2xl backdrop-blur">
              <CardContent className="p-6 md:p-8">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange/20">
                    <Sparkles className="h-6 w-6 text-orange" />
                  </div>
                  <div>
                    <p className="text-sm text-white/85">Nossa visão</p>
                    <h2 className="text-2xl font-semibold">Operação digital, atendimento humano.</h2>
                  </div>
                </div>
                <div className="mt-8 space-y-4">
                  {milestones.map((item) => (
                    <div key={item} className="flex gap-3 rounded-xl bg-white/10 p-4">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green" />
                      <p className="text-sm leading-relaxed text-white/85">{item}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="container mx-auto px-6 py-16">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="secondary" className="mb-4">Como pensamos produto</Badge>
            <h2 className="text-3xl font-bold text-navy md:text-4xl">
              Menos complexidade para quem vende comida todos os dias.
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-navy/70">
              Um bom sistema não deve competir com a operação. Ele precisa
              desaparecer no uso, reduzir retrabalho e entregar informação útil
              quando o restaurante mais precisa.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {principles.map((principle) => (
              <Card key={principle.title} className="border-beige bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
                <CardContent className="p-6">
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-green/10 text-green">
                    <principle.icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-semibold text-navy">{principle.title}</h3>
                  <p className="mt-3 leading-relaxed text-navy/65">{principle.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="bg-white">
          <div className="container mx-auto grid gap-10 px-6 py-16 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
            <div>
              <Badge className="mb-4 bg-green/10 text-green hover:bg-green/10">
                Cultura de construção
              </Badge>
              <h2 className="text-3xl font-bold text-navy">
                A Pubfy está sendo construída perto da operação.
              </h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                "Escutamos dores reais de implantação, atendimento, cozinha e gestão.",
                "Priorizamos melhorias que reduzem risco comercial e aumentam previsibilidade.",
                "Tratamos documentação, suporte e monitoramento como parte da experiência.",
                "Evoluímos em ciclos curtos, com atenção a segurança e performance.",
              ].map((item) => (
                <div key={item} className="rounded-2xl border border-beige bg-offwhite p-5">
                  <HeartHandshake className="mb-3 h-5 w-5 text-orange" />
                  <p className="text-sm leading-relaxed text-navy/75">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
    </>
  );
}
