
import { CheckCircle2 } from "lucide-react";

const features = [
  {
    icon: "📱",
    title: "Cardápio Digital",
    description: "Cardápio digital interativo acessível por QR Code, com fotos e descrições detalhadas dos produtos.",
    benefits: [
      "Redução de custos com impressão",
      "Atualização instantânea de preços e itens",
      "Visualização detalhada com fotos atrativas"
    ]
  },
  {
    icon: "🖥️",
    title: "PDV Online",
    description: "PDV completo, acessível pelo navegador, com controle de mesas, comandas e pedidos em tempo real.",
    benefits: [
      "Acesso de qualquer dispositivo",
      "Gestão de comandas e mesas",
      "Relatórios detalhados de vendas"
    ]
  },
  {
    icon: "📊",
    title: "Gestão Completa",
    description: "Painel administrativo completo, com relatórios, controle de estoque e gestão financeira.",
    benefits: [
      "Relatórios detalhados de vendas",
      "Controle de estoque integrado",
      "Gestão financeira simplificada"
    ]
  }
];

const Features = () => {
  return (
    <section className="py-16 md:py-24 bg-white">
      <div className="container mx-auto px-6">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-navy mb-4">
            Tudo o que seu estabelecimento precisa
          </h2>
          <p className="text-lg text-navy/70">
            Uma plataforma completa que facilita a gestão do seu negócio e melhora a experiência dos seus clientes.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-12">
          {features.map((feature, index) => (
            <div 
              key={index}
              className="bg-offwhite rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="text-4xl mb-4">{feature.icon}</div>
              <h3 className="text-xl font-semibold text-navy mb-3">{feature.title}</h3>
              <p className="text-navy/70 mb-6">{feature.description}</p>
              
              <div className="space-y-2">
                {feature.benefits.map((benefit, idx) => (
                  <div key={idx} className="flex items-start">
                    <CheckCircle2 className="text-green shrink-0 mr-2 mt-0.5" size={18} />
                    <span className="text-sm text-navy/80">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Call-to-action */}
        <div className="flex justify-center mt-16">
          <a 
            href="/funcionalidades" 
            className="group inline-flex items-center text-green hover:text-green-dark font-medium text-lg"
          >
            Ver todas as funcionalidades
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
};

export default Features;
