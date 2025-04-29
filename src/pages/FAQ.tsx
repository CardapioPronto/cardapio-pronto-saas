
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const faqs = [
  {
    question: "Quanto tempo dura o período de teste grátis?",
    answer: "O período de teste grátis do CardápioPronto dura 14 dias, sem necessidade de cartão de crédito. Durante este período, você tem acesso completo a todas as funcionalidades da plataforma."
  },
  {
    question: "Preciso instalar algum software no meu computador?",
    answer: "Não, o CardápioPronto é uma aplicação web baseada em nuvem. Você só precisa de um navegador moderno e acesso à internet para utilizar todas as funcionalidades."
  },
  {
    question: "Como funciona o cardápio digital via QR Code?",
    answer: "Nós geramos um QR Code único para o seu estabelecimento. Seus clientes podem escanear este código com a câmera do smartphone e acessar o cardápio digital completo, sem precisar baixar nenhum aplicativo."
  },
  {
    question: "Posso personalizar as cores e logo do meu cardápio digital?",
    answer: "Sim! O CardápioPronto permite personalizar as cores do seu cardápio digital e adicionar sua logo, mantendo a identidade visual do seu estabelecimento."
  },
  {
    question: "O sistema funciona offline?",
    answer: "O PDV do CardápioPronto requer conexão com a internet para funcionar completamente. No entanto, estamos desenvolvendo um modo offline para operações básicas que sincronizará quando a conexão for restabelecida."
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
    answer: "Sim, o CardápioPronto se integra com a maioria das impressoras térmicas compatíveis com ESC/POS. Nos planos Profissional e Enterprise, oferecemos suporte para configuração das impressoras."
  },
  {
    question: "É possível controlar o estoque dos produtos?",
    answer: "Sim, todos os planos incluem controle básico de estoque. Nos planos superiores, oferecemos controle avançado com alertas e relatórios detalhados."
  },
  {
    question: "Como funciona o suporte técnico?",
    answer: "Todos os planos incluem suporte por email e chat. O plano Enterprise conta com suporte prioritário 24/7 por telefone, email e chat."
  }
];

const FAQ = () => {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-grow bg-offwhite py-12">
        <div className="container px-6 mx-auto">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-3xl md:text-4xl font-bold text-navy mb-4">
              Perguntas frequentes
            </h1>
            <p className="text-lg text-navy/70 mb-8">
              Encontre respostas para as dúvidas mais comuns sobre o CardápioPronto.
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
                    Começar teste grátis
                  </Link>
                </Button>
              </div>
            </div>

            <Separator className="my-12" />

            <div className="text-center">
              <h2 className="text-xl font-semibold text-navy mb-4">
                Veja o CardápioPronto em ação
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
  );
};

export default FAQ;
