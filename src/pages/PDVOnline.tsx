import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { PublicSeo } from "@/components/seo/PublicSeo";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  CreditCard,
  Monitor,
  Printer,
  ReceiptText,
  ShoppingCart,
  Utensils,
} from "lucide-react";

const advantages = [
  {
    icon: Utensils,
    title: "Mesas e comandas",
    description: "Acompanhe pedidos por mesa, area, delivery ou retirada sem perder o contexto da operacao.",
  },
  {
    icon: Clock,
    title: "Fila em tempo real",
    description: "Entenda o que e novo, o que esta preparando e o que ja esta pronto para entregar.",
  },
  {
    icon: Printer,
    title: "Impressao de pedidos",
    description: "Use modelos de impressao para levar pedidos ate cozinha, copa ou caixa com mais clareza.",
  },
  {
    icon: CreditCard,
    title: "Fluxo de pagamento",
    description: "Organize o fechamento e reduza a troca de informacao solta entre atendimento e caixa.",
  },
];

const included = [
  "Lancamento rapido de produtos no pedido",
  "Historico de pedidos e acompanhamento de status",
  "Organizacao por mesas, areas, delivery e retirada",
  "Comanda visual com itens, quantidades e observacoes",
  "Base integrada com produtos e categorias do cardapio",
  "Relatorios para acompanhar vendas e produtos populares",
];

const PDVOnline = () => {
  return (
    <>
    <PublicSeo
      title="PDV online para restaurantes | Pubfy"
      description="Ponto de venda no navegador: mesas e comandas, fila de pedidos, impressão para cozinha e fluxo de pagamento integrado ao cardápio digital."
      path="/pdv-online"
    />
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow pt-24">
        <section className="bg-navy py-16 text-white md:py-24">
          <div className="container mx-auto px-6">
            <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-green-light">
                  <Monitor size={16} />
                  PDV pelo navegador
                </span>
                <h1 className="mt-5 text-4xl font-bold leading-tight md:text-6xl">
                  PDV online para o salao e delivery rodarem juntos.
                </h1>
                <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/75">
                  Registre pedidos, acompanhe mesas, organize a fila de preparo e mantenha a equipe alinhada em tempo real, sem instalar sistema local.
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Link to="/teste-gratis">
                    <Button size="lg" className="h-12 w-full bg-orange px-7 text-white hover:bg-orange/90 sm:w-auto">
                      Testar PDV agora
                      <ArrowRight size={18} className="ml-2" />
                    </Button>
                  </Link>
                  <Link to="/demonstracao">
                    <Button size="lg" variant="outline" className="h-12 w-full border-white/60 bg-white/10 text-white hover:bg-white/20 sm:w-auto">
                      Ver demonstracao
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="overflow-hidden rounded-lg bg-white text-navy shadow-2xl shadow-black/25">
                <div className="flex items-center justify-between border-b border-gray-100 bg-offwhite px-5 py-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-navy/50">PDV Pubfy</p>
                    <p className="font-semibold">Operacao de hoje</p>
                  </div>
                  <span className="rounded-md bg-green px-3 py-1 text-xs font-semibold text-white">Online</span>
                </div>
                <div className="grid md:grid-cols-[0.72fr_1.28fr]">
                  <div className="border-b border-gray-100 p-5 md:border-b-0 md:border-r">
                    <p className="mb-4 text-sm font-semibold">Mesas abertas</p>
                    <div className="grid grid-cols-2 gap-3">
                      {["01", "04", "08", "12", "15", "20"].map((mesa, index) => (
                        <div key={mesa} className={`rounded-md p-3 text-center ${index % 3 === 0 ? "bg-orange/10 text-orange" : "bg-green/10 text-green"}`}>
                          <p className="text-xs">Mesa</p>
                          <p className="text-xl font-bold">{mesa}</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-5 rounded-md bg-navy p-4 text-white">
                      <p className="text-sm font-semibold">Resumo</p>
                      <div className="mt-3 space-y-2 text-sm text-white/75">
                        <div className="flex justify-between"><span>Pedidos</span><strong className="text-white">48</strong></div>
                        <div className="flex justify-between"><span>Em preparo</span><strong className="text-white">9</strong></div>
                        <div className="flex justify-between"><span>Ticket medio</span><strong className="text-white">R$ 38,40</strong></div>
                      </div>
                    </div>
                  </div>
                  <div className="p-5">
                    <div className="mb-4 flex items-center justify-between">
                      <p className="font-semibold">Fila de preparo</p>
                      <ReceiptText className="h-5 w-5 text-orange" />
                    </div>
                    <div className="space-y-3">
                      {[
                        ["#1048", "Mesa 08", "Combo burger, batata e refri", "Preparando", "bg-orange/10 text-orange"],
                        ["#1049", "Delivery", "Pizza portuguesa grande", "Novo", "bg-green/10 text-green"],
                        ["#1050", "Retirada", "2 acais medios", "Pronto", "bg-navy/10 text-navy"],
                        ["#1051", "Mesa 12", "Porcao, suco e sobremesa", "Confirmar", "bg-beige/40 text-navy"],
                      ].map(([code, source, items, status, color]) => (
                        <div key={code} className="flex items-center justify-between gap-4 rounded-md border border-gray-100 p-3">
                          <div>
                            <p className="font-semibold text-navy">{code} - {source}</p>
                            <p className="mt-1 text-xs text-navy/60">{items}</p>
                          </div>
                          <span className={`shrink-0 rounded-md px-3 py-1 text-xs font-semibold ${color}`}>{status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white py-16 md:py-24">
          <div className="container mx-auto px-6">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-3xl font-bold text-navy md:text-4xl">Menos anotacao solta, mais operacao acompanhavel</h2>
              <p className="mt-4 text-lg text-navy/70">
                O PDV concentra o que a equipe precisa ver para atender com velocidade e reduzir erro.
              </p>
            </div>
            <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              {advantages.map((item) => (
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
                <span className="inline-flex items-center gap-2 rounded-full bg-orange/10 px-4 py-2 text-sm font-semibold text-orange">
                  <ShoppingCart size={16} />
                  Fluxo de pedido completo
                </span>
                <h2 className="mt-5 text-2xl font-bold text-navy md:text-3xl">Funcionalidades que fazem diferenca no horario de pico</h2>
                <p className="mt-4 text-navy/70">
                  O objetivo e deixar o pedido claro desde o atendimento ate a entrega.
                </p>
                <Link to="/teste-gratis" className="mt-6 inline-flex">
                  <Button className="bg-green text-white hover:bg-green-dark">Comecar teste gratis</Button>
                </Link>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {included.map((item) => (
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

export default PDVOnline;
