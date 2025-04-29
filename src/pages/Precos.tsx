
import React from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";

const planos = [
  {
    nome: "Básico",
    preco: "R$ 99,90",
    periodo: "/mês",
    descricao: "Ideal para pequenos negócios iniciando sua presença digital",
    recursos: [
      "Cardápio digital com QR Code",
      "Até 50 produtos cadastrados",
      "PDV online básico",
      "1 usuário administrador",
      "Suporte por email"
    ],
    destaque: false,
    botaoTexto: "Começar agora",
    link: "/teste-gratis?plano=basico"
  },
  {
    nome: "Profissional",
    preco: "R$ 199,90",
    periodo: "/mês",
    descricao: "Perfeito para estabelecimentos em crescimento",
    recursos: [
      "Todos os recursos do plano Básico",
      "Produtos ilimitados",
      "Controle de estoque básico",
      "Relatórios de vendas",
      "Até 3 usuários",
      "Suporte prioritário"
    ],
    destaque: true,
    botaoTexto: "Escolher Profissional",
    link: "/teste-gratis?plano=profissional"
  },
  {
    nome: "Empresarial",
    preco: "R$ 349,90",
    periodo: "/mês",
    descricao: "Sistema completo para redes de restaurantes",
    recursos: [
      "Todos os recursos do plano Profissional",
      "Gestão de múltiplas unidades",
      "Controle de estoque avançado",
      "Relatórios completos e personalizados",
      "Usuários ilimitados",
      "Suporte dedicado 24/7"
    ],
    destaque: false,
    botaoTexto: "Falar com consultor",
    link: "/contato"
  }
];

const Precos = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow pt-24">
        <section className="bg-offwhite py-16 md:py-24">
          <div className="container mx-auto px-6">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h1 className="text-3xl md:text-5xl font-bold text-navy mb-6">
                Planos para cada necessidade
              </h1>
              <p className="text-lg text-navy/70">
                Escolha o melhor plano para o seu negócio e comece a transformar a experiência dos seus clientes.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {planos.map((plano, index) => (
                <div 
                  key={index}
                  className={`rounded-xl overflow-hidden ${
                    plano.destaque 
                      ? "bg-white border-2 border-green shadow-lg transform md:-translate-y-4" 
                      : "bg-white shadow"
                  }`}
                >
                  {plano.destaque && (
                    <div className="bg-green py-2 text-white text-center font-medium">
                      Mais popular
                    </div>
                  )}
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-navy mb-2">{plano.nome}</h3>
                    <div className="flex items-end mb-4">
                      <span className="text-3xl font-bold text-navy">{plano.preco}</span>
                      <span className="text-navy/70 ml-1">{plano.periodo}</span>
                    </div>
                    <p className="text-navy/70 mb-6">{plano.descricao}</p>
                    
                    <div className="space-y-3 mb-8">
                      {plano.recursos.map((recurso, idx) => (
                        <div key={idx} className="flex items-start">
                          <CheckCircle2 className="text-green shrink-0 mr-2 mt-0.5" size={18} />
                          <span className="text-sm text-navy/80">{recurso}</span>
                        </div>
                      ))}
                    </div>
                    
                    <Link to={plano.link} className="block">
                      <Button 
                        className={`w-full ${
                          plano.destaque 
                            ? "bg-green hover:bg-green-dark text-white" 
                            : "bg-white border border-green text-green hover:bg-green/10"
                        }`}
                      >
                        {plano.botaoTexto}
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 bg-white">
          <div className="container mx-auto px-6">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-2xl md:text-3xl font-bold text-navy mb-6">
                Perguntas frequentes sobre preços
              </h2>
              <div className="space-y-6 text-left mt-8">
                <div>
                  <h3 className="text-lg font-semibold text-navy mb-2">Existe período de fidelidade?</h3>
                  <p className="text-navy/70">Não. Todos os nossos planos são mensais e você pode cancelar a qualquer momento.</p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-navy mb-2">Posso mudar de plano depois?</h3>
                  <p className="text-navy/70">Sim, você pode fazer upgrade ou downgrade do seu plano a qualquer momento.</p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-navy mb-2">Como funciona o período de teste?</h3>
                  <p className="text-navy/70">Oferecemos 14 dias de teste gratuito em todos os planos, sem necessidade de cartão de crédito.</p>
                </div>
              </div>
              <div className="mt-10">
                <Link to="/contato">
                  <Button variant="outline" className="border-green hover:bg-green/10 text-navy">
                    Ainda tem dúvidas? Entre em contato
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Precos;
