
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const Hero = () => {
  return (
    <div className="relative bg-offwhite overflow-hidden pt-24 pb-16 md:pt-32 md:pb-24">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full">
        <div className="absolute top-20 left-10 w-64 h-64 rounded-full bg-beige/20 blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-80 h-80 rounded-full bg-green/10 blur-3xl"></div>
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-12">
          {/* Left content */}
          <div className="w-full lg:w-1/2 space-y-6">
            <div>
              <span className="inline-block py-1 px-3 rounded-full bg-orange/10 text-orange text-sm font-medium mb-4">
                Novidade: QR Code Personalizado Grátis
              </span>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
                <span className="text-navy block">Sistema completo para </span>
                <span className="text-orange block">bares e restaurantes</span>
              </h1>
            </div>
            
            <p className="text-lg md:text-xl text-navy/80 max-w-lg">
              Cardápio digital, PDV online e gestão completa em uma única plataforma. 
              Aumente suas vendas e simplifique sua operação diária.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/teste-gratis">
                <Button size="lg" className="bg-green hover:bg-green-dark text-white text-lg px-8 py-6">
                  Começar teste grátis
                </Button>
              </Link>
              <Link to="/demonstracao">
                <Button variant="outline" size="lg" className="border-green hover:bg-green/10 text-navy text-lg px-8 py-6">
                  Ver demonstração
                </Button>
              </Link>
            </div>
            
            <div className="flex items-center gap-2 pt-4">
              <div className="flex -space-x-2">
                <div className="w-8 h-8 rounded-full bg-beige flex items-center justify-center text-navy font-medium">J</div>
                <div className="w-8 h-8 rounded-full bg-green flex items-center justify-center text-white font-medium">M</div>
                <div className="w-8 h-8 rounded-full bg-orange flex items-center justify-center text-white font-medium">C</div>
              </div>
              <p className="text-sm text-navy/70">
                +500 estabelecimentos já utilizam nossa plataforma
              </p>
            </div>
          </div>
          
          {/* Right content - Device mockup */}
          <div className="w-full lg:w-1/2 flex justify-center">
            <div className="relative animate-float">
              {/* Phone mockup */}
              <div className="relative z-20">
                <div className="w-64 md:w-80 h-auto rounded-3xl border-8 border-navy shadow-xl overflow-hidden">
                  <img 
                    src="https://images.unsplash.com/photo-1526069631228-723c945bea6b?auto=format&fit=crop&w=800&q=80" 
                    alt="Cardápio digital do CardápioPronto" 
                    className="w-full h-auto"
                  />
                </div>
                {/* QR code */}
                <div className="absolute -right-10 -bottom-10 w-24 h-24 bg-white p-2 rounded-lg shadow-lg">
                  <div className="w-full h-full border border-gray-200 rounded flex items-center justify-center">
                    <span className="text-xs text-navy font-medium">QR Code</span>
                  </div>
                </div>
              </div>

              {/* Tablet mockup behind phone */}
              <div className="absolute -right-20 top-10 z-10">
                <div className="w-48 md:w-64 h-auto rounded-2xl border-8 border-navy/80 shadow-lg overflow-hidden">
                  <div className="bg-white aspect-[3/4]"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Hero;
