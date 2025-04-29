
import { Button } from "@/components/ui/button";
import { 
  QrCode, ShoppingCart, BarChart3, Smartphone, Clock, Wifi, 
  Printer, CreditCard, Users, Settings, CheckCircle 
} from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const features = [
  {
    title: "Cardápio Digital",
    icon: <QrCode className="h-10 w-10 text-green" />,
    description: "Cardápio digital completo acessível por QR Code, com fotos, descrições e preços atualizados em tempo real.",
    benefits: [
      "Redução de custos com impressão",
      "Atualizações instantâneas",
      "Layout personalizado com sua marca",
      "Categorias organizadas",
      "Fotos dos produtos"
    ]
  },
  {
    title: "PDV Online",
    icon: <ShoppingCart className="h-10 w-10 text-green" />,
    description: "Ponto de venda online completo, acessível de qualquer dispositivo com internet, sem precisar instalar nada.",
    benefits: [
      "Gerenciamento de mesas e comandas",
      "Controle de pedidos em tempo real",
      "Interface intuitiva e rápida",
      "Funcionamento em tablets e smartphones",
      "Múltiplos operadores simultâneos"
    ]
  },
  {
    title: "Relatórios Gerenciais",
    icon: <BarChart3 className="h-10 w-10 text-green" />,
    description: "Relatórios completos de vendas, produtos mais vendidos, horários de pico e desempenho financeiro.",
    benefits: [
      "Vendas por período e produto",
      "Ticket médio e análise de consumo",
      "Exportação em Excel e PDF",
      "Gráficos visuais interativos",
      "Insights para tomada de decisões"
    ]
  },
  {
    title: "App para Clientes",
    icon: <Smartphone className="h-10 w-10 text-green" />,
    description: "Seus clientes podem fazer pedidos diretamente pelo celular, sem precisar chamar o garçom.",
    benefits: [
      "Pedidos direto da mesa",
      "Sistema de fidelidade",
      "Avaliações e feedback",
      "Histórico de pedidos",
      "Promoções personalizadas"
    ]
  },
  {
    title: "Operação Rápida",
    icon: <Clock className="h-10 w-10 text-green" />,
    description: "Interface desenvolvida para operações rápidas em horários de pico, reduzindo tempo de atendimento.",
    benefits: [
      "Atalhos de teclado configuráveis",
      "Produtos favoritos em destaque",
      "Busca rápida de itens",
      "Combos e promoções pré-configurados",
      "Divisão de contas automática"
    ]
  },
  {
    title: "Modo Offline",
    icon: <Wifi className="h-10 w-10 text-green" />,
    description: "Continue vendendo mesmo se sua internet cair. O sistema sincroniza automaticamente quando a conexão voltar.",
    benefits: [
      "Funcionamento sem internet",
      "Sincronização automática",
      "Backup local de segurança",
      "Proteção contra perda de dados",
      "Operação contínua em qualquer situação"
    ]
  },
  {
    title: "Integração com Impressoras",
    icon: <Printer className="h-10 w-10 text-green" />,
    description: "Conecte-se facilmente com impressoras térmicas para imprimir comandas, pedidos e comprovantes.",
    benefits: [
      "Compatível com principais modelos",
      "Impressão de QR Code para pagamento",
      "Configuração de vias e tamanhos",
      "Envio para múltiplas impressoras",
      "Logotipo personalizado nos comprovantes"
    ]
  },
  {
    title: "Pagamentos Integrados",
    icon: <CreditCard className="h-10 w-10 text-green" />,
    description: "Aceite pagamentos em cartão, PIX e outros métodos diretamente pelo sistema.",
    benefits: [
      "Integração com principais gateways",
      "Geração de QR Code PIX",
      "Divisão de pagamentos",
      "Controle de gorjetas",
      "Fechamento de caixa automático"
    ]
  },
  {
    title: "Gerenciamento de Equipe",
    icon: <Users className="h-10 w-10 text-green" />,
    description: "Controle de usuários com diferentes níveis de acesso e registro de ações por colaborador.",
    benefits: [
      "Permissões configuráveis",
      "Registro de ações por usuário",
      "Controle de comissões",
      "Relatório de produtividade",
      "Login por código ou senha"
    ]
  },
  {
    title: "Personalizável",
    icon: <Settings className="h-10 w-10 text-green" />,
    description: "Adapte o sistema às necessidades específicas do seu estabelecimento com configurações flexíveis.",
    benefits: [
      "Personalização de interface",
      "Categorias e produtos personalizados",
      "Regras de negócio configuráveis",
      "Adaptável a diferentes segmentos",
      "Atualizações constantes"
    ]
  }
];

