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
    title: "Cardapio digital por QR Code",
    description: "Menu publico responsivo, fotos, categorias, temas por segmento, horario de funcionamento e pedidos pelo celular.",
  },
  {
    icon: ShoppingCart,
    title: "PDV online e pedidos",
    description: "Lancamento rapido de pedidos, historico, comandas, status e operacao pelo navegador para salao e delivery.",
  },
  {
    icon: Utensils,
    title: "Mesas, areas e comandas",
    description: "Organize salao por ambientes, acompanhe mesas abertas e reduza atrito entre atendimento, cozinha e caixa.",
  },
  {
    icon: Tags,
    title: "Produtos, cupons e promocoes",
    description: "Controle itens, imagens, categorias, cupons promocionais e campanhas direto no painel administrativo.",
  },
  {
    icon: MessageCircle,
    title: "Atendimento WhatsApp",
    description: "Instancias, conversas, templates e automacoes para responder clientes e acompanhar pedidos em um so lugar.",
  },
  {
    icon: BarChart3,
    title: "Relatorios e desempenho",
    description: "Indicadores de vendas, produtos populares, ticket medio, exportacao de dados e analise para decidir com clareza.",
  },
  {
    icon: Users,
    title: "Equipe e permissoes",
    description: "Cadastre funcionarios, defina acessos por funcao e proteja telas sensiveis sem travar a rotina da loja.",
  },
  {
    icon: CreditCard,
    title: "Assinaturas e pagamentos",
    description: "Planos, periodo de teste, pagamentos Pix, boleto e cartao com gestao integrada para administradores.",
  },
  {
    icon: Mail,
    title: "Email e campanhas",
    description: "Configuracoes de email, templates globais, campanhas e operacoes de disparo para relacionamento com clientes.",
  },
  {
    icon: Bot,
    title: "Automacoes inteligentes",
    description: "Fluxos para atendimento, mensagens, transcricao e respostas com IA quando a operacao precisa ganhar escala.",
  },
  {
    icon: Store,
    title: "Integracao iFood",
    description: "Base para eventos e sincronizacao de pedidos do iFood, aproximando canais externos da gestao central.",
  },
  {
    icon: Settings,
    title: "Configuracoes e auditoria",
    description: "Dados do estabelecimento, integracoes, configuracoes do sistema e registros de alteracoes importantes.",
  },
];

const outcomes = [
  "Cliente acessa o cardapio pelo QR Code",
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
            Reuna pedidos, cardapio, PDV, mesas, relatorios, equipe, WhatsApp, campanhas, integracoes e configuracoes em uma experiencia simples para operar todos os dias.
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
              Jornada de conversao
            </span>
            <h3 className="mt-5 text-2xl font-bold text-navy md:text-3xl">
              Da primeira leitura do QR Code ate a decisao do gestor.
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
                      {index === 0 && "Menos cardapio impresso e mais autonomia para escolher."}
                      {index === 1 && "Mais velocidade no atendimento e menos erro de anotacao."}
                      {index === 2 && "Canais diferentes entram em uma rotina mais organizada."}
                      {index === 3 && "Relatorios transformam movimento em decisoes praticas."}
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
          {["Sem instalacao local", "Atualizacao em tempo real", "Controle por permissoes", "Pronto para crescer"].map((item) => (
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
