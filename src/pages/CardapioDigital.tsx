import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { PublicSeo } from "@/components/seo/PublicSeo";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Image,
  Palette,
  QrCode,
  Smartphone,
  Tags,
} from "lucide-react";

const highlights = [
  {
    icon: QrCode,
    title: "QR Code pronto para mesas e delivery",
    description: "Publique o cardapio e compartilhe o link ou QR Code em poucos minutos.",
  },
  {
    icon: Palette,
    title: "Temas por segmento",
    description: "Escolha layouts visuais para pizzaria, hamburgueria, acai, cafeteria e outros formatos.",
  },
  {
    icon: Tags,
    title: "Promocoes e cupons",
    description: "Crie ofertas e cupons para aumentar recorrencia e incentivar pedidos maiores.",
  },
  {
    icon: Clock,
    title: "Horario de funcionamento",
    description: "Mostre quando o restaurante esta aberto e evite pedidos fora da operacao.",
  },
];

const checklist = [
  "Produtos com fotos, categorias, descricoes e precos atualizados",
  "Pedido pelo celular com experiencia pensada para o cliente final",
  "Personalizacao visual para aproximar o cardapio da sua marca",
  "Promocoes, cupons e destaques para vender itens estrategicos",
  "Link publico para divulgar em Instagram, WhatsApp e materiais impressos",
  "Gestao integrada com produtos, pedidos e relatorios do Pubfy",
];

const CardapioDigital = () => {
  return (
    <>
    <PublicSeo
      title="Cardápio digital e QR Code | Pubfy"
      description="Publique cardápio público com tema da sua marca, QR Code na mesa ou delivery, fotos, categorias, horário e integração com pedidos no Pubfy."
      path="/cardapio-digital"
    />
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow pt-24">
        <section className="bg-offwhite py-16 md:py-24">
          <div className="container mx-auto px-6">
            <div className="grid gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full bg-green/10 px-4 py-2 text-sm font-semibold text-green">
                  <Smartphone size={16} />
                  Solucao para vender pelo celular
                </span>
                <h1 className="mt-5 text-4xl font-bold leading-tight text-navy md:text-6xl">
                  Cardapio digital que transforma consulta em pedido.
                </h1>
                <p className="mt-6 max-w-2xl text-lg leading-relaxed text-navy/70">
                  Mostre seus produtos com foto, organize categorias, publique promocoes e permita que o cliente peca pelo QR Code sem baixar aplicativo.
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Link to="/teste-gratis">
                    <Button size="lg" className="h-12 w-full bg-green px-7 text-white hover:bg-green-dark sm:w-auto">
                      Criar meu cardapio
                      <ArrowRight size={18} className="ml-2" />
                    </Button>
                  </Link>
                  <Link to="/demonstracao">
                    <Button size="lg" variant="outline" className="h-12 w-full border-navy/20 text-navy hover:bg-navy/5 sm:w-auto">
                      Ver demonstracao
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="relative">
                <div
                  className="absolute inset-x-8 top-6 h-40 rounded-lg bg-cover bg-center"
                  style={{
                    backgroundImage:
                      "linear-gradient(180deg, rgba(61,64,91,0.05), rgba(61,64,91,0.65)), url('https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=900&q=85')",
                  }}
                />
                <div className="relative mx-auto max-w-sm rounded-[2rem] border-[10px] border-navy bg-white shadow-2xl">
                  <div className="rounded-[1.35rem] bg-white p-4">
                    <div className="overflow-hidden rounded-lg bg-navy text-white">
                      <div className="h-36 bg-[url('https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=700&q=85')] bg-cover bg-center" />
                      <div className="p-4">
                        <p className="text-xs uppercase tracking-wide text-white/60">Cardapio Pubfy</p>
                        <h2 className="mt-1 text-xl font-bold">Pizzaria da Vila</h2>
                        <div className="mt-3 flex gap-2 text-xs">
                          <span className="rounded-md bg-green px-2 py-1">Aberto</span>
                          <span className="rounded-md bg-white/10 px-2 py-1">Entrega 35 min</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 flex gap-2 overflow-hidden text-xs font-medium text-navy">
                      {["Pizzas", "Bebidas", "Combos"].map((item, index) => (
                        <span key={item} className={`rounded-md px-3 py-2 ${index === 0 ? "bg-orange text-white" : "bg-offwhite"}`}>
                          {item}
                        </span>
                      ))}
                    </div>
                    <div className="mt-4 space-y-3">
                      {[
                        ["Margherita", "Molho, mussarela, tomate e manjericao", "R$ 42,90"],
                        ["Combo familia", "Pizza grande + refrigerante", "R$ 64,90"],
                        ["Cupom PUBFY10", "10% de desconto no primeiro pedido", "Ativo"],
                      ].map(([name, description, price]) => (
                        <div key={name} className="flex gap-3 rounded-lg border border-gray-100 p-3">
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-offwhite text-orange">
                            <Image size={20} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-navy">{name}</p>
                            <p className="mt-1 truncate text-xs text-navy/60">{description}</p>
                            <p className="mt-2 text-sm font-bold text-green">{price}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="absolute -bottom-4 left-2 rounded-lg bg-white p-4 shadow-xl">
                  <QrCode className="h-9 w-9 text-navy" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white py-16 md:py-24">
          <div className="container mx-auto px-6">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-3xl font-bold text-navy md:text-4xl">Uma experiencia melhor para quem escolhe e para quem atende</h2>
              <p className="mt-4 text-lg text-navy/70">
                O cardapio deixa de ser so uma lista de produtos e vira um canal de venda organizado.
              </p>
            </div>
            <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              {highlights.map((item) => (
                <article key={item.title} className="rounded-lg border border-navy/10 bg-offwhite p-6">
                  <item.icon className="h-9 w-9 text-green" />
                  <h3 className="mt-5 text-lg font-semibold text-navy">{item.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-navy/70">{item.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-offwhite py-16">
          <div className="container mx-auto px-6">
            <div className="grid gap-10 rounded-lg bg-white p-7 shadow-lg md:grid-cols-[0.9fr_1.1fr] md:p-10">
              <div>
                <h2 className="text-2xl font-bold text-navy md:text-3xl">O que fica pronto no cardapio digital</h2>
                <p className="mt-4 text-navy/70">
                  Ideal para restaurantes que querem reduzir atrito no atendimento e vender melhor os produtos do menu.
                </p>
                <Link to="/teste-gratis" className="mt-6 inline-flex">
                  <Button className="bg-orange text-white hover:bg-orange/90">Testar por 14 dias</Button>
                </Link>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {checklist.map((item) => (
                  <div key={item} className="flex gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green" />
                    <span className="text-sm leading-relaxed text-navy/75">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
    </>
  );
};

export default CardapioDigital;