const Funcionalidades = () => {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-grow">
        {/* Hero section */}
        <section className="bg-offwhite py-16 md:py-24">
          <div className="container mx-auto px-6">
            <div className="text-center max-w-3xl mx-auto">
              <h1 className="text-3xl md:text-4xl font-bold text-navy mb-6">
                Tudo que você precisa para gerenciar seu estabelecimento
              </h1>
              <p className="text-lg text-navy/70 mb-8">
                O CardápioPronto oferece uma solução completa para restaurantes, bares, cafeterias e outros estabelecimentos do setor alimentício.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/demonstracao">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto">
                    Ver demonstração
                  </Button>
                </Link>
                <Link to="/teste-gratis">
                  <Button size="lg" className="bg-green hover:bg-green-dark text-white w-full sm:w-auto">
                    Começar teste grátis
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
        
        {/* Principais funcionalidades */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-12">
              {features.map((feature, index) => (
                <div key={index} className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                  <div className="mb-4">{feature.icon}</div>
                  <h3 className="text-xl font-semibold text-navy mb-3">{feature.title}</h3>
                  <p className="text-navy/70 mb-6">{feature.description}</p>
                  
                  <h4 className="text-sm font-semibold text-navy mb-3">Benefícios:</h4>
                  <ul className="space-y-2">
                    {feature.benefits.map((benefit, idx) => (
                      <li key={idx} className="flex items-start">
                        <CheckCircle className="text-green shrink-0 mr-2 mt-0.5" size={16} />
                        <span className="text-sm text-navy/80">{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>
        
        {/* CTA Section */}
        <section className="bg-green py-16">
          <div className="container mx-auto px-6">
            <div className="bg-white rounded-xl p-8 md:p-12 shadow-lg">
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold text-navy mb-4">
                    Experimente todas as funcionalidades gratuitamente
                  </h2>
                  <p className="text-navy/70 mb-6">
                    Acesso completo a todas as ferramentas por 14 dias, sem necessidade de cartão de crédito.
                    Veja como o CardápioPronto pode transformar seu negócio.
                  </p>
                  <Link to="/teste-gratis">
                    <Button size="lg" className="bg-orange hover:bg-orange/90 text-white px-8">
                      Iniciar teste grátis
                    </Button>
                  </Link>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-offwhite rounded-lg p-4 text-center">
                    <h3 className="font-semibold text-navy mb-1">14 dias</h3>
                    <p className="text-sm text-navy/70">de teste grátis</p>
                  </div>
                  <div className="bg-offwhite rounded-lg p-4 text-center">
                    <h3 className="font-semibold text-navy mb-1">Completo</h3>
                    <p className="text-sm text-navy/70">sem limitações</p>
                  </div>
                  <div className="bg-offwhite rounded-lg p-4 text-center">
                    <h3 className="font-semibold text-navy mb-1">Sem cartão</h3>
                    <p className="text-sm text-navy/70">de crédito</p>
                  </div>
                  <div className="bg-offwhite rounded-lg p-4 text-center">
                    <h3 className="font-semibold text-navy mb-1">Suporte</h3>
                    <p className="text-sm text-navy/70">personalizado</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Funcionalidades;
