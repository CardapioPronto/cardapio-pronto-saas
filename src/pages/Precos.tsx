
import React, { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { fetchPlanos } from "@/services/planosService";
import { Plano } from "@/types/plano";

interface PlanoFormatado {
  nome: string;
  preco: string;
  periodo: string;
  descricao: string;
  recursos: string[];
  destaque: boolean;
  botaoTexto: string;
  link: string;
}

const Precos = () => {
  const [planos, setPlanos] = useState<PlanoFormatado[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPlanos = async () => {
      try {
        const planosData = await fetchPlanos();
        const planosFormatados = planosData.map(transformPlano);
        setPlanos(planosFormatados);
      } catch (error) {
        console.error("Erro ao carregar planos:", error);
        // Fallback para dados estáticos em caso de erro
        setPlanos([]);
      } finally {
        setLoading(false);
      }
    };

    loadPlanos();
  }, []);

  const transformPlano = (plano: Plano): PlanoFormatado => {
    const descriptions: Record<string, string> = {
      "Básico": "Ideal para pequenos negócios iniciando sua presença digital",
      "Profissional": "Perfeito para estabelecimentos em crescimento",
      "Empresarial": "Sistema completo para redes de restaurantes",
      "Inicial": "Para estabelecimentos com operação simplificada",
      "Enterprise": "Para redes e estabelecimentos de grande porte"
    };

    const buttonTexts: Record<string, string> = {
      "Básico": "Começar agora",
      "Profissional": "Escolher Profissional",
      "Empresarial": "Falar com consultor",
      "Inicial": "Começar grátis",
      "Enterprise": "Falar com consultor"
    };

    const links: Record<string, string> = {
      "Básico": "/teste-gratis?plano=basico",
      "Profissional": "/teste-gratis?plano=profissional",
      "Empresarial": "/contato",
      "Inicial": "/teste-gratis?plano=inicial",
      "Enterprise": "/contato"
    };

    return {
      nome: plano.name,
      preco: `R$ ${plano.price_monthly.toFixed(2)}`,
      periodo: "/mês",
      descricao: descriptions[plano.name] || "Plano personalizado para suas necessidades",
      recursos: plano.features?.filter(f => f.is_enabled).map(f => f.feature) || [],
      destaque: plano.name === "Profissional",
      botaoTexto: buttonTexts[plano.name] || "Escolher plano",
      link: links[plano.name] || "/teste-gratis"
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow pt-24 flex items-center justify-center">
          <p className="text-lg text-navy/70">Carregando planos...</p>
        </main>
        <Footer />
      </div>
    );
  }

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
