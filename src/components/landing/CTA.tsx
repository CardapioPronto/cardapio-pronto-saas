
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const CTA = () => {
  return (
    <section className="py-16 bg-green">
      <div className="container mx-auto px-6">
        <div className="bg-navy rounded-2xl p-8 md:p-12 relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-1/2 h-full opacity-10">
            <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
              <path 
                fill="#FFFFFF" 
                d="M47.2,-57.2C59.7,-46.1,67.2,-29.5,70.2,-12.2C73.1,5.1,71.5,23.1,62.4,35.6C53.3,48,36.8,55,20.2,61.9C3.7,68.7,-12.9,75.6,-27.4,71.7C-42,67.9,-54.6,53.3,-62.2,37C-69.8,20.7,-72.5,2.7,-68.1,-12.9C-63.6,-28.5,-52,-41.7,-38.7,-52.6C-25.5,-63.4,-10.7,-72,4.1,-76.7C19,-81.4,37.9,-82.2,47.2,-71.8C56.5,-61.5,57.1,-40.7,57.3,-25C57.6,-9.2,57.6,1.4,57.6,0" 
                transform="translate(100 100) scale(1.2)" 
              />
            </svg>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 items-center relative z-10">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Pronto para transformar seu negócio?
              </h2>
              <p className="text-white/80 text-lg mb-8">
                Experimente o CardápioPronto gratuitamente por 14 dias. Sem compromisso, sem necessidade de cartão de crédito.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" className="bg-orange hover:bg-orange/90 text-white">
                  Começar teste grátis
                </Button>
                <Button variant="outline" size="lg" className="border-white text-white hover:bg-white/10">
                  Agendar demonstração
                </Button>
              </div>
            </div>
            
            <div className="flex justify-center md:justify-end">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 max-w-sm">
                <h3 className="text-xl font-semibold text-white mb-4">
                  Por que escolher o CardápioPronto?
                </h3>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <ArrowRight className="text-orange mr-2 mt-1 h-4 w-4" />
                    <span className="text-white/80">Instalação rápida e sem complicações</span>
                  </li>
                  <li className="flex items-start">
                    <ArrowRight className="text-orange mr-2 mt-1 h-4 w-4" />
                    <span className="text-white/80">Suporte técnico especializado</span>
                  </li>
                  <li className="flex items-start">
                    <ArrowRight className="text-orange mr-2 mt-1 h-4 w-4" />
                    <span className="text-white/80">Atualizações constantes sem custo adicional</span>
                  </li>
                  <li className="flex items-start">
                    <ArrowRight className="text-orange mr-2 mt-1 h-4 w-4" />
                    <span className="text-white/80">Mais de 500 estabelecimentos já utilizam</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTA;
