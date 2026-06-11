
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { PublicSeo } from "@/components/seo/PublicSeo";
import { useActivePlan } from "@/hooks/useActivePlan";
import { DEFAULT_TRIAL_DAYS, formatTrialDurationText } from "@/lib/trialDays";

const buildFaqs = (trialDays: number) => [
  {
    question: "Quanto tempo dura o período de teste grátis?",
    answer: trialDays > 0
      ? `O período de teste grátis do Pubfy dura ${formatTrialDurationText(trialDays)}, sem necessidade de cartão de crédito. Durante este período, você tem acesso completo a todas as funcionalidades da plataforma.`
      : "No momento, o período de teste grátis está desativado. Você pode criar a conta e ativar o plano pelo painel de assinaturas."
  },
  {
    question: "Preciso instalar algum software no meu computador?",
    answer: "Não, o Pubfy é uma aplicação web baseada em nuvem. Você só precisa de um navegador moderno e acesso à internet para utilizar todas as funcionalidades."
  },
  {
    question: "Como funciona o cardápio digital via QR Code?",
    answer: "Nós geramos um QR Code único para o seu estabelecimento. Seus clientes podem escanear este código com a câmera do smartphone e acessar o cardápio digital completo, sem precisar baixar nenhum aplicativo."
  },
  {
    question: "Posso personalizar as cores e logo do meu cardápio digital?",
    answer: "Sim! O Pubfy permite personalizar as cores do seu cardápio digital e adicionar sua logo, mantendo a identidade visual do seu estabelecimento."
  },
  {
    question: "O sistema funciona offline?",
    answer: "O Pubfy funciona melhor com internet, mas o PWA mantém a interface carregável após o primeiro acesso e o PDV já permite salvar pedidos de balcão offline para sincronizar quando a conexão voltar. Pedidos de mesa, pagamentos online, WhatsApp, iFood, relatórios e configurações continuam exigindo conexão."
  },
  {
    question: "Quais métodos de pagamento são aceitos para a assinatura?",
    answer: "Aceitamos pagamentos por cartão de crédito, boleto bancário e PIX para todas as assinaturas."
  },
  {
    question: "Posso mudar de plano depois de assinar?",
    answer: "Sim, você pode fazer upgrade ou downgrade do seu plano a qualquer momento. Se fizer upgrade, o valor será proporcional ao tempo restante da sua assinatura atual. Para downgrade, a mudança ocorrerá ao final do período atual."
  },
  {
    question: "O sistema se integra com impressoras térmicas?",
    answer: "Sim, o Pubfy se integra com a maioria das impressoras térmicas compatíveis com ESC/POS. Nos planos Profissional e Enterprise, oferecemos suporte para configuração das impressoras."
  },
  {
    question: "É possível controlar o estoque dos produtos?",
    answer: "Sim. O controle de estoque é opcional: o restaurante pode ativar o módulo e escolher quais produtos serão rastreados. Produtos sem controle continuam vendendo normalmente; produtos rastreados podem aparecer como esgotados no cardápio e bloquear vendas sem saldo."
  },
  {
    question: "Pedidos do iFood baixam estoque automaticamente?",
    answer: "No MVP, pedidos importados do iFood não baixam estoque por produto enquanto não houver mapeamento entre o item do marketplace e o produto interno. A reconciliação pode ser feita por ajuste manual de estoque, e a baixa automática fica para a etapa de integração com SKU/mapeamento."
  },
  {
    question: "Como funciona o suporte técnico?",
    answer: "Todos os planos incluem suporte por email e chat. O plano Enterprise conta com suporte prioritário 24/7 por telefone, email e chat."
  }
];

const FaqPage = () => {
  const { plan } = useActivePlan();
  const trialDays = plan?.trial_days ?? DEFAULT_TRIAL_DAYS;
  const faqs = buildFaqs(trialDays);

  return (
    <>
    <PublicSeo
      title="FAQ | Pubfy"
      description="Respostas sobre teste grátis, cardápio digital, QR Code, personalização e suporte do Pubfy."
      path="/faq"
    />
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-grow bg-offwhite py-12">
        <div className="container px-6 mx-auto">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-3xl md:text-4xl font-bold text-navy mb-4">
              Perguntas frequentes
            </h1>
            <p className="text-lg text-navy/70 mb-8">
              Encontre respostas para as dúvidas mais comuns sobre o Pubfy.
            </p>

            <Accordion type="single" collapsible className="space-y-4">
              {faqs.map((faq, index) => (
                <AccordionItem 
                  key={index} 
                  value={`item-${index}`}
                  className="bg-white rounded-lg shadow-sm"
                >
                  <AccordionTrigger className="px-4 py-4 hover:no-underline">
                    <span className="text-left font-medium">{faq.question}</span>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4 pt-1 text-navy/70">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>

            <div className="mt-12 bg-white p-6 rounded-lg shadow-sm">
              <h2 className="text-xl font-semibold text-navy mb-4">
                Ainda tem dúvidas?
              </h2>
              <p className="text-navy/70 mb-6">
                Nossa equipe de suporte está pronta para ajudar com qualquer dúvida adicional que você possa ter.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button variant="outline" className="flex-1">
                  <Link to="/contato" className="w-full h-full flex items-center justify-center">
                    Falar com suporte
                  </Link>
                </Button>
                <Button className="bg-green hover:bg-green-dark text-white flex-1">
                  <Link to="/teste-gratis" className="w-full h-full flex items-center justify-center">
                    {trialDays > 0 ? "Começar teste grátis" : "Criar conta"}
                  </Link>
                </Button>
              </div>
            </div>

            <Separator className="my-12" />

            <div className="text-center">
              <h2 className="text-xl font-semibold text-navy mb-4">
                Veja o Pubfy em ação
              </h2>
              <p className="text-navy/70 mb-6">
                A melhor forma de conhecer nossa plataforma é experimentando.
              </p>
              <Link to="/demonstracao">
                <Button size="lg" className="bg-orange hover:bg-orange/90 text-white">
                  Agendar demonstração
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
    </>
  );
};

export default FaqPage;
