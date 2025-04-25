
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";

interface PlanFeature {
  feature: string;
  included: boolean;
}

interface PricingPlan {
  name: string;
  price: number;
  description: string;
  popular?: boolean;
  features: PlanFeature[];
  buttonText: string;
}

const Pricing = () => {
  const [annual, setAnnual] = useState(false);

  const plans: PricingPlan[] = [
    {
      name: "Inicial",
      price: annual ? 79 : 99,
      description: "Para estabelecimentos com operação simplificada.",
      features: [
        { feature: "Cardápio digital via QR Code", included: true },
        { feature: "PDV online básico", included: true },
        { feature: "Até 100 produtos cadastrados", included: true },
        { feature: "1 dispositivo simultâneo", included: true },
        { feature: "Relatórios básicos", included: true },
        { feature: "Controle de mesas", included: false },
        { feature: "Integração com impressoras", included: false },
        { feature: "Suporte prioritário", included: false },
      ],
      buttonText: "Começar grátis",
    },
    {
      name: "Profissional",
      price: annual ? 129 : 149,
      popular: true,
      description: "Ideal para restaurantes de médio porte.",
      features: [
        { feature: "Cardápio digital via QR Code", included: true },
        { feature: "PDV online completo", included: true },
        { feature: "Produtos ilimitados", included: true },
        { feature: "3 dispositivos simultâneos", included: true },
        { feature: "Relatórios avançados", included: true },
        { feature: "Controle de mesas", included: true },
        { feature: "Integração com impressoras", included: true },
        { feature: "Suporte prioritário", included: false },
      ],
      buttonText: "Começar teste grátis",
    },
    {
      name: "Enterprise",
      price: annual ? 199 : 249,
      description: "Para redes e estabelecimentos de grande porte.",
      features: [
        { feature: "Cardápio digital via QR Code", included: true },
        { feature: "PDV online completo", included: true },
        { feature: "Produtos ilimitados", included: true },
        { feature: "Dispositivos ilimitados", included: true },
        { feature: "Relatórios avançados + API", included: true },
        { feature: "Controle de mesas", included: true },
        { feature: "Integração com impressoras", included: true },
        { feature: "Suporte prioritário 24/7", included: true },
      ],
      buttonText: "Falar com consultor",
    },
  ];

  return (
    <section id="pricing" className="py-16 md:py-24">
      <div className="container mx-auto px-6">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-navy mb-4">
            Planos para todos os tamanhos de negócio
          </h2>
          <p className="text-lg text-navy/70">
            Escolha o plano ideal para o seu estabelecimento e comece a transformar sua operação hoje mesmo.
          </p>
          
          {/* Toggle anual/mensal */}
          <div className="mt-8 inline-flex items-center bg-beige/30 p-1 rounded-lg">
            <button
              onClick={() => setAnnual(false)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                !annual ? "bg-white shadow-sm text-navy" : "text-navy/70"
              }`}
            >
              Mensal
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                annual ? "bg-white shadow-sm text-navy" : "text-navy/70"
              }`}
            >
              Anual <span className="text-xs text-green font-bold">-20%</span>
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <div 
              key={index}
              className={`relative rounded-xl border ${
                plan.popular 
                  ? "border-green shadow-lg shadow-green/10 scale-105 lg:scale-110 z-10" 
                  : "border-gray-200 shadow-sm"
              } bg-white overflow-hidden transition`}
            >
              {plan.popular && (
                <div className="absolute top-0 right-0">
                  <div className="bg-green text-white text-xs font-bold py-1 px-4 transform rotate-45 translate-x-2 -translate-y-1">
                    Popular
                  </div>
                </div>
              )}
              
              <div className="p-6">
                <h3 className="text-xl font-semibold text-navy">{plan.name}</h3>
                <div className="mt-4 flex items-baseline">
                  <span className="text-4xl font-bold text-navy">R${plan.price}</span>
                  <span className="ml-1 text-gray-500">/mês</span>
                </div>
                <p className="mt-2 text-sm text-navy/70">{plan.description}</p>
                
                <div className="mt-6">
                  <Link to="/teste-gratis">
                    <Button 
                      className={`w-full ${
                        plan.popular 
                          ? "bg-green hover:bg-green-dark text-white" 
                          : "bg-white border border-green text-navy hover:bg-green/10"
                      }`}
                    >
                      {plan.buttonText}
                    </Button>
                  </Link>
                </div>
              </div>
              
              <div className="border-t border-gray-100 p-6">
                <ul className="space-y-4">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start">
                      <CheckCircle2 
                        className={`shrink-0 mr-2 mt-0.5 ${feature.included ? "text-green" : "text-gray-300"}`} 
                        size={18} 
                      />
                      <span className={`text-sm ${feature.included ? "text-navy/80" : "text-navy/40"}`}>
                        {feature.feature}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
        
        {/* FAQ Link */}
        <div className="text-center mt-12">
          <p className="text-navy/70">
            Tem dúvidas sobre qual plano escolher?{" "}
            <a href="/faq" className="text-green hover:underline">
              Consulte nossas perguntas frequentes
            </a>
          </p>
        </div>
      </div>
    </section>
  );
};

export default Pricing;
