import { Button } from "@/components/ui/button";
import {
  BarChart3,
  CheckCircle2,
  Gift,
  Mail,
  Megaphone,
  MessageCircle,
  Printer,
  QrCode,
  ReceiptText,
  Settings,
  ShoppingCart,
  Store,
  Tags,
  Users,
  Utensils,
  Wifi,
} from "lucide-react";
import { Link } from "react-router-dom";

const coreFeatures = [
  {
    icon: QrCode,
    title: "Canal próprio por QR Code",
    description: "Cardápio público responsivo, fotos, categorias, temas por segmento, pedidos pelo celular e dados para relacionamento.",
  },
  {
    icon: ShoppingCart,
    title: "PDV online e pedidos",
    description: "Lançamento rápido de pedidos, histórico, comandas, status, badge do pedido atual e operação pelo navegador.",
  },
  {
    icon: Utensils,
    title: "Mesas, áreas e comandas",
    description: "Organize salão por ambientes, acompanhe mesas abertas e reduza atrito entre atendimento, cozinha e caixa.",
  },
  {
    icon: Users,
    title: "CRM e captura de leads",
    description: "Clientes consolidados por telefone, origem, opt-in, recorrência, ticket, tags e histórico de pedidos.",
  },
  {
    icon: Gift,
    title: "Fidelidade e cashback",
    description: "Regras simples de benefício, saldo por cliente, resgate no checkout e estorno quando o pedido é cancelado.",
  },
  {
    icon: Tags,
    title: "Cupons e campanhas automáticas",
    description: "Campanhas por comportamento, cupom rastreável, envio de teste, métricas e automações dentro do módulo de e-mail.",
  },
  {
    icon: MessageCircle,
    title: "Atendimento WhatsApp",
    description: "Instâncias, conversas, templates e automações para responder clientes e acompanhar pedidos em um só lugar.",
  },
  {
    icon: BarChart3,
    title: "Relatórios e desempenho",
    description: "Vendas por período, produtos populares, ticket médio, exportação e comparação entre iFood e canal próprio.",
  },
  {
    icon: Printer,
    title: "Impressão operacional",
    description: "Vias de cozinha, caixa e cliente, templates por finalidade e impressão pós-finalização no PDV.",
  },
  {
    icon: Wifi,
    title: "PWA e offline parcial",
    description: "Aplicação instalável, indicador online/offline, catálogo local do PDV e fila para pedido de balcão quando a conexão cair.",
  },
  {
    icon: Store,
    title: "iFood 2.0",
    description: "App SaaS centralizado, Merchant ID por restaurante, mapeamento de itens, baixa de estoque e relatório por canal.",
  },
  {
    icon: Mail,
    title: "E-mail e Resend",
    description: "Conta Resend por restaurante, templates, logs, testes de envio e campanhas comerciais com controle operacional.",
  },
  {
    icon: Users,
    title: "Equipe e permissões",
    description: "Cadastre funcionários, defina acessos por função e proteja telas sensíveis sem travar a rotina da loja.",
  },
  {
    icon: Settings,
    title: "Configurações e auditoria",
    description: "Dados do estabelecimento, integrações, configurações do sistema e registros de alterações importantes.",
  },
];

const outcomes = [
  "Cliente acessa o cardápio e entra na base própria",
  "Pedido chega no PDV, cozinha ou integração",
  "Campanhas e fidelidade puxam recompra",
  "Gestor compara marketplace e venda direta",
];

const Features = () => {
  return (
    <section className="bg-offwhite pt-28 pb-16 md:pt-32 md:pb-24">
      <div className="container mx-auto px-6">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-green/10 px-4 py-2 text-sm font-semibold text-green">
              <ReceiptText size={16} />
              Plataforma para vender direto e operar melhor
            </span>
            <h2 className="mt-5 text-3xl font-bold leading-tight text-navy md:text-5xl">
              O Pubfy já nasce para conectar venda, operação e relacionamento.
            </h2>
          </div>
          <p className="text-lg leading-relaxed text-navy/70">
            Reúna pedidos, cardápio, PDV, mesas, CRM, fidelidade, campanhas, relatórios, equipe, WhatsApp, impressão e iFood em uma experiência simples para operar todos os dias.
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
              Jornada do canal próprio
            </span>
            <h3 className="mt-5 text-2xl font-bold text-navy md:text-3xl">
              Da primeira venda até a recompra sem depender só de marketplace.
            </h3>
            <div className="mt-6 space-y-4">
              {outcomes.map((item, index) => (
                <div key={item} className="flex gap-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-navy text-sm font-bold text-white">
                    {index + 1}
                  </div>
                  <div className="border-b border-gray-100 pb-4">
                    <p className="font-medium text-navy">{item}</p>
                    <p className="mt-1 text-sm text-navy/75">
                      {index === 0 && "Telefone, origem e opt-in ajudam a criar relacionamento."}
                      {index === 1 && "Status, impressão e comandas reduzem ruído na operação."}
                      {index === 2 && "Cupons rastreáveis transformam base própria em receita recorrente."}
                      {index === 3 && "Relatórios mostram onde o restaurante ganha mais margem."}
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
          {["Sem instalação local", "Atualização em tempo real", "Controle por permissões", "Pronto para piloto operacional"].map((item) => (
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
