import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { PublicSeo } from "@/components/seo/PublicSeo";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  Mail,
  Settings,
  ShieldCheck,
  Store,
  Tags,
  TrendingUp,
  Users,
} from "lucide-react";

const pillars = [
  {
    icon: BarChart3,
    title: "Dashboard e relatórios",
    description: "Acompanhe vendas, ticket médio, produtos populares e desempenho por período.",
  },
  {
    icon: Users,
    title: "Equipe e permissões",
    description: "Defina acessos por perfil e mantenha cada colaborador dentro do que precisa usar.",
  },
  {
    icon: Settings,
    title: "Configurações do restaurante",
    description: "Centralize dados do estabelecimento, operação, integrações e preferências do sistema.",
  },
  {
    icon: ShieldCheck,
    title: "Auditoria e segurança",
    description: "Registre alterações importantes e reduza risco em configurações sensíveis.",
  },
];

const modules = [
  { icon: Tags, label: "Produtos, categorias, cupons e promoções" },
  { icon: Store, label: "Integrações para canais externos e operação digital" },
  { icon: Mail, label: "Campanhas e configurações de e-mail" },
  { icon: CreditCard, label: "Planos, assinaturas e pagamentos" },
  { icon: ClipboardList, label: "Pedidos, mesas, áreas e histórico operacional" },
  { icon: TrendingUp, label: "Análise para decidir quais itens impulsionar" },
];

const GestaoCompleta = () => {
  return (
    <>
    <PublicSeo
      title="Gestão completa para restaurantes | Pubfy"
      description="Dashboard e relatórios, equipe com permissões, produtos e integrações no mesmo ecossistema para decidir com dados e operar com segurança."
      path="/gestao-completa"
    />
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow pt-24">
        <section className="bg-offwhite py-16 md:py-24">
          <div className="container mx-auto px-6">
            <div className="grid gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full bg-green/10 px-4 py-2 text-sm font-semibold text-green">
                  <BarChart3 size={16} />
                  Gestão para crescer com controle
                </span>
                <h1 className="mt-5 text-4xl font-bold leading-tight text-navy md:text-6xl">
                  Veja o restaurante inteiro sem depender de planilhas.
                </h1>
                <p className="mt-6 max-w-2xl text-lg leading-relaxed text-navy/70">
                  O Pubfy conecta pedidos, produtos, equipe, relatórios, configurações, campanhas e integrações para você entender a operação e agir com mais rapidez.
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Link to="/teste-gratis">
                    <Button size="lg" className="h-12 w-full bg-green px-7 text-white hover:bg-green-dark sm:w-auto">
                      Experimentar gestão completa
                      <ArrowRight size={18} className="ml-2" />
                    </Button>
                  </Link>
                  <Link to="/funcionalidades">
                    <Button size="lg" variant="outline" className="h-12 w-full border-navy/20 text-navy hover:bg-navy/5 sm:w-auto">
                      Ver funcionalidades
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="rounded-lg bg-white p-5 shadow-2xl">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-navy/50">Painel executivo</p>
                    <p className="font-semibold text-navy">Visão da operação</p>
                  </div>
                  <span className="rounded-md bg-navy px-3 py-1 text-xs font-semibold text-white">Hoje</span>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  {[
                    ["Vendas", "R$ 4.860", "+18%"],
                    ["Pedidos", "126", "+24"],
                    ["Ticket médio", "R$ 38,57", "+7%"],
                  ].map(([label, value, delta]) => (
                    <div key={label} className="rounded-md border border-gray-100 bg-offwhite p-4">
                      <p className="text-xs text-navy/60">{label}</p>
                      <p className="mt-2 text-2xl font-bold text-navy">{value}</p>
                      <p className="mt-1 text-xs font-semibold text-green">{delta}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-5 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                  <div className="rounded-md border border-gray-100 p-4">
                    <div className="mb-4 flex items-center justify-between">
                      <p className="font-semibold text-navy">Produtos em alta</p>
                      <TrendingUp className="h-5 w-5 text-orange" />
                    </div>
                    <div className="space-y-4">
                      {[
                        ["Combo executivo", "42 pedidos", "86%"],
                        ["Pizza margherita", "31 pedidos", "68%"],
                        ["Suco natural", "24 pedidos", "54%"],
                      ].map(([name, qty, width]) => (
                        <div key={name}>
                          <div className="flex justify-between text-sm">
                            <span className="font-medium text-navy">{name}</span>
                            <span className="text-navy/60">{qty}</span>
                          </div>
                          <div className="mt-2 h-2 rounded-full bg-offwhite">
                            <div className="h-2 rounded-full bg-green" style={{ width }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-md bg-navy p-4 text-white">
                    <p className="font-semibold">Alertas de gestão</p>
                    <div className="mt-4 space-y-3 text-sm">
                      {[
                        "Cupom de almoço gerou 18 pedidos",
                        "3 usuários com permissões atualizadas",
                        "Campanha de e-mail pronta para envio",
                        "Novo pedido integrado ao fluxo",
                      ].map((item) => (
                        <div key={item} className="flex gap-2">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-light" />
                          <span className="text-white/80">{item}</span>
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
              <h2 className="text-3xl font-bold text-navy md:text-4xl">Gestão prática, não burocrática</h2>
              <p className="mt-4 text-lg text-navy/70">
                O Pubfy ajuda o gestor a enxergar prioridades sem sair do fluxo de pedidos e atendimento.
              </p>
            </div>
            <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              {pillars.map((item) => (
                <article key={item.title} className="rounded-lg border border-navy/10 bg-offwhite p-6">
                  <item.icon className="h-9 w-9 text-green" />
                  <h3 className="mt-5 text-lg font-semibold text-navy">{item.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-navy/70">{item.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-navy py-16 text-white">
          <div className="container mx-auto px-6">
            <div className="grid gap-10 md:grid-cols-[0.9fr_1.1fr] md:items-center">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-green-light">
                  <Settings size={16} />
                  Módulos conectados
                </span>
                <h2 className="mt-5 text-3xl font-bold md:text-4xl">Cada área importante conversa com a outra.</h2>
                <p className="mt-4 text-white/70">
                  Em vez de vender telas isoladas, a gestão completa mostra como a operação se conecta: produto vendido, pedido atendido, equipe com acesso correto e indicador atualizado.
                </p>
                <Link to="/teste-gratis" className="mt-7 inline-flex">
                  <Button className="bg-orange text-white hover:bg-orange/90">Começar teste grátis</Button>
                </Link>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {modules.map((item) => (
                  <div key={item.label} className="flex gap-3 rounded-lg border border-white/20 bg-white/10 p-4">
                    <item.icon className="mt-0.5 h-5 w-5 shrink-0 text-green-light" />
                    <span className="text-sm leading-relaxed text-white/80">{item.label}</span>
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

export default GestaoCompleta;
