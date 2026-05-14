import { Button } from "@/components/ui/button";
import {
  BarChart3,
  Bot,
  CheckCircle2,
  CreditCard,
  Mail,
  Megaphone,
  MessageCircle,
  QrCode,
  ReceiptText,
  Settings,
  ShoppingCart,
  Store,
  Tags,
  Users,
  Utensils,
} from "lucide-react";
import { Link } from "react-router-dom";

const coreFeatures = [
  {
    icon: QrCode,
    title: "Cardápio digital por QR Code",
    description: "Menu público responsivo, fotos, categorias, temas por segmento, horário de funcionamento e pedidos pelo celular.",
  },
  {
    icon: ShoppingCart,
    title: "PDV online e pedidos",
    description: "Lançamento rápido de pedidos, histórico, comandas, status e operação pelo navegador para salão e delivery.",
  },
  {
    icon: Utensils,
    title: "Mesas, áreas e comandas",
    description: "Organize salão por ambientes, acompanhe mesas abertas e reduza atrito entre atendimento, cozinha e caixa.",
  },
  {
    icon: Tags,
    title: "Produtos, cupons e promoções",
    description: "Controle itens, imagens, categorias, cupons promocionais e campanhas direto no painel administrativo.",
  },
  {
    icon: MessageCircle,
    title: "Atendimento WhatsApp",
    description: "Instâncias, conversas, templates e automações para responder clientes e acompanhar pedidos em um só lugar.",
  },
  {
    icon: BarChart3,
    title: "Relatórios e desempenho",
    description: "Indicadores de vendas, produtos populares, ticket médio, exportação de dados e análise para decidir com clareza.",
  },
  {
    icon: Users,
    title: "Equipe e permissões",
    description: "Cadastre funcionários, defina acessos por função e proteja telas sensíveis sem travar a rotina da loja.",
  },
  {
    icon: CreditCard,
    title: "Assinaturas e pagamentos",
    description: "Planos, período de teste, pagamentos Pix, boleto e cartão com gestão integrada para administradores.",
  },
  {
    icon: Mail,
    title: "Email e campanhas",
    description: "Configurações de e-mail, templates globais, campanhas e operações de disparo para relacionamento com clientes.",
  },
  {
    icon: Bot,
    title: "Automações inteligentes",
    description: "Fluxos para atendimento, mensagens, transcrição e respostas com IA quando a operação precisa ganhar escala.",
  },
  {
    icon: Store,
    title: "Integração iFood",
    description: "Base para eventos e sincronização de pedidos do iFood, aproximando canais externos da gestão central.",
  },
  {
    icon: Settings,
    title: "Configurações e auditoria",
    description: "Dados do estabelecimento, integrações, configurações do sistema e registros de alterações importantes.",
  },
];

const outcomes = [
  "Cliente acessa o cardápio pelo QR Code",
  "Pedido chega no painel e segue para preparo",
  "Equipe acompanha mesa, delivery e WhatsApp",
  "Gestor enxerga vendas, produtos e gargalos",
];

const Features = () => {
  return (
    <section className="bg-offwhite pt-28 pb-16 md:pt-32 md:pb-24">
      <div className="container mx-auto px-6">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-green/10 px-4 py-2 text-sm font-semibold text-green">
              <ReceiptText size={16} />
              Plataforma completa para a rotina real
            </span>
            <h2 className="mt-5 text-3xl font-bold leading-tight text-navy md:text-5xl">
              Todas as funcionalidades importantes aparecem antes do cliente precisar procurar.
            </h2>
          </div>
          <p className="text-lg leading-relaxed text-navy/70">
            Reúna pedidos, cardápio, PDV, mesas, relatórios, equipe, WhatsApp, campanhas, integrações e configurações em uma experiência simples para operar todos os dias.
          </p>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {coreFeatures.map((feature) => (
            <article key={feature.title} className="rounded-lg border border-navy/10 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-md bg-green/10 text-green">
                <feature.icon size={22} />
              </div>
              <h3 className="text-lg font-semibold text-navy">{feature.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-navy/70">{feature.description}</p>
            </article>
          ))}
        </div>

        <div className="mt-14 grid overflow-hidden rounded-lg border border-navy/10 bg-white shadow-lg lg:grid-cols-[0.95fr_1.05fr]">
          <div
            className="min-h-[320px] bg-cover bg-center"
            style={{
              backgroundImage:
                "linear-gradient(180deg, rgba(61,64,91,0.1), rgba(61,64,91,0.5)), url('https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=1200&q=85')",
            }}
            aria-label="Restaurante usando atendimento digital"
          />
          <div className="p-7 md:p-10">
            <span className="inline-flex items-center gap-2 rounded-full bg-orange/10 px-4 py-2 text-sm font-semibold text-orange">
              <Megaphone size={16} />
              Jornada de conversão
            </span>
            <h3 className="mt-5 text-2xl font-bold text-navy md:text-3xl">
              Da primeira leitura do QR Code até a decisão do gestor.
            </h3>
            <div className="mt-6 space-y-4">
              {outcomes.map((item, index) => (
                <div key={item} className="flex gap-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-navy text-sm font-bold text-white">
                    {index + 1}
                  </div>
                  <div className="border-b border-gray-100 pb-4">
                    <p className="font-medium text-navy">{item}</p>
                    <p className="mt-1 text-sm text-navy/60">
                      {index === 0 && "Menos cardápio impresso e mais autonomia para escolher."}
                      {index === 1 && "Mais velocidade no atendimento e menos erro de anotação."}
                      {index === 2 && "Canais diferentes entram em uma rotina mais organizada."}
                      {index === 3 && "Relatórios transformam movimento em decisões práticas."}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to="/funcionalidades">
                <Button variant="outline" className="w-full border-navy/20 text-navy hover:bg-navy/5 sm:w-auto">
                  Ver detalhes
                </Button>
              </Link>
              <Link to="/teste-gratis">
                <Button className="w-full bg-green text-white hover:bg-green-dark sm:w-auto">
                  Testar agora
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-10 grid gap-3 text-sm text-navy/75 md:grid-cols-4">
          {["Sem instalação local", "Atualização em tempo real", "Controle por permissões", "Pronto para crescer"].map((item) => (
            <div key={item} className="flex items-center gap-2">
              <CheckCircle2 size={18} className="shrink-0 text-green" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
