import { Link } from "react-router-dom";
import { ArrowRight, BriefcaseBusiness, Coffee, Compass, Heart, Rocket, UsersRound } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { PublicSeo } from "@/components/seo/PublicSeo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const culture = [
  {
    icon: Compass,
    title: "Clareza antes de pressa",
    description: "Valorizamos decisões bem explicadas, produto coerente e execução responsável.",
  },
  {
    icon: Coffee,
    title: "Respeito pela operação",
    description: "Construímos para restaurantes reais: simples de usar, rápido de aprender e confiável no pico.",
  },
  {
    icon: UsersRound,
    title: "Time pequeno, impacto grande",
    description: "Buscamos pessoas que gostam de resolver problemas de ponta a ponta e aprender com clientes.",
  },
];

export default function Carreiras() {
  return (
    <>
    <PublicSeo
      title="Carreiras | Pubfy"
      description="Conheça a cultura da Pubfy e fique por dentro de futuras vagas em produto, tecnologia e operações para restaurantes."
      path="/carreiras"
    />
    <div className="flex min-h-screen flex-col bg-offwhite">
      <Navbar />
      <main className="flex-1 pt-24">
        <section className="relative overflow-hidden bg-gradient-to-br from-offwhite via-white to-green/10">
          <div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-orange/15 blur-3xl" />
          <div className="container relative mx-auto px-6 py-20 text-center">
            <Badge className="mb-5 bg-navy text-white hover:bg-navy">
              Carreiras na Pubfy
            </Badge>
            <h1 className="mx-auto max-w-4xl text-4xl font-bold tracking-tight text-navy md:text-6xl">
              Estamos preparando o próximo capítulo do time.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-navy/70">
              Ainda não temos vagas abertas publicadas, mas esta página já é o
              ponto oficial para futuras oportunidades. Em breve vamos divulgar
              posições para pessoas que queiram transformar a rotina de
              restaurantes com produto, tecnologia e atendimento.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link to="/contato">
                <Button size="lg" className="bg-green text-white hover:bg-green-dark">
                  Falar com a Pubfy
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/sobre">
                <Button size="lg" variant="outline" className="border-green text-navy hover:bg-green/10">
                  Conhecer a empresa
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-6 py-16">
          <div className="grid gap-6 md:grid-cols-3">
            {culture.map((item) => (
              <Card key={item.title} className="border-beige bg-white shadow-sm">
                <CardContent className="p-6">
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-green/10 text-green">
                    <item.icon className="h-6 w-6" />
                  </div>
                  <h2 className="text-xl font-semibold text-navy">{item.title}</h2>
                  <p className="mt-3 leading-relaxed text-navy/65">{item.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="bg-navy text-white">
          <div className="container mx-auto grid gap-10 px-6 py-16 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <Badge className="mb-4 border-white/20 bg-white/10 text-white hover:bg-white/15">
                Em desenvolvimento
              </Badge>
              <h2 className="text-3xl font-bold md:text-4xl">
                O que vem por aqui
              </h2>
              <p className="mt-4 leading-relaxed text-white/75">
                Vamos abrir vagas com descrição clara de responsabilidades,
                formato de trabalho, processo seletivo e expectativas. Queremos
                que a experiência de candidatura seja tão organizada quanto o
                produto que estamos construindo.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { icon: Rocket, text: "Produto e engenharia para evoluir a plataforma." },
                { icon: Heart, text: "Sucesso do cliente e implantação para restaurantes." },
                { icon: BriefcaseBusiness, text: "Operações e crescimento comercial com método." },
                { icon: UsersRound, text: "Conteúdo e suporte para educação do mercado." },
              ].map((item) => (
                <div key={item.text} className="rounded-2xl border border-white/10 bg-white/10 p-5">
                  <item.icon className="mb-3 h-5 w-5 text-orange" />
                  <p className="text-sm leading-relaxed text-white/80">{item.text}</p>
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
